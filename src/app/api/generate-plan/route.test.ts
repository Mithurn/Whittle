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
    global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("serper.dev/videos")) {
        return jsonResponse({ videos: [{ link: "https://youtube.com/watch?v=serpervideo", title: "Serper Video" }] });
      }
      if (urlStr.includes("serper.dev/search")) {
        // Reading and audio resources both hit this same endpoint —
        // differentiate by query text so the test actually exercises two
        // distinct real results instead of coincidentally colliding.
        const body = JSON.parse(String(init?.body));
        const isPodcastQuery = String(body.q).includes("podcast");
        return jsonResponse({
          organic: [
            isPodcastQuery
              ? { link: "https://example.com/serperpodcast", title: "Serper Podcast" }
              : { link: "https://example.com/serperarticle", title: "Serper Article" },
          ],
        });
      }
      if (urlStr.includes("groq.com")) {
        return jsonResponse({
          choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
          usage: {},
        });
      }
      throw new Error(`unexpected fetch to ${urlStr}`);
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
    // Audio resource uses a distinct Serper search (podcast-specific query)
    expect(json.techniques[0].resources[2].url).toBe("https://example.com/serperpodcast");
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

  it("replaces a duplicate URL (e.g. two resources' Serper searches landing on the same result) with a constructSearchUrl fallback, without retrying Groq", async () => {
    let groqCalls = 0;
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("serper.dev")) {
        // Every Serper call returns the exact same result regardless of
        // query — simulates two different resources colliding on one URL.
        return jsonResponse({
          organic: [{ link: "https://example.com/same-article", title: "Same Article" }],
          videos: [{ link: "https://example.com/same-article", title: "Same Article" }],
        });
      }
      if (urlStr.includes("groq.com")) {
        groqCalls++;
        return jsonResponse({
          choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
          usage: {},
        });
      }
      throw new Error(`unexpected fetch to ${urlStr}`);
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    expect(res.status).toBe(200);
    // structureWithFallback always makes exactly 2 Groq calls per successful
    // generation now (curriculum, then resources — see llm-service.ts's
    // two-stage pipeline). The point of this test is that the URL collision
    // doesn't trigger a 3rd call to re-generate the plan — duplicates are
    // cleaned up locally after the fact instead.
    expect(groqCalls).toBe(2);

    const json = await res.json();
    const urls = json.techniques[0].resources.map((r: { url: string }) => r.url);
    expect(new Set(urls).size).toBe(urls.length);
    // First occurrence keeps the real Serper result...
    expect(urls[0]).toBe("https://example.com/same-article");
    // ...the rest fall back to constructed search URLs instead of
    // silently duplicating the first.
    expect(urls[1]).toMatch(/^https:\/\/www\.(youtube\.com\/results|google\.com\/search)\?/);
    expect(urls[2]).toMatch(/^https:\/\/www\.(youtube\.com\/results|google\.com\/search)\?/);
  });

  it("retries the curriculum call once and recovers when it fails schema validation", async () => {
    // structureWithFallback's two Groq calls (curriculum, then resources —
    // see llm-service.ts) share this fetch mock, so failures are dispatched
    // by the request's schema name rather than a single global call count —
    // a shared counter can't tell which stage actually needed the retry.
    let curriculumAttempts = 0;
    let resourcesAttempts = 0;
    global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("serper.dev")) {
        return jsonResponse({ organic: [{ link: "https://example.com/a", title: "A" }] });
      }
      if (urlStr.includes("groq.com")) {
        const body = JSON.parse(String(init?.body));
        const schemaName = body.response_format.json_schema.name;
        if (schemaName === "hobby_curriculum") {
          curriculumAttempts++;
          if (curriculumAttempts === 1) {
            return jsonResponse({
              choices: [{ message: { content: JSON.stringify({ not: "the right shape" }) } }],
              usage: {},
            });
          }
        } else {
          resourcesAttempts++;
        }
        return jsonResponse({
          choices: [{ message: { content: JSON.stringify(makeValidAiPlan()) } }],
          usage: {},
        });
      }
      throw new Error(`unexpected fetch to ${urlStr}`);
    }) as unknown as typeof fetch;

    const res = await POST(makeRequest(validRequestBody));
    expect(res.status).toBe(200);
    expect(curriculumAttempts).toBe(2);
    expect(resourcesAttempts).toBe(1);
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
