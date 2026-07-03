import { describe, expect, it } from "vitest";
import { dedupeResourceUrls, toHobbyPlan } from "./transformer";
import type { AIPlanResponse } from "@/lib/schemas";
import type { GeneratePlanRequest } from "@/lib/schemas";

function makePlan(overrides?: Partial<AIPlanResponse>): AIPlanResponse {
  return {
    summary: "A great plan.",
    techniques: [
      {
        name: "Technique A",
        description: "What it is.",
        rationale: "Why it's here.",
        resources: [
          { type: "video", title: "Video A", url: "https://example.com/same", whyChosen: "Fits." },
          { type: "reading", title: "Reading A", url: "https://example.com/same", whyChosen: "Fits." },
          { type: "audio", title: "Audio A", url: "https://example.com/unique-audio", whyChosen: "Fits." },
        ],
      },
    ],
    ...overrides,
  };
}

describe("dedupeResourceUrls", () => {
  it("keeps the first occurrence of a URL and replaces later duplicates with a constructed fallback", () => {
    const result = dedupeResourceUrls(makePlan(), "Chess");
    const urls = result.techniques[0].resources.map((r) => r.url);
    expect(urls[0]).toBe("https://example.com/same");
    expect(urls[1]).not.toBe("https://example.com/same");
    expect(urls[1]).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
    expect(urls[2]).toBe("https://example.com/unique-audio");
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("keeps disambiguating when the fallback itself collides with something already seen", () => {
    const plan = makePlan({
      techniques: [
        {
          name: "Technique A",
          description: "d",
          rationale: "r",
          resources: [
            { type: "reading", title: "Same Title", url: "https://a.com/1", whyChosen: "x" },
            { type: "reading", title: "Same Title", url: "https://a.com/1", whyChosen: "x" },
            { type: "reading", title: "Same Title", url: "https://a.com/1", whyChosen: "x" },
          ],
        },
      ],
    });
    const result = dedupeResourceUrls(plan, "Chess");
    const urls = result.techniques[0].resources.map((r) => r.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("toHobbyPlan", () => {
  const request: GeneratePlanRequest = {
    hobbyName: "Chess",
    level: "intermediate",
    goal: "Beat my dad",
    timeCommitment: "A few hours a week",
    knownTopics: ["castling"],
  };

  it("assigns server-owned fields and derives sourceName from each resource URL", () => {
    const plan = toHobbyPlan(request, makePlan());
    expect(plan.id).toBeTruthy();
    expect(plan.hobbyName).toBe("Chess");
    expect(plan.techniques[0].id).toBeTruthy();
    expect(plan.techniques[0].status).toBe("not_started");
    expect(plan.techniques[0].order).toBe(0);
    expect(plan.techniques[0].resources[0].sourceName).toBe("Example");
  });

  it("gives every resource a unique id even when source URLs repeat", () => {
    const plan = toHobbyPlan(request, makePlan());
    const ids = plan.techniques[0].resources.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
