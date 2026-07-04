import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
