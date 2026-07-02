import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoadmapBackground } from "./RoadmapBackground";

// lottie-react needs a real <canvas> context, which jsdom doesn't provide.
// The mock surfaces the loop/autoplay props it received so tests can assert
// on the derived "animate" behavior without touching real Lottie internals.
vi.mock("lottie-react", () => ({
  default: ({ loop, autoplay }: { loop?: boolean; autoplay?: boolean }) => (
    <div data-testid="tree-lottie" data-loop={String(loop)} data-autoplay={String(autoplay)} />
  ),
}));

function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: reducedMotion,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

describe("RoadmapBackground", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) }) as unknown as typeof fetch;
  });

  it("fetches the tree-in-wind animation on mount", async () => {
    render(<RoadmapBackground />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/mascot/tree-in-wind.json"));
  });

  it("is hidden from assistive tech and never intercepts clicks", async () => {
    const { container } = render(<RoadmapBackground />);
    await waitFor(() => screen.getByTestId("tree-lottie"));
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveClass("pointer-events-none");
  });

  it("animates the tree silhouette on desktop by default", async () => {
    render(<RoadmapBackground />);
    const lottie = await screen.findByTestId("tree-lottie");
    expect(lottie).toHaveAttribute("data-loop", "true");
    expect(lottie).toHaveAttribute("data-autoplay", "true");
  });

  it("keeps the tree silhouette static on mobile", async () => {
    render(<RoadmapBackground isMobile />);
    const lottie = await screen.findByTestId("tree-lottie");
    expect(lottie).toHaveAttribute("data-loop", "false");
    expect(lottie).toHaveAttribute("data-autoplay", "false");
  });

  it("keeps the tree silhouette static when prefers-reduced-motion is set, even on desktop", async () => {
    mockMatchMedia(true);
    render(<RoadmapBackground isMobile={false} />);
    const lottie = await screen.findByTestId("tree-lottie");
    expect(lottie).toHaveAttribute("data-loop", "false");
    expect(lottie).toHaveAttribute("data-autoplay", "false");
  });
});
