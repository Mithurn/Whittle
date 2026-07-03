"use client";

import dynamic from "next/dynamic";
import type { MascotState } from "@/components/Mascot";
import { SpeechBubble } from "@/components/SpeechBubble";

// lottie-react (Mascot's own dependency) is a meaningfully-sized library
// with no reason to sit in the initial bundle before anything's actually
// rendered a mascot — this defers it to its own chunk, downloaded only once
// a MascotWithSpeech is first about to mount. ssr:false since Mascot's
// animation data is fetched client-side in an effect regardless.
const Mascot = dynamic(() => import("@/components/Mascot").then((mod) => mod.Mascot), {
  ssr: false,
});

export type MascotWithSpeechSize = "sm" | "md" | "lg";
export type MascotWithSpeechPosition = "right" | "top" | "inline";

interface MascotWithSpeechProps {
  state: MascotState;
  size?: MascotWithSpeechSize;
  message: string;
  animate?: boolean;
  position?: MascotWithSpeechPosition;
  className?: string;
  /** SpeechBubble's tail always points left, which only reads correctly
   * beside the mascot — pass false to drop it for a "top"/"right" bubble
   * whose anchor point makes a left-pointing tail look disconnected. */
  showTail?: boolean;
  /** Forwarded to Mascot — see Mascot.tsx for the one-shot playback use case. */
  loop?: boolean;
  onComplete?: () => void;
  /** False renders just the mascot, no SpeechBubble — for when the bubble's
   * content would be redundant with (and geometrically conflict with) other
   * on-screen content. See MascotCompanion.tsx: the rail's bubble is hidden
   * by this while TechniqueModal is open, since arbitrary-length rationale
   * text there was colliding with the modal at real desktop widths no fixed
   * position/max-width combination could reliably clear. Defaults to true so
   * every existing caller keeps showing its bubble unchanged. */
  showBubble?: boolean;
  /** position="inline" only — stacks mascot above bubble below the sm:
   * breakpoint instead of a side-by-side row. A fixed "md"/"lg" mascot size
   * leaves too little row width on a ~375px viewport for anything but the
   * shortest message (confirmed live: even a 33-character message wrapped
   * into an unreadable one-word-per-line column). Off by default —
   * MascotCompanion's mobile bar already uses "sm" (56px), small enough to
   * stay in a row, so it's intentionally left unaffected. */
  stackOnMobile?: boolean;
}

const SIZE_PX: Record<MascotWithSpeechSize, number> = {
  sm: 56,
  md: 220,
  lg: 320,
};

// The one mascot + speech-bubble system, used everywhere the app pairs the
// two — onboarding question screens, the roadmap companion, and hero
// moments like the generation-error screen — consolidating what used to be
// separate, bespoke per-screen versions.
//
// Every position is a real flex row now — mascot first, bubble second, no
// absolute/float anchoring anywhere. Absolute anchors were computed against
// the mascot's bounding box, but the Lottie artwork has empty padding
// around the character inside that box, so the anchor point never actually
// matched where the character visually was — a flex row can't drift that
// way. "top"/"right" (both unused with any distinct treatment currently —
// grep before changing either) pull the bubble in with -ml-4 to bite into
// that padding and sit tight against the mascot; "inline" already did this
// via a plain gap.
export function MascotWithSpeech({
  state,
  size = "md",
  message,
  animate = true,
  position = "inline",
  className = "",
  showTail = true,
  loop = true,
  onComplete,
  showBubble = true,
  stackOnMobile = false,
}: MascotWithSpeechProps) {
  const pixelSize = SIZE_PX[size];
  const mascot = (
    <Mascot state={state} size={pixelSize} className="shrink-0" loop={loop} onComplete={onComplete} />
  );

  if (!showBubble) {
    return <div className={className}>{mascot}</div>;
  }

  if (position === "inline") {
    if (stackOnMobile) {
      return (
        <div className={`flex flex-col items-center gap-3 sm:flex-row ${className}`}>
          {mascot}
          <SpeechBubble
            text={message}
            animate={animate}
            showTail={showTail}
            maxWidthClass="w-full sm:w-auto sm:max-w-[260px]"
            tailClassName="hidden sm:block"
          />
        </div>
      );
    }
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {mascot}
        <SpeechBubble text={message} animate={animate} showTail={showTail} />
      </div>
    );
  }

  return (
    <div className={`flex w-full flex-row items-center ${className}`}>
      {mascot}
      <div className="-ml-4 max-w-[calc(100vw-2rem)]">
        <SpeechBubble text={message} animate={animate} showTail={showTail} />
      </div>
    </div>
  );
}
