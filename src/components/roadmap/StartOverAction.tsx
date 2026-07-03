"use client";

import { useState } from "react";
import { usePlanStore } from "@/store/plan-store";

// Destructive — a plain inline confirm swapped in place, never an overlay
// (component-architecture.md's StartOverAction spec). Copy matches
// copy-guidelines.md's locked wording exactly. This is the only way back to
// onboarding — there's no plan history/list to navigate instead. No width/
// alignment assumptions here — callers position this differently on mobile
// (centered, full-width) vs. the desktop rail (left-aligned, compact).
export function StartOverAction() {
  const startOver = usePlanStore((s) => s.startOver);
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-sans text-sm text-text-muted">
          This clears your whole plan — you&apos;ll start from scratch. Sure?
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-11 rounded-md px-3 font-label text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={startOver}
            className="min-h-11 rounded-md px-3 font-label text-sm font-semibold text-destructive transition-colors duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            Yes, start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="min-h-11 rounded-md px-3 font-label text-xs font-medium text-text-primary opacity-80 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
    >
      Start over
    </button>
  );
}
