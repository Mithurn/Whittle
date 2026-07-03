import { describe, expect, it } from "vitest";
import { getYouTubeEmbedUrl } from "./youtube";

describe("getYouTubeEmbedUrl", () => {
  it("converts a standard watch URL", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("converts a bare youtube.com (no www) watch URL", () => {
    expect(getYouTubeEmbedUrl("https://youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("converts a youtu.be short link", () => {
    expect(getYouTubeEmbedUrl("https://youtu.be/abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("converts a shorts URL", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/shorts/abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("normalizes an already-embed URL", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/embed/abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("returns null for a non-YouTube URL", () => {
    expect(getYouTubeEmbedUrl("https://www.chess.com/article/view/pin-theory")).toBeNull();
  });

  it("returns null for a YouTube search-results URL (no video id)", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/results?search_query=chess")).toBeNull();
  });

  it("returns null for a watch URL missing the v param", () => {
    expect(getYouTubeEmbedUrl("https://www.youtube.com/watch")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(getYouTubeEmbedUrl("not a url")).toBeNull();
  });
});
