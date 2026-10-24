import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PodcastMode } from "./PodcastMode";

describe("PodcastMode", () => {
  it("shows a native fallback with no link when there is no audio resource", () => {
    render(<PodcastMode />);
    expect(screen.getByText("No Podcast Found")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows a native 'audio not available' fallback with no external link when the url can't be embedded", () => {
    render(<PodcastMode audioResource={{ title: "Chess Openings Explained", url: "https://example.com/episode" }} />);
    expect(screen.getByText("Chess Openings Explained")).toBeInTheDocument();
    expect(screen.getByText("Audio not available for this technique right now.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/open podcast/i)).not.toBeInTheDocument();
  });

  it("embeds a Spotify episode in-app with no 'listen natively' link", () => {
    render(
      <PodcastMode
        audioResource={{ title: "Chess Openings Explained", url: "https://open.spotify.com/episode/abc123" }}
      />
    );
    const iframe = document.querySelector("iframe");
    expect(iframe).toHaveAttribute("src", "https://open.spotify.com/embed/episode/abc123");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/listen natively/i)).not.toBeInTheDocument();
  });

  it("rewrites Apple Podcasts urls to the embed host and forces the dark theme", () => {
    render(<PodcastMode audioResource={{ title: "t", url: "https://podcasts.apple.com/us/podcast/x/id1?i=2" }} />);
    expect(document.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://embed.podcasts.apple.com/us/podcast/x/id1?i=2&theme=dark"
    );
    expect(screen.getByText("Tuning into Apple Podcasts...")).toBeInTheDocument();
  });

  it("starts the Apple theme query string when the url has none", () => {
    render(<PodcastMode audioResource={{ title: "t", url: "https://podcasts.apple.com/us/podcast/x/id1" }} />);
    expect(document.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://embed.podcasts.apple.com/us/podcast/x/id1?theme=dark"
    );
  });

  it("wraps SoundCloud urls in the player widget with the original url encoded", () => {
    const url = "https://soundcloud.com/artist/track?x=1&y=2";
    render(<PodcastMode audioResource={{ title: "t", url }} />);
    const src = document.querySelector("iframe")?.getAttribute("src") ?? "";
    expect(src.startsWith("https://w.soundcloud.com/player/?url=")).toBe(true);
    expect(src).toContain(encodeURIComponent(url));
    expect(screen.getByText("Tuning into SoundCloud...")).toBeInTheDocument();
  });

  describe("loading skeleton", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("hides the skeleton only after the post-load delay", () => {
      vi.useFakeTimers();
      render(<PodcastMode audioResource={{ title: "t", url: "https://open.spotify.com/episode/abc" }} />);
      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      const skeleton = screen.getByText("Tuning into Spotify...").parentElement as HTMLElement;
      expect(skeleton).toHaveClass("opacity-100");
      expect(iframe).toHaveClass("opacity-0");

      act(() => {
        iframe.dispatchEvent(new Event("load"));
      });
      act(() => {
        vi.advanceTimersByTime(3999);
      });
      expect(skeleton).toHaveClass("opacity-100");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(skeleton).toHaveClass("opacity-0");
      expect(iframe).toHaveClass("opacity-100");
    });
  });
});
