// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.GROQ_API_KEY = "test-groq-key";

const mockGenerateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI() {
    return { models: { generateContent: mockGenerateContent } };
  }),
}));

const { POST } = await import("./route");

// Exactly 3 resources per technique — the schema now requires this (see
// route.ts's RESOURCE_MIX_RULE / schemas.ts's .length(3)).
function makeValidAiPlan() {
  return {
    summary: "A great plan tailored to your goal.",
    techniques: Array.from({ length: 5 }, (_, i) => ({
      name: `Technique ${i + 1}`,
      description: "What this technique is.",
      rationale: "Why it's in this plan.",
      resources: [
        {
          type: "video",
          title: `Example Video ${i + 1}`,
          url: `https://example.com/video-${i + 1}`,
          whyChosen: "It fits this user's level.",
        },
        {
          type: "reading",
          title: `Example Reading ${i + 1}`,
          url: `https://example.com/reading-${i + 1}`,
          whyChosen: "It fits this user's level.",
        },
        {
          type: "reading",
          title: `Example Extra ${i + 1}`,
          url: `https://example.com/extra-${i + 1}`,
          whyChosen: "It fits this user's level.",
        },
      ],
    })),
  };
}

function makeAiPlanWithDuplicateUrls() {
  const plan = makeValidAiPlan();
  plan.techniques[1].resources[0].url = plan.techniques[0].resources[0].url;
  return plan;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

// A groundingChunks-shaped Gemini response — the redirect wrapper resolves
// (via the mocked fetch below) to a real destination URL.
function groundedResponseWithChunks(chunks: { uri: string; title: string }[]) {
  return {
    text: "grounded content",
    usageMetadata: {},
    candidates: [
      {
        groundingMetadata: {
          groundingChunks: chunks.map((c) => ({ web: { uri: c.uri, title: c.title } })),
        },
      },
    ],
  };
}

const validRequestBody = {
  hobbyName: "Juggling",
  level: "beginner",
  goal: "Learn to juggle 3 balls",
  timeCommitment: "a few hours a week",
  knownTopics: [],
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/generate-plan", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate-plan", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it("returns a valid HobbyPlan when grounding and structuring both succeed", async () => {
    mockGenerateContent.mockResolvedValue({ text: "grounded content", usageMetadata: {} });
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("groq.com")) {
        return jsonResponse({
          choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
          usage: {},
        });
      }
      throw new Error(`unexpected fetch to ${String(url)}`);
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBeDefined();
    expect(json.createdAt).toBeDefined();
    expect(json.techniques).toHaveLength(5);
    expect(json.techniques[0].id).toBeDefined();
    expect(json.techniques[0].status).toBe("not_started");
    expect(json.techniques[0].order).toBe(0);
    expect(json.techniques[0].resources).toHaveLength(3);
    // No groundingChunks in this response (grounding succeeded but found no
    // metadata) — every resource falls back to a constructed search URL.
    expect(json.techniques[0].resources[0].url).toMatch(
      /^https:\/\/www\.(youtube\.com\/results|google\.com\/search)\?/
    );
    expect(json.techniques[0].resources[0].sourceName).toBe("YouTube");
  });

  it("trusts a resource's URL directly when it matches a resolved, verified grounding URL", async () => {
    mockGenerateContent.mockResolvedValue(
      groundedResponseWithChunks([
        { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc", title: "youtube.com" },
      ])
    );

    const plan = makeValidAiPlan();
    // Groq "matches" this resource to the (soon-to-be-resolved) verified URL.
    plan.techniques[0].resources[0].url = "https://www.youtube.com/watch?v=real123";

    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("vertexaisearch.cloud.google.com")) {
        return {
          ok: false,
          status: 302,
          headers: new Headers({ location: "https://www.youtube.com/watch?v=real123" }),
          json: async () => ({}),
        } as unknown as Response;
      }
      if (urlStr.includes("groq.com")) {
        return jsonResponse({ choices: [{ message: { content: JSON.stringify(plan) } }], usage: {} });
      }
      throw new Error(`unexpected fetch to ${urlStr}`);
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    const json = await res.json();

    // The real resolved destination, not a constructed search URL.
    expect(json.techniques[0].resources[0].url).toBe("https://www.youtube.com/watch?v=real123");
    expect(json.techniques[0].resources[0].sourceName).toBe("YouTube");
  });

  it("falls back to constructSearchUrl when Groq's URL isn't a member of the verified list (deviated or invented)", async () => {
    mockGenerateContent.mockResolvedValue(
      groundedResponseWithChunks([
        { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/xyz", title: "chess.com" },
      ])
    );

    // Plain example.com URLs — none of these are the verified chess.com one.
    const plan = makeValidAiPlan();

    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("vertexaisearch.cloud.google.com")) {
        return {
          ok: false,
          status: 302,
          headers: new Headers({ location: "https://www.chess.com/article/real" }),
          json: async () => ({}),
        } as unknown as Response;
      }
      if (urlStr.includes("groq.com")) {
        return jsonResponse({ choices: [{ message: { content: JSON.stringify(plan) } }], usage: {} });
      }
      throw new Error(`unexpected fetch to ${urlStr}`);
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    const json = await res.json();

    expect(json.techniques[0].resources[0].url).toMatch(
      /^https:\/\/www\.(youtube\.com\/results|google\.com\/search)\?/
    );
  });

  it("returns 400 for an invalid request body", async () => {
    const res = await POST(makeRequest({ level: "beginner" }));
    expect(res.status).toBe(400);
  });

  it("falls back to ungrounded generation with constructed search URLs when Gemini grounding fails", async () => {
    mockGenerateContent.mockRejectedValue(new Error("gemini down"));
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("groq.com")) {
        return jsonResponse({
          choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
          usage: {},
        });
      }
      throw new Error(`unexpected fetch to ${String(url)}`);
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.techniques[0].resources[0].url).toMatch(
      /^https:\/\/www\.(youtube\.com\/results|google\.com\/search)\?/
    );
  });

  it("retries Groq once and recovers when the first attempt fails schema validation", async () => {
    mockGenerateContent.mockResolvedValue({ text: "grounded content", usageMetadata: {} });
    let groqCalls = 0;
    global.fetch = vi.fn(async () => {
      groqCalls++;
      if (groqCalls === 1) {
        return jsonResponse({
          choices: [{ message: { content: JSON.stringify({ not: "the right shape" }) } }],
          usage: {},
        });
      }
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
        usage: {},
      });
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    expect(res.status).toBe(200);
    expect(groqCalls).toBe(2);
  });

  it("retries Groq once and recovers when the first attempt returns duplicate resource URLs", async () => {
    mockGenerateContent.mockResolvedValue({ text: "grounded content", usageMetadata: {} });
    let groqCalls = 0;
    global.fetch = vi.fn(async () => {
      groqCalls++;
      const plan = groqCalls === 1 ? makeAiPlanWithDuplicateUrls() : makeValidAiPlan();
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify(plan) } }],
        usage: {},
      });
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    expect(res.status).toBe(200);
    expect(groqCalls).toBe(2);

    const json = await res.json();
    const urls = json.techniques.flatMap((t: { resources: { url: string }[] }) =>
      t.resources.map((r) => r.url)
    );
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("returns a structured error response when Gemini and Groq both fail", async () => {
    mockGenerateContent.mockRejectedValue(new Error("gemini down"));
    global.fetch = vi.fn(async () => jsonResponse({}, false, 500)) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    expect(res.status).toBe(502);

    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});
