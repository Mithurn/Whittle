import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PathConnector } from "./PathConnector";
import type { RoadmapNodeState } from "@/store/plan-store";

function renderConnector(
  fromState: RoadmapNodeState,
  toState: RoadmapNodeState,
  fromOffset = 0,
  toOffset = 96,
  isMobile = false
) {
  const { container } = render(
    <PathConnector
      fromOffset={fromOffset}
      toOffset={toOffset}
      fromState={fromState}
      toState={toState}
      isMobile={isMobile}
    />
  );
  return {
    svg: container.querySelector("svg"),
    path: container.querySelector("path"),
  };
}

describe("PathConnector", () => {
  it("is hidden from assistive tech and never intercepts clicks", () => {
    const { svg } = renderConnector("available", "available");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("pointer-events-none");
  });

  it("renders exactly one solid path, with no dash pattern", () => {
    const { svg, path } = renderConnector("available", "available");
    expect(svg?.querySelectorAll("path")).toHaveLength(1);
    expect(path).not.toHaveAttribute("stroke-dasharray");
  });

  it("draws a symmetric S-curve (control points pinned to each endpoint's x, both at the vertical midpoint) at the default desktop height", () => {
    const { path } = renderConnector("available", "available", 0, 96);
    expect(path).toHaveAttribute("d", "M 0 0 C 0 104, 96 104, 96 208");
  });

  it("uses a smaller default height on mobile", () => {
    const { path } = renderConnector("available", "available", 0, 48, true);
    expect(path).toHaveAttribute("d", "M 0 0 C 0 78, 48 78, 48 156");
  });

  it("sizes the SVG viewBox symmetrically around x=0 so it centers for free in a centered parent", () => {
    const { svg } = renderConnector("available", "available", -96, 192);
    // range = max(|-96|, |192|) + 24 padding = 216
    expect(svg).toHaveAttribute("viewBox", "-216 0 432 208");
  });

  it.each([
    ["completed", "completed", "var(--cta-end)"],
    ["completed", "current", "var(--mascot-gold)"],
    ["current", "completed", "var(--mascot-gold)"],
    ["current", "available", "var(--primary)"],
    ["available", "available", "var(--primary)"],
    ["skipped", "available", "var(--primary)"],
    ["skipped", "skipped", "var(--primary)"],
  ] as const)("uses the right stroke color for %s -> %s", (from, to, expectedStroke) => {
    const { path } = renderConnector(from, to);
    expect(path).toHaveAttribute("stroke", expectedStroke);
  });

  it("treats available and skipped as the same visual family (identical color/width)", () => {
    const a = renderConnector("available", "available").path;
    const b = renderConnector("skipped", "available").path;
    const c = renderConnector("skipped", "skipped").path;
    for (const el of [a, b, c]) {
      expect(el).toHaveAttribute("stroke", "var(--primary)");
      expect(el).toHaveAttribute("stroke-width", "2");
    }
  });

  it("gives each tier its specified stroke width — highlight (current-adjacent) is the boldest, dim was thickened/brightened so future path stays visible without overpowering current", () => {
    expect(renderConnector("completed", "completed").path).toHaveAttribute("stroke-width", "2"); // warmest
    expect(renderConnector("completed", "current").path).toHaveAttribute("stroke-width", "4"); // highlight, boldest
    expect(renderConnector("current", "available").path).toHaveAttribute("stroke-width", "3"); // bright
    expect(renderConnector("available", "available").path).toHaveAttribute("stroke-width", "2"); // dim
  });

  it("gives connectors touching the current node the strongest glow (drop-shadow)", () => {
    // Near the current node, a second animated "pulse" path is layered on
    // top of the base track specifically to carry this glow (the base
    // track's own filter is "none" there, to avoid stacking two blurred
    // shadows) — so this checks all paths for the glow, not just the first.
    const { svg: anchorSvg } = renderConnector("current", "available");
    const anchorFilters = Array.from(anchorSvg?.querySelectorAll("path") ?? []).map(
      (p) => (p as SVGPathElement).style.filter
    );
    expect(anchorFilters.some((f) => f.includes("rgba(255,199,50"))).toBe(true);

    const normal = renderConnector("available", "available").path;
    const normalFilter = normal?.style.filter ?? "";
    expect(normalFilter).not.toContain("rgba(255,199,50");
  });
});
