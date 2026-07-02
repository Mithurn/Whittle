"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

interface TypingSegment {
  text: string;
  className?: string;
}

interface TypingTextProps {
  /** Plain text, or segments if part of the text needs its own styling (e.g. a highlighted name). */
  text: string | TypingSegment[];
  speedMs?: number;
  className?: string;
}

function segmentStarts(segments: TypingSegment[]): number[] {
  return segments.reduce<number[]>((starts, _segment, i) => {
    const prevEnd = i === 0 ? 0 : starts[i - 1] + segments[i - 1].text.length;
    return [...starts, prevEnd];
  }, []);
}

export function TypingText({ text, speedMs = 28, className }: TypingTextProps) {
  const segments: TypingSegment[] = typeof text === "string" ? [{ text }] : text;
  const fullText = segments.map((segment) => segment.text).join("");
  const prefersReducedMotion = usePrefersReducedMotion();

  // Restart the reveal whenever the text (or reduced-motion preference)
  // changes, by adjusting state during render rather than in an effect —
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const resetKey = `${fullText}::${prefersReducedMotion}`;
  const [trackedKey, setTrackedKey] = useState(resetKey);
  const [shownCount, setShownCount] = useState(prefersReducedMotion ? fullText.length : 0);
  if (resetKey !== trackedKey) {
    setTrackedKey(resetKey);
    setShownCount(prefersReducedMotion ? fullText.length : 0);
  }

  useEffect(() => {
    if (prefersReducedMotion || fullText.length === 0) return;

    const interval = setInterval(() => {
      setShownCount((count) => {
        if (count >= fullText.length) {
          clearInterval(interval);
          return count;
        }
        return count + 1;
      });
    }, speedMs);

    return () => clearInterval(interval);
  }, [fullText, prefersReducedMotion, speedMs]);

  const starts = segmentStarts(segments);

  return (
    <span className={className}>
      {segments.map((segment, i) => {
        const take = Math.max(0, Math.min(segment.text.length, shownCount - starts[i]));
        return (
          <span key={i} className={segment.className}>
            {segment.text.slice(0, take)}
          </span>
        );
      })}
    </span>
  );
}
