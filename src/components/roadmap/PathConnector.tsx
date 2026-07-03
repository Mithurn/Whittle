"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { RoadmapNodeState } from "@/store/plan-store";

interface PathConnectorProps {
  fromOffset: number;
  toOffset: number;
  fromState: RoadmapNodeState;
  toState: RoadmapNodeState;
  /** Vertical span in px. Defaults to a mobile/desktop-appropriate value if omitted. */
  height?: number;
  isMobile?: boolean;
  className?: string;
}

type ConnectorTreatment = "warmest" | "highlight" | "bright" | "dim";

const TREATMENT_STYLES: Record<ConnectorTreatment, { stroke: string; opacity: number; strokeWidth: number }> = {
  warmest: { stroke: "var(--cta-end)", opacity: 0.25, strokeWidth: 2 },
  highlight: { stroke: "var(--mascot-gold)", opacity: 0.55, strokeWidth: 4 },
  bright: { stroke: "var(--primary)", opacity: 0.22, strokeWidth: 3 },
  dim: { stroke: "var(--primary)", opacity: 0.35, strokeWidth: 2 },
};

// Skipped is deliberately in the same visual family as available — no
// punishment styling, since skipping isn't meant to feel like failure.
// completed+available (technique finished, next not started
// yet) isn't called out explicitly in the spec; it falls into "bright"
// alongside current+available since a completed endpoint still earns more
// warmth than a fully neutral segment, without competing with the
// current-node handoff, which is the one moment that gets "highlight".
function connectorTreatment(a: RoadmapNodeState, b: RoadmapNodeState): ConnectorTreatment {
  if (a === "completed" && b === "completed") return "warmest";
  if ((a === "completed" && b === "current") || (a === "current" && b === "completed")) return "highlight";
  if (a === "current" || b === "current" || a === "completed" || b === "completed") return "bright";
  return "dim";
}

// "Skipped identical to available except slightly lower opacity" — same
// tier, same color, same width, just a touch dimmer. No separate treatment.
const SKIPPED_OPACITY_FACTOR = 0.85;

// +30% over the original 160/120 for a more breathable, premium vertical rhythm.
const DEFAULT_HEIGHT_DESKTOP = 208;
const DEFAULT_HEIGHT_MOBILE = 156;
const PADDING = 24;

// A solid glowing ember trail — no dashes, no mechanical straight lines.
// Sized so its own box is symmetric around local x=0, which is what lets a
// parent that horizontally centers its children (same convention
// CampfireNode's xOffset transform uses) line this up with the path's
// center column for free, no extra offset math needed here.
export function PathConnector({
  fromOffset,
  toOffset,
  fromState,
  toState,
  height,
  isMobile = false,
  className = "",
}: PathConnectorProps) {
  const reducedMotion = usePrefersReducedMotion();
  const resolvedHeight = height ?? (isMobile ? DEFAULT_HEIGHT_MOBILE : DEFAULT_HEIGHT_DESKTOP);
  const treatment = connectorTreatment(fromState, toState);
  const style = TREATMENT_STYLES[treatment];
  const nearCurrent = fromState === "current" || toState === "current";
  const isSkippedInvolved = fromState === "skipped" || toState === "skipped";
  const baseOpacity = isSkippedInvolved ? style.opacity * SKIPPED_OPACITY_FACTOR : style.opacity;

  const range = Math.max(Math.abs(fromOffset), Math.abs(toOffset)) + PADDING;
  const viewBoxX = -range;
  const viewBoxWidth = range * 2;

  // S-curve: each control point stays at its own endpoint's x, both pinned
  // to the vertical midpoint — the line leaves straight, bends smoothly
  // through the middle, arrives straight. How much it snakes falls
  // naturally out of how far apart fromOffset/toOffset are; no fixed bow
  // direction imposed, no asymmetry.
  const c1x = fromOffset;
  const c1y = resolvedHeight * 0.5;
  const c2x = toOffset;
  const c2y = resolvedHeight * 0.5;
  const d = `M ${fromOffset} 0 C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toOffset} ${resolvedHeight}`;

  // The current node is the visual anchor of the whole path — its
  // connectors get the strongest glow. drop-shadow is computed from the
  // path's own rendered (post-opacity) alpha, so it pulses in sync with the
  // opacity animation below for free, no separate glow layer needed.
  const glow = nearCurrent
    ? "drop-shadow(0 0 4px rgba(255,199,50,0.8)) drop-shadow(0 0 12px rgba(255,199,50,0.5))"
    : "drop-shadow(0 0 3px rgba(235,137,40,0.3))";

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none overflow-visible ${className}`}
      style={{ width: viewBoxWidth, height: resolvedHeight }}
      viewBox={`${viewBoxX} 0 ${viewBoxWidth} ${resolvedHeight}`}
    >
      <motion.path
        d={d}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeLinecap="round"
        style={{ filter: glow }}
        initial={{ opacity: 0 }}
        animate={
          nearCurrent && !reducedMotion
            ? { opacity: [baseOpacity * 0.7, baseOpacity, baseOpacity * 0.7] }
            : { opacity: baseOpacity }
        }
        transition={
          nearCurrent && !reducedMotion
            ? { opacity: { duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 } }
            : { duration: 0.4, ease: "easeOut" }
        }
      />
    </svg>
  );
}
