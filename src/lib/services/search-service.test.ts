import { describe, expect, it, vi, afterEach } from "vitest";
import { constructSearchUrl, enrichPlanWithSerper } from "./search-service";
import type { AIPlanResponse } from "@/lib/schemas";

describe("constructSearchUrl", () => {
  it("builds a YouTube search link for video resources", () => {
    const url = constructSearchUrl({ type: "video", title: "Opening Principles" }, "Chess");
    expect(url).toBe(
      "https://www.youtube.com/results?search_query=" + encodeURIComponent("Opening Principles Chess")
    );
  });

  it("builds a Google search link for non-video resources", () => {
    const url = constructSearchUrl({ type: "reading", title: "Opening Principles" }, "Chess");
    expect(url).toBe(
      "https://www.google.com/search?q=" + encodeURIComponent("Opening Principles Chess")
    );
  });
});

describe("enrichPlanWithSerper", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.SERPER_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.SERPER_API_KEY = originalKey;
  });

  function makePlan(): AIPlanResponse {
    return {
      summary: "s",
      techniques: [
        {
          name: "Opening Principles",
          description: "d",
          rationale: "r",
          resources: [
            { type: "video", title: "placeholder", url: "https://placeholder.com", whyChosen: "x" },
          ],
        },
      ],
    };
  }

  it("replaces the placeholder URL and title with a real Serper result", async () => {
    process.env.SERPER_API_KEY = "test-key";
    global.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({ videos: [{ link: "https://youtube.com/watch?v=real", title: "Real Video" }] }),
      }) as Response
    ) as unknown as typeof fetch;

    const result = await enrichPlanWithSerper(makePlan(), "Chess");
    expect(result.techniques[0].resources[0].url).toBe("https://youtube.com/watch?v=real");
    expect(result.techniques[0].resources[0].title).toBe("Real Video");
  });

  it("falls back to constructSearchUrl when SERPER_API_KEY is missing", async () => {
    delete process.env.SERPER_API_KEY;
    const result = await enrichPlanWithSerper(makePlan(), "Chess");
    expect(result.techniques[0].resources[0].url).toMatch(/^https:\/\/www\.youtube\.com\/results\?search_query=/);
  });
});
