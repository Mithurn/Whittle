// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { GET } = await import("./route");

function makeRequest(url?: string): NextRequest {
  const target = url
    ? `http://localhost/api/read-article?url=${encodeURIComponent(url)}`
    : "http://localhost/api/read-article";
  return new NextRequest(target);
}

describe("GET /api/read-article", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns the fetched article content on success", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      text: async () => "# Real Article\n\nSome real content.",
    })) as unknown as typeof fetch;

    const res = await GET(makeRequest("https://example.com/article"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.content).toBe("# Real Article\n\nSome real content.");
  });

  it("strips r.jina.ai's own Title/URL Source/Published Time metadata header before returning content", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      text: async () =>
        "Title: Intro To MTB\n\n" +
        "URL Source: https://example.com/mtb\n\n" +
        "Published Time: 2025-09-09T10:08:48Z\n\n" +
        "Markdown Content:\n" +
        "# Real heading\n\nThe actual article text.",
    })) as unknown as typeof fetch;

    const res = await GET(makeRequest("https://example.com/mtb"));
    const json = await res.json();
    expect(json.content).toBe("# Real heading\n\nThe actual article text.");
    expect(json.content).not.toContain("Title:");
    expect(json.content).not.toContain("URL Source:");
  });

  it("returns the raw text unchanged if the jina metadata marker isn't present", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      text: async () => "Just plain content with no jina header at all.",
    })) as unknown as typeof fetch;

    const res = await GET(makeRequest("https://example.com/plain"));
    const json = await res.json();
    expect(json.content).toBe("Just plain content with no jina header at all.");
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

  it("returns 502 when r.jina.ai responds with a non-ok status", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, text: async () => "" })) as unknown as typeof fetch;
    const res = await GET(makeRequest("https://example.com/article"));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 502 when the article content is empty", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, text: async () => "   " })) as unknown as typeof fetch;
    const res = await GET(makeRequest("https://example.com/article"));
    expect(res.status).toBe(502);
  });

  it("returns 502 when the fetch throws (timeout/network failure)", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const res = await GET(makeRequest("https://example.com/article"));
    expect(res.status).toBe(502);
  });
});
