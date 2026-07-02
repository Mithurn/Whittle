import { describe, expect, it } from "vitest";
import { getRoadmapNodePosition, useRoadmapNodePosition } from "./use-roadmap-node-position";

// Expected xOffset per index — the [0,1,2,1,0,-1,-2,-1] triangle wave times
// the desktop/mobile amplitude.
const DESKTOP_OFFSETS = [0, 100, 200, 100, 0, -100, -200, -100];
const MOBILE_OFFSETS = [0, 56, 112, 56, 0, -56, -112, -56];

describe("useRoadmapNodePosition", () => {
  it.each(DESKTOP_OFFSETS.map((offset, index) => [index, offset] as const))(
    "index %d resolves to xOffset %d on desktop",
    (index, expected) => {
      expect(useRoadmapNodePosition(index, false).xOffset).toBe(expected);
    }
  );

  it.each(MOBILE_OFFSETS.map((offset, index) => [index, offset] as const))(
    "index %d resolves to xOffset %d on mobile",
    (index, expected) => {
      expect(useRoadmapNodePosition(index, true).xOffset).toBe(expected);
    }
  );

  it("wraps the cycle after 8 nodes", () => {
    expect(useRoadmapNodePosition(8, false).xOffset).toBe(0);
    expect(useRoadmapNodePosition(9, false).xOffset).toBe(100);
    expect(useRoadmapNodePosition(15, false).xOffset).toBe(-100);
  });

  it("marks index 2 (the peak, value 2) as a turning point", () => {
    expect(useRoadmapNodePosition(2, false).isTurningPoint).toBe(true);
  });

  it("marks index 6 (the trough, value -2) as a turning point", () => {
    expect(useRoadmapNodePosition(6, false).isTurningPoint).toBe(true);
  });

  it.each([0, 1, 3, 4, 5, 7])(
    "does not mark index %d (mid-slope or zero-crossing) as a turning point",
    (index) => {
      expect(useRoadmapNodePosition(index, false).isTurningPoint).toBe(false);
    }
  );

  it("reports direction as the heading from this node towards the next", () => {
    expect(useRoadmapNodePosition(0, false).direction).toBe("right"); // 0 -> 1
    expect(useRoadmapNodePosition(1, false).direction).toBe("right"); // 1 -> 2
    expect(useRoadmapNodePosition(2, false).direction).toBe("left"); // 2 -> 1
    expect(useRoadmapNodePosition(4, false).direction).toBe("left"); // 0 -> -1
    expect(useRoadmapNodePosition(6, false).direction).toBe("right"); // -2 -> -1
    expect(useRoadmapNodePosition(7, false).direction).toBe("right"); // -1 -> 0 (wraps)
  });

  it("stays consistent for negative indices (safe, even though unused in practice)", () => {
    expect(useRoadmapNodePosition(-1, false).xOffset).toBe(useRoadmapNodePosition(7, false).xOffset);
    expect(useRoadmapNodePosition(-8, false).xOffset).toBe(useRoadmapNodePosition(0, false).xOffset);
  });

  it("getRoadmapNodePosition (the loop-safe plain function) returns identical results to the hook", () => {
    // Deliberately not looped — react-hooks/rules-of-hooks flags calling a
    // "use"-prefixed function inside a loop, even one with no internal
    // React state like this one. A few direct calls prove the two funnel
    // through the same implementation without tripping that rule.
    expect(getRoadmapNodePosition(3, false)).toEqual(useRoadmapNodePosition(3, false));
    expect(getRoadmapNodePosition(6, true)).toEqual(useRoadmapNodePosition(6, true));
    expect(getRoadmapNodePosition(-2, false)).toEqual(useRoadmapNodePosition(-2, false));
  });
});
