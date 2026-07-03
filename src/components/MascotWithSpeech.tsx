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
}

const SIZE_PX: Record<MascotWithSpeechSize, number> = {
  sm: 56,
  md: 220,
  lg: 320,
};

// The one mascot + speech-bubble system, used everywhere the app pairs the
// two — onboarding question screens, the roadmap companion, and hero
// moments like the generation-error screen. See decisions.md for why the
// per-screen bespoke versions were consolidated into this.
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
}: MascotWithSpeechProps) {
  const pixelSize = SIZE_PX[size];
  const mascot = (
    <Mascot state={state} size={pixelSize} className="shrink-0" loop={loop} onComplete={onComplete} />
  );

  if (position === "inline") {
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
