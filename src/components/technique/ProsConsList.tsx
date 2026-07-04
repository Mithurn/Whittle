"use client";

import { Check, X } from "lucide-react";

// Replaces the old generic Advantages/Disadvantages framing — pros/cons is
// a comparison-shopping frame, not a coaching frame, and didn't fit "how do
// I do this technique." Tips and mistakes-to-avoid are the equivalent
// that's actually actionable mid-practice (see domain.ts's mistakesTips).
interface ProsConsListProps {
  tips: string[];
  mistakes: string[];
}

// Stacked full-width, not a 2-column grid — these are now full coaching
// sentences (not short "Advantages: Wins material"-style phrases), and
// splitting them into two side-by-side columns inside the page's
// max-w-3xl content width left each column too narrow to read comfortably.
export function ProsConsList({ tips, mistakes }: ProsConsListProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-5 shadow-sm">
        <h3 className="font-heading text-lg font-semibold text-text-primary">Pro Tips</h3>
        <ul className="flex flex-col gap-3">
          {tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="font-sans text-sm text-text-muted">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-5 shadow-sm">
        <h3 className="font-heading text-lg font-semibold text-text-primary">Common Mistakes</h3>
        <ul className="flex flex-col gap-3">
          {mistakes.map((mistake, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                <X size={12} strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="font-sans text-sm text-text-muted">{mistake}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
