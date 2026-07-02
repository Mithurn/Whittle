"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Lottie from "lottie-react";
import { SkipForward } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import type { RoadmapNode as RoadmapNodeData } from "@/store/plan-store";

interface CampfireNodeProps {
  node: RoadmapNodeData;
  onClick?: (techniqueId: string) => void;
  className?: string;
}

// "Spring compress" tap feedback — same feel across all four states, per
// the task spec ("skipped" only differs on hover, not on tap).
const TAP_TRANSITION = { type: "spring", stiffness: 420, damping: 18 } as const;

// Copy stays in the domain's mastered/skipped vocabulary (copy-guidelines.md)
// and never frames skipped as a dead end — it's still "tap to revisit".
function ariaLabel(state: RoadmapNodeData["state"], name: string): string {
  switch (state) {
    case "current":
      return `${name} — up next, tap to start`;
    case "completed":
      return `${name} — mastered`;
    case "skipped":
      return `${name} — skipped, tap to revisit`;
    case "available":
      return `${name} — tap to view`;
  }
}

// Only the current node is ever animated on a loop (fire-node.json) —
// fetched lazily, same pattern as Mascot.tsx, so the other three states
// never pay for it. completed-node.json is fetched the same lazy way and
// plays once (no loop) — its frame 0 is a "reveal in progress" outline, not
// the finished look, so it has to play forward to land on the real
// artwork; skipped under prefers-reduced-motion in favor of the plain
// gradient, same as before this asset existed.
export function CampfireNode({ node, onClick, className = "" }: CampfireNodeProps) {
  const { technique, state } = node;
  const reducedMotion = usePrefersReducedMotion();
  const [fireData, setFireData] = useState<object | null>(null);
  const [completedData, setCompletedData] = useState<object | null>(null);

  useEffect(() => {
    if (state !== "current") return;
    let cancelled = false;

    fetch("/mascot/fire-node.json")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setFireData(data);
      })
      .catch(() => {
        // Silently fail — the static glow layer below still reads as
        // "current" without the animation, node stays fully usable.
      });

    return () => {
      cancelled = true;
    };
  }, [state]);

  useEffect(() => {
    if (state !== "completed" || reducedMotion) return;
    let cancelled = false;

    fetch("/mascot/completed-node.json")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCompletedData(data);
      })
      .catch(() => {
        // Silently fail — falls back to the plain gradient circle below.
      });

    return () => {
      cancelled = true;
    };
  }, [state, reducedMotion]);

  const isCurrent = state === "current";
  const hoverScale = state === "skipped" ? 1.03 : 1.08;

  return (
    <motion.button
      type="button"
      data-node-state={state}
      aria-label={ariaLabel(state, technique.name)}
      onClick={() => onClick?.(technique.id)}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: 0.94 }}
      transition={TAP_TRANSITION}
      className={`relative flex items-center justify-center rounded-full size-12 md:size-14 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      {isCurrent && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          animate={reducedMotion ? { scale: 1.14 } : { scale: [1.1, 1.16, 1.1] }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <span
            className="absolute -inset-1.5 rounded-full blur-md"
            style={{ boxShadow: "0 0 22px 8px rgba(235,137,40,0.55)" }}
          />
          <span className="relative size-full rounded-full overflow-hidden ring-2 ring-mascot-gold/70 bg-gradient-to-b from-mascot-glow to-cta-start transition-shadow duration-150 hover:shadow-[0_0_28px_10px_rgba(235,137,40,0.6)]">
            {fireData ? (
              <Lottie
                animationData={fireData}
                loop={!reducedMotion}
                autoplay={!reducedMotion}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <span className="block size-full bg-gradient-to-b from-mascot-bright to-mascot-body" />
            )}
          </span>
        </motion.span>
      )}

      {state === "completed" && (
        <span className="relative size-full rounded-full overflow-hidden shadow-[0_0_10px_2px_rgba(198,105,0,0.3)] transition-shadow duration-150 hover:shadow-[0_0_16px_4px_rgba(198,105,0,0.45)]">
          {completedData ? (
            <Lottie
              animationData={completedData}
              loop={false}
              autoplay
              // The source artwork has generous padding around the mark
              // itself — scaled up so it fills the node instead of reading
              // as a small icon floating in the circle. The parent's
              // overflow-hidden + rounded-full crops this into a circle.
              style={{ width: "100%", height: "100%", transform: "scale(1.6)" }}
            />
          ) : (
            <span className="block size-full bg-gradient-to-b from-primary to-cta-start" />
          )}
        </span>
      )}

      {state === "available" && (
        <span className="relative flex size-full items-center justify-center rounded-full bg-outline-variant border border-outline/50 opacity-70 transition-shadow duration-150 hover:shadow-[0_0_12px_2px_rgba(235,137,40,0.25)]">
          {/* Unlit crossed logs + smoke — "not yet touched", same thin-stroke
              language as skipped's SkipForward icon (no lucide equivalent
              exists for this one, so it's hand-drawn to match). */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-outline/50"
            aria-hidden="true"
          >
            <path d="m6 18 12-6" />
            <path d="m6 12 12 6" />
            <path d="M9 8c-1-2 2-4 1-6" />
            <path d="M15 9c-1-2 2-4 1-6" />
          </svg>
        </span>
      )}

      {state === "skipped" && (
        <span className="relative flex size-full items-center justify-center rounded-full bg-outline-variant border border-outline/50 opacity-50">
          <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/40" />
          <SkipForward size={20} className="text-outline/50" aria-hidden="true" />
        </span>
      )}
    </motion.button>
  );
}
