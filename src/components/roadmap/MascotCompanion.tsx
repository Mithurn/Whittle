"use client";

import { MascotWithSpeech } from "@/components/MascotWithSpeech";
import { ProgressBar } from "@/components/ProgressBar";
import { getProgress } from "@/store/plan-store";
import type { HobbyPlan } from "@/types/domain";

interface MascotCompanionProps {
  plan: HobbyPlan;
  /** True while the technique modal (modal/bottom sheet) is open. */
  isTechniqueOpen: boolean;
  /** Shown instead of the computed progress message — used to surface
   * technique.rationale while TechniqueModal is open (see page.tsx). */
  overrideMessage?: string;
  /** True for the one scoped mastered-celebration beat (motion-system.md):
   * forces the "success" state, plays its Lottie once instead of looping,
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
// Matches copy-guidelines.md's locked wording for this exact empty state.
const MESSAGE_ALL_SKIPPED = "You've skipped everything in this plan — want to start fresh?";
// Matches copy-guidelines.md's exact "Good" example for a mastered moment.
const MESSAGE_CELEBRATING = "Nice — that's one more in the bag.";

function pickMessage(progress: ReturnType<typeof getProgress>): string {
  if (progress.total === 0) return MESSAGE_ALL_SKIPPED;
  if (progress.percentage === 100) return MESSAGE_ALL_MASTERED;
  if (progress.mastered === 0) return MESSAGE_NOT_STARTED;
  // Rotates off real mastered count, not a timer — changes only when
  // progress actually changes (decisions.md #11: no ambient motion).
  return MESSAGES_IN_PROGRESS[progress.mastered % MESSAGES_IN_PROGRESS.length];
}

// idle = default/current, explaining = a node is open (the mascot reading
// out that technique's rationale — a purpose-built animation, not the
// generic "thinking" wait state GenerationLoadingScreen.tsx uses), success =
// everything mastered OR the one-shot mastered-celebration beat. celebrating
// wins over everything (it's a real, if brief, state); after that,
// isTechniqueOpen always wins over the all-mastered check — even re-opening
// an already-mastered technique should read as "explaining this", not fall
// back to the all-done success state.
function pickMascotState(
  progress: ReturnType<typeof getProgress>,
  isTechniqueOpen: boolean,
  celebrating: boolean
): "idle" | "explaining" | "success" {
  if (celebrating) return "success";
  if (isTechniqueOpen) return "explaining";
  if (progress.percentage === 100 && progress.total > 0) return "success";
  return "idle";
}

// Uses the shared MascotWithSpeech/SpeechBubble system (see decisions.md)
// rather than hand-rolled bubble markup. MascotWithSpeech only takes one
// pixel size, not a responsive pair, so mobile/desktop still render as two
// separate instances here — sm here (mobile: compact bar, first roadmap
// node must stay visible without scrolling) vs lg there (desktop: the
// mascot as the rail's emotional anchor).
export function MascotCompanion({
  plan,
  isTechniqueOpen,
  overrideMessage,
  celebrating = false,
  onCelebrationEnd,
}: MascotCompanionProps) {
  const progress = getProgress(plan);
  const mascotState = pickMascotState(progress, isTechniqueOpen, celebrating);
  const speech = celebrating ? MESSAGE_CELEBRATING : (overrideMessage ?? pickMessage(progress));
  // Only the celebration plays once — every other state keeps looping as before.
  const loop = !celebrating;
  const onComplete = celebrating ? onCelebrationEnd : undefined;

  return (
    <>
      {/* Mobile — compact bar, small enough that the first roadmap node is
          visible without scrolling. TechniqueModal renders its own peeking
          mascot inside the Drawer, so this one hides while it's open rather
          than showing two mascots at once — the progress bar stays put
          either way, dimmed by the backdrop like any other page content. */}
      <div className="flex md:hidden flex-col gap-2 w-full">
        {!isTechniqueOpen && (
          <MascotWithSpeech
            state={mascotState}
            message={speech}
            size="sm"
            position="inline"
            loop={loop}
            onComplete={onComplete}
          />
        )}
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
        {/* showTail=true: now that "top" lays the bubble out in a real flex
            row beside the mascot (see MascotWithSpeech.tsx) instead of
            floating above it, the left-pointing tail correctly connects to
            the mascot again. */}
        <MascotWithSpeech
          state={mascotState}
          message={speech}
          size="lg"
          position="top"
          showTail
          loop={loop}
          onComplete={onComplete}
        />
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
      </div>
    </>
  );
}
