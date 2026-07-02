"use client";

import { MascotWithSpeech } from "@/components/MascotWithSpeech";
import { ProgressBar } from "@/components/ProgressBar";
import { getProgress } from "@/store/plan-store";
import type { HobbyPlan } from "@/types/domain";

interface MascotCompanionProps {
  plan: HobbyPlan;
  /** True while the technique stub (modal/bottom sheet) is open. */
  isTechniqueOpen: boolean;
}

const MESSAGES_IN_PROGRESS = [
  "Keep the fire alive.",
  "One more spark.",
  "You're building momentum.",
  "This trail is getting warmer.",
];
const MESSAGE_NOT_STARTED = "Ready to light the first fire?";
const MESSAGE_ALL_MASTERED = "The whole trail is glowing — you did it.";
// Matches copy-guidelines.md's locked wording for this exact empty state.
const MESSAGE_ALL_SKIPPED = "You've skipped everything in this plan — want to start fresh?";

function pickMessage(progress: ReturnType<typeof getProgress>): string {
  if (progress.total === 0) return MESSAGE_ALL_SKIPPED;
  if (progress.percentage === 100) return MESSAGE_ALL_MASTERED;
  if (progress.mastered === 0) return MESSAGE_NOT_STARTED;
  // Rotates off real mastered count, not a timer — changes only when
  // progress actually changes (decisions.md #11: no ambient motion).
  return MESSAGES_IN_PROGRESS[progress.mastered % MESSAGES_IN_PROGRESS.length];
}

// idle = default/current, thinking = a node is open (user's weighing it),
// success = everything mastered. fire-done is deliberately skipped — no
// such asset exists yet, and nothing on this page can trigger a
// mark-mastered transition to play it against (that's the technique detail
// page, not yet built).
function pickMascotState(
  progress: ReturnType<typeof getProgress>,
  isTechniqueOpen: boolean
): "idle" | "thinking" | "success" {
  if (progress.percentage === 100 && progress.total > 0) return "success";
  if (isTechniqueOpen) return "thinking";
  return "idle";
}

// Uses the shared MascotWithSpeech/SpeechBubble system (see decisions.md)
// rather than hand-rolled bubble markup. MascotWithSpeech only takes one
// pixel size, not a responsive pair, so mobile/desktop still render as two
// separate instances here — sm here (mobile: compact bar, first roadmap
// node must stay visible without scrolling) vs lg there (desktop: the
// mascot as the rail's emotional anchor).
export function MascotCompanion({ plan, isTechniqueOpen }: MascotCompanionProps) {
  const progress = getProgress(plan);
  const mascotState = pickMascotState(progress, isTechniqueOpen);
  const speech = pickMessage(progress);

  return (
    <>
      {/* Mobile — compact bar, small enough that the first roadmap node is
          visible without scrolling. */}
      <div className="flex md:hidden flex-col gap-2 w-full">
        <MascotWithSpeech state={mascotState} message={speech} size="sm" position="inline" />
        <ProgressBar
          label={`${progress.mastered}/${progress.total} mastered`}
          value={progress.percentage}
          maxValue={100}
        />
      </div>

      {/* Desktop — floating left column, not a heavy sidebar. The mascot is
          the emotional anchor here, sitting in the upper-left of the rail
          (not vertically centered); the speech bubble pops out near its
          head, then the progress bar/stats follow directly under it. */}
      <div className="hidden md:flex flex-col items-start gap-4 w-full">
        {/* showTail=false: the bubble's anchor here sits above/right of the
            mascot's head, where the tail's fixed left-pointing shape reads
            as a stray triangle rather than a connector. */}
        <MascotWithSpeech state={mascotState} message={speech} size="lg" position="top" showTail={false} />
        <ProgressBar
          label={`${progress.mastered}/${progress.total} mastered`}
          value={progress.percentage}
          maxValue={100}
        />
      </div>
    </>
  );
}
