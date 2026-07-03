"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePlanStore, getSkippedTechniques } from "@/store/plan-store";
import type { HobbyPlan } from "@/types/domain";

interface SkippedTechniquesListProps {
  plan: HobbyPlan;
}

// Skipped techniques already stay visible in the roadmap path itself
// (dimmed) — this is a separate, secondary view: a place to actually
// review and reverse a skip, not just see that it happened. Collapsed by default
// behind a compact "N skipped" toggle — this renders in the fixed-position
// desktop rail (see MascotCompanion.tsx) as well as on mobile, and a
// fixed-position container can't scroll to reach content that overflows it,
// so the resting state has to stay small regardless of how many techniques
// end up skipped. No width/alignment assumptions here — callers position
// this differently per breakpoint.
export function SkippedTechniquesList({ plan }: SkippedTechniquesListProps) {
  const updateTechniqueStatus = usePlanStore((s) => s.updateTechniqueStatus);
  const skipped = getSkippedTechniques(plan);
  const [expanded, setExpanded] = useState(false);

  if (skipped.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="inline-flex min-h-11 items-center gap-1 rounded-md px-1 font-label text-xs font-semibold tracking-wide text-text-primary uppercase opacity-80 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
      >
        {skipped.length} skipped
        {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>

      {expanded && (
        <ul className="mt-2 flex max-h-[240px] flex-col gap-2 overflow-y-auto pr-1">
          {skipped.map((technique) => (
            <li
              key={technique.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-3 py-2.5"
            >
              <span className="min-w-0 truncate font-sans text-sm text-text-primary">{technique.name}</span>
              {/* "Bring back" — skipping is reversible, never framed as a
                  dead end. Goes back to not_started, not a
                  remembered in-progress state — there's nothing else to
                  restore it to. */}
              <button
                type="button"
                onClick={() => updateTechniqueStatus(technique.id, "not_started")}
                className="min-h-11 shrink-0 rounded-md px-2 font-label text-xs font-semibold text-primary transition-colors duration-150 hover:text-mascot-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
              >
                Bring back
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
