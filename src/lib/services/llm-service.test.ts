import { describe, expect, it, vi, afterEach } from "vitest";
import { structureWithFallback, getTargetTechniqueCount } from "./llm-service";
import type { GeneratePlanRequest } from "@/lib/schemas";

function makeValidAiPlan() {
  return {
    summary: "A great plan tailored to your goal.",
    techniques: Array.from({ length: 5 }, (_, i) => ({
      name: `Technique ${i + 1}`,
      description: "What this technique is.",
      rationale: "Why it's in this plan.",
      resources: [
        { type: "video", title: `Video ${i + 1}`, url: "https://placeholder.com", whyChosen: "Fits." },
        { type: "reading", title: `Reading ${i + 1}`, url: "https://placeholder.com", whyChosen: "Fits." },
        { type: "audio", title: `Audio ${i + 1}`, url: "https://placeholder.com", whyChosen: "Fits." },
      ],
    })),
  };
}

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

const request: GeneratePlanRequest = {
  hobbyName: "Chess",
  level: "intermediate",
  goal: "Beat my dad",
  timeCommitment: "A few hours a week",
  knownTopics: ["castling", "en passant"],
};

describe("structureWithFallback", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  });

  it("sends the user's hobby, level, goal, and known topics in the prompt", async () => {
    process.env.GROQ_API_KEY = "test-key";
    let sentBody: { messages: { role: string; content: string }[] } | undefined;
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
        usage: {},
      });
    }) as unknown as typeof fetch;

    await structureWithFallback(request);

    const userMessage = sentBody?.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toContain("Chess");
    expect(userMessage).toContain("intermediate");
    expect(userMessage).toContain("Beat my dad");
    expect(userMessage).toContain("castling");
  });

  it("tells the model to exclude beginner content for an intermediate user", async () => {
    process.env.GROQ_API_KEY = "test-key";
    let sentBody: { messages: { role: string; content: string }[] } | undefined;
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
        usage: {},
      });
    }) as unknown as typeof fetch;

    await structureWithFallback({ ...request, level: "intermediate" });

    const userMessage = sentBody?.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toMatch(/do NOT include any technique a first-time beginner would need/i);
  });

  it("tells the model to exclude beginner and intermediate content for an advanced user", async () => {
    process.env.GROQ_API_KEY = "test-key";
    let sentBody: { messages: { role: string; content: string }[] } | undefined;
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
        usage: {},
      });
    }) as unknown as typeof fetch;

    await structureWithFallback({ ...request, level: "advanced" });

    const userMessage = sentBody?.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toMatch(/do NOT include any beginner or general-intermediate technique/i);
  });

  it("tells the model to start from fundamentals for a beginner user", async () => {
    process.env.GROQ_API_KEY = "test-key";
    let sentBody: { messages: { role: string; content: string }[] } | undefined;
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
        usage: {},
      });
    }) as unknown as typeof fetch;

    await structureWithFallback({ ...request, level: "beginner" });

    const userMessage = sentBody?.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toMatch(/assume zero prior exposure/i);
  });

  it("retries once and recovers when the first attempt fails schema validation", async () => {
    process.env.GROQ_API_KEY = "test-key";
    let calls = 0;
    global.fetch = vi.fn(async () => {
      calls++;
      if (calls === 1) {
        return jsonResponse({ choices: [{ message: { content: JSON.stringify({ not: "valid" }) } }], usage: {} });
      }
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
        usage: {},
      });
    }) as unknown as typeof fetch;

    const result = await structureWithFallback(request);
    expect(calls).toBe(2);
    expect(result.techniques).toHaveLength(5);
  });

  it("throws after two failed attempts", async () => {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = vi.fn(async () => jsonResponse({}, false)) as unknown as typeof fetch;

    await expect(structureWithFallback(request)).rejects.toThrow();
  });

  it("throws immediately when GROQ_API_KEY is not configured", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(structureWithFallback(request)).rejects.toThrow();
  });

  it.each([
    ["15 mins a day", 5],
    ["30 mins a day", 6],
    ["A few hours a week", 7],
    ["Weekends only", 8],
    ["some future preset we haven't seen", 6],
  ] as const)("tells the model to create exactly %s -> %d techniques, and constrains the JSON schema to match", async (timeCommitment, expectedCount) => {
    process.env.GROQ_API_KEY = "test-key";
    let sentBody: {
      messages: { role: string; content: string }[];
      response_format: { json_schema: { schema: { properties: { techniques: { minItems: number; maxItems: number } } } } };
    } | undefined;
    global.fetch = vi.fn(async (_url, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "s",
                techniques: Array.from({ length: expectedCount }, (_, i) => ({
                  name: `Technique ${i + 1}`,
                  description: "d",
                  rationale: "r",
                  resources: [
                    { type: "video", title: "v", url: "https://placeholder.com", whyChosen: "x" },
                    { type: "reading", title: "r", url: "https://placeholder.com", whyChosen: "x" },
                    { type: "audio", title: "a", url: "https://placeholder.com", whyChosen: "x" },
                  ],
                })),
              }),
            },
          },
        ],
        usage: {},
      });
    }) as unknown as typeof fetch;

    await structureWithFallback({ ...request, timeCommitment });

    const userMessage = sentBody?.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toContain(`exactly ${expectedCount} techniques`);
    expect(sentBody?.response_format.json_schema.schema.properties.techniques.minItems).toBe(expectedCount);
    expect(sentBody?.response_format.json_schema.schema.properties.techniques.maxItems).toBe(expectedCount);
  });
});

describe("getTargetTechniqueCount", () => {
  it("maps each known time commitment to its exact count", () => {
    expect(getTargetTechniqueCount("15 mins a day")).toBe(5);
    expect(getTargetTechniqueCount("30 mins a day")).toBe(6);
    expect(getTargetTechniqueCount("A few hours a week")).toBe(7);
    expect(getTargetTechniqueCount("Weekends only")).toBe(8);
  });

  it("falls back to a sane default for an unrecognized commitment string", () => {
    expect(getTargetTechniqueCount("something new")).toBe(6);
  });
});
