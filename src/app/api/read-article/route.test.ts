// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { GET } = await import("./route");

interface RequestContext {
  hobbyName?: string;
  level?: string;
  techniqueName?: string;
}

function makeRequest(url?: string, ctx?: RequestContext): NextRequest {
  const params = new URLSearchParams();
  if (url) params.set("url", url);
  if (ctx?.hobbyName) params.set("hobbyName", ctx.hobbyName);
  if (ctx?.level) params.set("level", ctx.level);
  if (ctx?.techniqueName) params.set("techniqueName", ctx.techniqueName);
  const qs = params.toString();
  return new NextRequest(`http://localhost/api/read-article${qs ? `?${qs}` : ""}`);
}

const validContext: RequestContext = { hobbyName: "Chess", level: "beginner", techniqueName: "Forking" };

const validLesson = {
  intro: "A quick intro to forking.",
  howItWorks: { overview: "Line up your piece.", steps: [{ title: "Spot it", text: "Look for two targets." }] },
  images: [],
  mistakesTips: { tips: ["Look two moves ahead"], mistakes: ["Forgetting to check for pins first"] },
  keyTakeaways: ["A fork wins material by attacking two pieces at once"],
};

interface CondenseRequestBody {
  messages: { role: string; content: string }[];
}

// /api/read-article now runs two sequential fetches: r.jina.ai to scrape the
// source article, then a Groq call (article-service.ts's condenseArticle)
// that turns whatever text it got (or nothing, if jina failed) into a
// structured lesson. Both share the global fetch mock, so this dispatches
// by target URL and records the condense call's body so tests can inspect
// what was actually sent to the model.
function mockFetchPipeline(opts: {
  jina: { ok: boolean; text: string } | "throws";
  condense: { ok: boolean; content?: unknown; contentString?: string } | "throws";
}): () => CondenseRequestBody | undefined {
  let condenseBody: CondenseRequestBody | undefined;
  global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const target = url.toString();
    if (target.includes("r.jina.ai")) {
      if (opts.jina === "throws") throw new Error("network down");
      const jina = opts.jina;
      return { ok: jina.ok, text: async () => jina.text };
    }
    // Groq condense call
    if (opts.condense === "throws") throw new Error("groq down");
    condenseBody = init?.body ? (JSON.parse(String(init.body)) as CondenseRequestBody) : undefined;
    if (!opts.condense.ok) return { ok: false, json: async () => ({}) };
    const contentStr = opts.condense.contentString ?? JSON.stringify(opts.condense.content ?? validLesson);
    return { ok: true, json: async () => ({ choices: [{ message: { content: contentStr } }], usage: {} }) };
  }) as unknown as typeof fetch;
  return () => condenseBody;
}

describe("GET /api/read-article", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  });

  it("condenses the fetched article via Groq after stripping jina's metadata header", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const getCondenseBody = mockFetchPipeline({
      jina: {
        ok: true,
        text:
          "Title: Intro To Forking\n\n" +
          "URL Source: https://example.com/mtb\n\n" +
          "Published Time: 2025-09-09T10:08:48Z\n\n" +
          "Markdown Content:\n" +
          "# Real heading\n\nThe actual article text.",
      },
      condense: { ok: true, content: validLesson },
    });

    const res = await GET(makeRequest("https://example.com/mtb", validContext));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(validLesson);

    const userMessage = getCondenseBody()?.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toContain("# Real heading");
    expect(userMessage).not.toContain("Title:");
    expect(userMessage).not.toContain("URL Source:");
  });

  it("falls back to AI-only generation (still 200) when jina responds with a non-ok status", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const getCondenseBody = mockFetchPipeline({
      jina: { ok: false, text: "" },
      condense: { ok: true, content: validLesson },
    });

    const res = await GET(makeRequest("https://example.com/article", validContext));
    expect(res.status).toBe(200);
    const userMessage = getCondenseBody()?.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toBe("Technique: Forking");
  });

  it("falls back to AI-only generation when the jina fetch throws (timeout/network failure)", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const getCondenseBody = mockFetchPipeline({ jina: "throws", condense: { ok: true, content: validLesson } });

    const res = await GET(makeRequest("https://example.com/article", validContext));
    expect(res.status).toBe(200);
    const userMessage = getCondenseBody()?.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toBe("Technique: Forking");
  });

  it("falls back to AI-only generation when the fetched article content is empty", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const getCondenseBody = mockFetchPipeline({ jina: { ok: true, text: "   " }, condense: { ok: true, content: validLesson } });

    const res = await GET(makeRequest("https://example.com/article", validContext));
    expect(res.status).toBe(200);
    const userMessage = getCondenseBody()?.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMessage).toBe("Technique: Forking");
  });

  it("returns 400 when the url parameter is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed url", async () => {
    const res = await GET(makeRequest("not a url"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-http(s) scheme", async () => {
    const res = await GET(makeRequest("file:///etc/passwd"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a private/loopback host (basic SSRF guard)", async () => {
    for (const url of [
      "http://localhost/secret",
      "http://127.0.0.1/secret",
      "http://192.168.1.1/secret",
      "http://169.254.169.254/latest/meta-data",
      "http://10.0.0.5/secret",
    ]) {
      const res = await GET(makeRequest(url));
      expect(res.status).toBe(400);
    }
  });

  it("returns 400 when hobbyName/level/techniqueName are missing", async () => {
    mockFetchPipeline({ jina: { ok: true, text: "some article text" }, condense: { ok: true, content: validLesson } });
    const res = await GET(makeRequest("https://example.com/article"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when GROQ_API_KEY is not configured", async () => {
    delete process.env.GROQ_API_KEY;
    mockFetchPipeline({ jina: { ok: true, text: "some article text" }, condense: { ok: true, content: validLesson } });

    const res = await GET(makeRequest("https://example.com/article", validContext));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 500 when the Groq condense call itself fails", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockFetchPipeline({ jina: { ok: true, text: "some article text" }, condense: { ok: false } });

    const res = await GET(makeRequest("https://example.com/article", validContext));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 500 when Groq returns unparseable JSON content", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockFetchPipeline({
      jina: { ok: true, text: "some article text" },
      condense: { ok: true, contentString: "not valid json" },
    });

    const res = await GET(makeRequest("https://example.com/article", validContext));
    expect(res.status).toBe(500);
  });
});
