import { describe, expect, it, vi, afterEach } from "vitest";
import { generateLessonBreakdown, generateLessonCoaching, condenseArticle } from "./article-service";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

function groqContent(content: unknown): Response {
  return jsonResponse({ choices: [{ message: { content: JSON.stringify(content) } }], usage: {} });
}

const opts = { hobbyName: "Chess", level: "beginner" as const, techniqueName: "Forking" };

const breakdownFixture = {
  intro: "Forking attacks two pieces at once.",
  howItWorks: { overview: "Line up your piece.", steps: [{ title: "Spot it", text: "Look for two targets." }] },
  images: [{ url: "https://example.com/fork.png", caption: "A knight fork" }],
};

const coachingFixture = {
  mistakesTips: { tips: ["Look two moves ahead"], mistakes: ["Forgetting to check for pins"] },
  keyTakeaways: ["A fork wins material by attacking two pieces at once"],
};

describe("generateLessonBreakdown", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  });

  it("returns intro/howItWorks/images on success", async () => {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = vi.fn(async () => groqContent(breakdownFixture)) as unknown as typeof fetch;

    const result = await generateLessonBreakdown("some article text", opts);
    expect(result).toEqual(breakdownFixture);
  });

  it("tells the model never to invent an image URL when a source article is provided", async () => {
    process.env.GROQ_API_KEY = "test-key";
    let sentSystemPrompt = "";
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      sentSystemPrompt = body.messages.find((m: { role: string }) => m.role === "system")?.content ?? "";
      return groqContent(breakdownFixture);
    }) as unknown as typeof fetch;

    await generateLessonBreakdown("some article text", opts);
    expect(sentSystemPrompt).toMatch(/never invent one/i);
  });

  it("returns null when GROQ_API_KEY is not configured", async () => {
    delete process.env.GROQ_API_KEY;
    const result = await generateLessonBreakdown("some article text", opts);
    expect(result).toBeNull();
  });

  it("returns null when the Groq call fails", async () => {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = vi.fn(async () => jsonResponse({}, false)) as unknown as typeof fetch;
    const result = await generateLessonBreakdown("some article text", opts);
    expect(result).toBeNull();
  });

  it("returns null when the fetch throws", async () => {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const result = await generateLessonBreakdown("some article text", opts);
    expect(result).toBeNull();
  });
});

describe("generateLessonCoaching", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  });

  it("returns mistakesTips/keyTakeaways on success", async () => {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = vi.fn(async () => groqContent(coachingFixture)) as unknown as typeof fetch;

    const result = await generateLessonCoaching("some article text", opts);
    expect(result).toEqual(coachingFixture);
  });

  it("returns null when GROQ_API_KEY is not configured", async () => {
    delete process.env.GROQ_API_KEY;
    const result = await generateLessonCoaching("some article text", opts);
    expect(result).toBeNull();
  });
});

describe("condenseArticle", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  });

  it("runs the breakdown and coaching calls and merges them into a full lesson", async () => {
    process.env.GROQ_API_KEY = "test-key";
    let calls = 0;
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      const systemPrompt = body.messages.find((m: { role: string }) => m.role === "system")?.content ?? "";
      return systemPrompt.includes("mistakesTips") && systemPrompt.includes("tips")
        ? groqContent(coachingFixture)
        : groqContent(breakdownFixture);
    }) as unknown as typeof fetch;

    const result = await condenseArticle("some article text", opts);

    expect(calls).toBe(2);
    expect(result).toEqual({ ...breakdownFixture, ...coachingFixture });
  });

  it("is all-or-nothing — returns null if only one of the two calls fails", async () => {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const systemPrompt = body.messages.find((m: { role: string }) => m.role === "system")?.content ?? "";
      if (systemPrompt.includes("mistakesTips")) return jsonResponse({}, false);
      return groqContent(breakdownFixture);
    }) as unknown as typeof fetch;

    const result = await condenseArticle("some article text", opts);
    expect(result).toBeNull();
  });
});
