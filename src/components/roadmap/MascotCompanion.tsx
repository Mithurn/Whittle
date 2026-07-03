"use client";

import { MascotWithSpeech } from "@/components/MascotWithSpeech";
import { ProgressBar } from "@/components/ProgressBar";
import { SkippedTechniquesList } from "./SkippedTechniquesList";
import { StartOverAction } from "./StartOverAction";
import { getProgress } from "@/store/plan-store";
import type { HobbyPlan } from "@/types/domain";

interface MascotCompanionProps {
  plan: HobbyPlan;
  /** True for the one scoped mastered-celebration beat: forces the
   * "success" state, plays its Lottie once instead of looping,
   * and clears itself via onCelebrationEnd when that single playback ends. */
  celebrating?: boolean;
  onCelebrationEnd?: () => void;
}

const MESSAGES_IN_PROGRESS = [
  "Keep the fire alive.",
  "One more spark.",
  "You're building momentum.",
  "This trail is getting warmer.",
];
const MESSAGE_NOT_STARTED = "Ready to light the first fire?";
const MESSAGE_ALL_MASTERED = "The whole trail is glowing — you did it.";
// Locked wording for this exact empty state — 0% here means opted out of
// everything, not "hasn't started yet".
const MESSAGE_ALL_SKIPPED = "You've skipped everything in this plan — want to start fresh?";
// Short and specific to the moment, not generic praise.
const MESSAGE_CELEBRATING = "Nice — that's one more in the bag.";

function pickMessage(progress: ReturnType<typeof getProgress>): string {
  if (progress.total === 0) return MESSAGE_ALL_SKIPPED;
  if (progress.percentage === 100) return MESSAGE_ALL_MASTERED;
  if (progress.mastered === 0) return MESSAGE_NOT_STARTED;
  // Rotates off real mastered count, not a timer — changes only when
  // progress actually changes, never on an ambient loop.
  return MESSAGES_IN_PROGRESS[progress.mastered % MESSAGES_IN_PROGRESS.length];
}

// idle = default/current, success = everything mastered OR the one-shot
// mastered-celebration beat. There's no "explaining" state anymore —
// technique detail is a full page now (see decisions.md #16), not an
// overlay opened above the roadmap the mascot needed to react to.
function pickMascotState(progress: ReturnType<typeof getProgress>, celebrating: boolean): "idle" | "success" {
  if (celebrating) return "success";
  if (progress.percentage === 100 && progress.total > 0) return "success";
  return "idle";
}

// Uses the shared MascotWithSpeech/SpeechBubble system rather than
// hand-rolled bubble markup. MascotWithSpeech only takes one
// pixel size, not a responsive pair, so mobile/desktop still render as two
// separate instances here — sm here (mobile: compact bar, first roadmap
// node must stay visible without scrolling) vs lg there (desktop: the
// mascot as the rail's emotional anchor).
export function MascotCompanion({ plan, celebrating = false, onCelebrationEnd }: MascotCompanionProps) {
  const progress = getProgress(plan);
  const mascotState = pickMascotState(progress, celebrating);
  const speech = celebrating ? MESSAGE_CELEBRATING : pickMessage(progress);
  // Only the celebration plays once — every other state keeps looping as before.
  const loop = !celebrating;
  const onComplete = celebrating ? onCelebrationEnd : undefined;

  return (
    <>
      {/* Mobile — compact bar, small enough that the first roadmap node is
          visible without scrolling. */}
      <div className="flex md:hidden flex-col gap-2 w-full">
        <MascotWithSpeech
          state={mascotState}
          message={speech}
          size="sm"
          position="inline"
          loop={loop}
          onComplete={onComplete}
        />
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
        <MascotWithSpeech state={mascotState} message={speech} size="lg" position="top" showTail loop={loop} onComplete={onComplete} />
        {/* Pinned to the mascot's own 320px (lg) width explicitly — the
            parent rail in page.tsx no longer has a fixed width itself (that
            was crushing the speech bubble beside the mascot into a sliver),
            so without this the bar would stretch to match the now-wider
            mascot+bubble row instead of staying under the mascot alone. */}
        <div className="w-[320px]">
          <ProgressBar
            label={`${progress.mastered}/${progress.total} mastered`}
            value={progress.percentage}
            maxValue={100}
          />
        </div>

        {/* Fills the previously-empty space under the progress bar in this
            fixed-position rail. SkippedTechniquesList stays collapsed by
            default (see that component) specifically because this rail
            can't scroll to reach anything that overflows it. */}
        <div className="flex w-[320px] flex-col gap-3">
          <SkippedTechniquesList plan={plan} />
          <StartOverAction />
        </div>
      </div>
    </>
  );
}
