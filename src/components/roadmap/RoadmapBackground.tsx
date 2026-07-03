"use client";

import { useEffect, useRef, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

interface RoadmapBackgroundProps {
  isMobile?: boolean;
  className?: string;
}

// Slow, barely-perceptible drift — this is the one named ambient-loop
// exception in the whole app. Every other layer here is static.
const TREE_PLAYBACK_SPEED = 0.35;

// Environmental depth, not decoration — three static layers (gradient, fog,
// warm glow) plus exactly one animated one (tree-in-wind.json), heavily
// darkened/desaturated so it reads as a silhouette, not a visible asset.
// No roadmap data dependency — purely presentational, safe to reuse anywhere.
export function RoadmapBackground({ isMobile = false, className = "" }: RoadmapBackgroundProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [treeData, setTreeData] = useState<object | null>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const animate = !isMobile && !reducedMotion;

  useEffect(() => {
    let cancelled = false;

    fetch("/mascot/tree-in-wind.json")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setTreeData(data);
      })
      .catch(() => {
        // Silently fail — the gradient + fog layers still read as
        // "environment" without the tree silhouette.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (animate) lottieRef.current?.setSpeed(TREE_PLAYBACK_SPEED);
  }, [animate, treeData]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-to-b from-surface-base to-background ${className}`}
    >
      {/* mid: tree-in-wind silhouette — the only animated layer. Static
          (first-frame) on mobile and when prefers-reduced-motion is set.
          Desktop: anchored to the right edge, shifted half its own width
          off-screen — a deliberate, more-visible decorative element
          filling the empty right side of the viewport (the guide rail and
          roadmap both sit left-of-center). Mobile keeps the original
          bottom-anchored, near-invisible ambient treatment — mobile has no
          equivalent empty-space problem, and stays lighter for performance. */}
      {treeData &&
        (isMobile ? (
          <div className="absolute inset-x-0 bottom-0 h-[70%] opacity-[0.035] [filter:blur(6px)_brightness(0.28)_grayscale(0.75)]">
            <div className="absolute left-1/2 bottom-0 h-[130%] w-[130%] -translate-x-1/2">
              <Lottie
                lottieRef={lottieRef}
                animationData={treeData}
                loop={animate}
                autoplay={animate}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        ) : (
          // Square-ish box matching the source artwork's own aspect ratio
          // (it's a centered tree in a roughly square composition) — sized
          // in vw/px, not a percentage of this container's height, since
          // this container spans the full scrollable page (much taller
          // than the viewport), not just the first screen. A percentage
          // height here previously stretched the box ~3x too tall,
          // letterboxing the artwork down to nothing visible.
          <div className="absolute right-0 top-[18vh] h-[38vw] max-h-[420px] w-[38vw] max-w-[420px] translate-x-1/2 opacity-[0.4] [filter:brightness(0.65)_grayscale(0.35)]">
            <Lottie
              lottieRef={lottieRef}
              animationData={treeData}
              loop={animate}
              autoplay={animate}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        ))}

      {/* top: soft static fog overlays */}
      <div className="absolute -left-1/4 top-0 h-2/3 w-2/3 rounded-full bg-mascot-cream/[3%] blur-3xl" />
      {!isMobile && (
        <div className="absolute -right-1/4 bottom-0 h-2/3 w-2/3 rounded-full bg-mascot-cream/[3%] blur-3xl" />
      )}

      {/* optional: faint static warm glow suggesting the active zone —
          desktop only, keeps the mobile layer count down for performance */}
      {!isMobile && (
        <div className="absolute left-1/2 top-[15%] h-1/2 w-1/2 -translate-x-1/2 rounded-full bg-cta-mid/[5%] blur-3xl" />
      )}
    </div>
  );
}
