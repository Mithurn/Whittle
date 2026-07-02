// Single source of truth for the roadmap's zig-zag positioning math — see
// component-architecture.md's Hooks section and decisions.md #11. A
// triangle wave cycled by node index, not CSS nth-child tricks or SVG path
// math — adapted from the fixed-offset-array technique studied in the
// duolingo-clone reference repo (structural idea only, not its code).
const OFFSET_CYCLE = [0, 1, 2, 1, 0, -1, -2, -1] as const;
const CYCLE_LENGTH = OFFSET_CYCLE.length;

const DESKTOP_MULTIPLIER_PX = 100;
const MOBILE_MULTIPLIER_PX = 56;

export type PathDirection = "left" | "right" | "flat";

export interface RoadmapNodePosition {
  /** Horizontal offset in px from the path's center column. Positive = right. */
  xOffset: number;
  /** Which way the trail heads leaving this node, towards the next one. */
  direction: PathDirection;
  /** True at a local peak/trough of the zig-zag — where the trail bends back. */
  isTurningPoint: boolean;
}

// Modulo that stays positive for negative indices too, so the cycle is safe
// to query in either direction.
function cycleValue(index: number): number {
  const wrapped = ((index % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  return OFFSET_CYCLE[wrapped];
}

function directionBetween(a: number, b: number): PathDirection {
  if (b > a) return "right";
  if (b < a) return "left";
  return "flat";
}

// The actual calculation — safe to call from a loop/`.map()` when
// positioning a full node list (e.g. RoadmapPath), which a "use"-prefixed
// function cannot be per React's rules of hooks.
export function getRoadmapNodePosition(index: number, isMobile: boolean): RoadmapNodePosition {
  const multiplier = isMobile ? MOBILE_MULTIPLIER_PX : DESKTOP_MULTIPLIER_PX;
  const current = cycleValue(index);
  const prev = cycleValue(index - 1);
  const next = cycleValue(index + 1);

  const incoming = directionBetween(prev, current);
  const outgoing = directionBetween(current, next);

  return {
    xOffset: current * multiplier,
    direction: outgoing,
    isTurningPoint: incoming !== "flat" && outgoing !== "flat" && incoming !== outgoing,
  };
}

// Thin hook wrapper for single-node call sites — same math, same result,
// just the requested hook signature. Both funnel through the function
// above, so the positioning logic still has exactly one implementation.
export function useRoadmapNodePosition(index: number, isMobile: boolean): RoadmapNodePosition {
  return getRoadmapNodePosition(index, isMobile);
}
