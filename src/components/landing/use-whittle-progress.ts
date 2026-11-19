"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  PROGRESS_EPSILON,
  SCROLL_HEAD_RATIO,
  SCROLL_LEAD_RATIO,
  SCROLL_TAIL_RATIO,
  WHITTLE_DURATION_MS,
} from "./landing-config";

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function useWhittleProgress(stageRef: RefObject<HTMLElement | null>, durationMs = WHITTLE_DURATION_MS) {
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const frameRef = useRef(0);
  const manualRef = useRef(false);

  const apply = useCallback((value: number) => {
    progressRef.current = value;
    setProgress(value);
  }, []);

  const takeControl = useCallback(() => {
    manualRef.current = true;
    cancelAnimationFrame(frameRef.current);
  }, []);

  const scrub = useCallback(
    (value: number) => {
      takeControl();
      apply(value);
    },
    [apply, takeControl],
  );

  const animateTo = useCallback(
    (target: number) => {
      takeControl();
      if (reduced) {
        apply(target);
        return;
      }
      const from = progressRef.current;
      const startedAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / durationMs);
        apply(from + (target - from) * easeInOut(t));
        if (t < 1) frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    },
    [apply, durationMs, reduced, takeControl],
  );

  useEffect(() => {
    if (reduced) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const stage = stageRef.current;
        if (manualRef.current || !stage) return;
        const rect = stage.getBoundingClientRect();
        const vh = window.innerHeight;
        const next = clamp01(
          (vh * SCROLL_LEAD_RATIO - rect.top) / (vh * SCROLL_LEAD_RATIO + rect.height * SCROLL_TAIL_RATIO - vh * SCROLL_HEAD_RATIO),
        );
        if (Math.abs(next - progressRef.current) > PROGRESS_EPSILON) apply(next);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [apply, reduced, stageRef]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return { progress, scrub, animateTo };
}
