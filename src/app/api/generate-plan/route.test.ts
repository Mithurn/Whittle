// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.SERPER_API_KEY = "test-serper-key";
process.env.GROQ_API_KEY = "test-groq-key";

const { POST } = await import("./route");

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
          url: "https://placeholder.com",
          whyChosen: "It fits this user's level.",
        },
        {
          type: "reading",
          title: `Example Reading ${i + 1}`,
          url: "https://placeholder.com",
          whyChosen: "It fits this user's level.",
        },
        {
          type: "audio",
          title: `Example Audio ${i + 1}`,
          url: "https://placeholder.com",
          whyChosen: "It fits this user's level.",
        },
      ],
    })),
  };
}

function makeAiPlanWithDuplicateUrls() {
  const plan = makeValidAiPlan();
  plan.techniques[1].resources[0].url = "https://example.com/duplicate";
  plan.techniques[0].resources[0].url = "https://example.com/duplicate";
  return plan;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
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
  it("returns a valid HobbyPlan enriched with Serper.dev urls", async () => {
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("serper.dev/videos")) {
        return jsonResponse({ videos: [{ link: "https://youtube.com/watch?v=serpervideo", title: "Serper Video" }] });
      }
      if (urlStr.includes("serper.dev/search")) {
        return jsonResponse({ organic: [{ link: "https://example.com/serperarticle", title: "Serper Article" }] });
      }
      if (urlStr.includes("groq.com")) {
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
    expect(json.techniques).toHaveLength(5);
    // Video resource uses Serper video
    expect(json.techniques[0].resources[0].url).toBe("https://youtube.com/watch?v=serpervideo");
    // Reading resource uses Serper search
    expect(json.techniques[0].resources[1].url).toBe("https://example.com/serperarticle");
    // Audio resource now uses Serper search for podcast episodes
    expect(json.techniques[0].resources[2].url).toBe("https://example.com/serperarticle");
  });

  it("returns 400 for an invalid request body", async () => {
    const res = await POST(makeRequest({ level: "beginner" }));
    expect(res.status).toBe(400);
  });

  it("falls back to constructSearchUrl when Serper fails or times out", async () => {
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("serper.dev")) {
        return jsonResponse({}, false, 500); // simulate failure
      }
      if (urlStr.includes("groq.com")) {
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
    // Video and reading fallback to constructed urls
    expect(json.techniques[0].resources[0].url).toMatch(/^https:\/\/www\.youtube\.com\/results\?search_query=/);
    expect(json.techniques[0].resources[1].url).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
  });

  it("retries Groq once and recovers when the first attempt fails schema validation", async () => {
    let groqCalls = 0;
    let sc = 0;
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("serper.dev")) {
        sc++;
        return jsonResponse({ videos: [{ link: `vid${sc}` }], organic: [{ link: `org${sc}` }] });
      }
      if (urlStr.includes("groq.com")) {
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
      }
      throw new Error(`unexpected fetch to ${String(url)}`);
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    expect(res.status).toBe(200);
    expect(groqCalls).toBe(2);
  });

  it("retries Groq once and recovers when the first attempt returns duplicate resource URLs", async () => {
    let groqCalls = 0;
    let sc = 0;
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("serper.dev")) {
        sc++;
        return jsonResponse({ videos: [{ link: `vid${sc}` }], organic: [{ link: `org${sc}` }] });
      }
      if (urlStr.includes("groq.com")) {
        groqCalls++;
        const plan = groqCalls === 1 ? makeAiPlanWithDuplicateUrls() : makeValidAiPlan();
        return jsonResponse({
          choices: [{ message: { content: JSON.stringify(plan) } }],
          usage: {},
        });
      }
      throw new Error(`unexpected fetch to ${String(url)}`);
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

  it("returns a structured error response when Groq fails repeatedly", async () => {
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("groq.com")) return jsonResponse({}, false, 500);
      return jsonResponse({});
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    expect(res.status).toBe(502);

    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});
