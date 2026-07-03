import { describe, expect, it } from "vitest";
import { categorizeResources, getAvailableTabs } from "./technique-tabs";
import type { Resource } from "@/types/domain";

function makeResource(overrides: Partial<Resource> & Pick<Resource, "type" | "url">): Resource {
  return {
    id: `r-${Math.random()}`,
    title: "Some resource",
    sourceName: "Source",
    whyChosen: "x",
    ...overrides,
  };
}

describe("categorizeResources", () => {
  it("puts a real YouTube video in the video bucket", () => {
    const r = makeResource({ type: "video", url: "https://youtube.com/watch?v=abc" });
    expect(categorizeResources([r]).video).toEqual([r]);
  });

  it("puts a reading resource in the reading bucket", () => {
    const r = makeResource({ type: "reading", url: "https://example.com/article" });
    expect(categorizeResources([r]).reading).toEqual([r]);
  });

  it("puts a genuinely non-video audio resource in the audio bucket", () => {
    const r = makeResource({ type: "audio", url: "https://podcasts.example.com/ep1" });
    expect(categorizeResources([r]).audio).toEqual([r]);
  });

  it("puts an audio-typed resource that resolves to YouTube in the video bucket, not audio", () => {
    const r = makeResource({ type: "audio", url: "https://youtube.com/watch?v=xyz" });
    const result = categorizeResources([r]);
    expect(result.video).toEqual([r]);
    expect(result.audio).toEqual([]);
  });

  it("puts a video-typed resource that isn't actually YouTube in the audio bucket", () => {
    const r = makeResource({ type: "video", url: "https://vimeo.com/12345" });
    const result = categorizeResources([r]);
    expect(result.audio).toEqual([r]);
    expect(result.video).toEqual([]);
  });
});

describe("getAvailableTabs", () => {
  it("always includes master, even with no resources", () => {
    expect(getAvailableTabs([])).toEqual(["master"]);
  });

  it("includes video/reading/audio only when each is actually present, in that order", () => {
    const resources = [
      makeResource({ type: "audio", url: "https://podcasts.example.com/ep1" }),
      makeResource({ type: "video", url: "https://youtube.com/watch?v=abc" }),
      makeResource({ type: "reading", url: "https://example.com/article" }),
    ];
    expect(getAvailableTabs(resources)).toEqual(["video", "reading", "audio", "master"]);
  });
});
