"use client";

import { Mascot, type MascotState } from "@/components/Mascot";
import { SpeechBubble } from "@/components/SpeechBubble";

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
// "inline" never uses absolute positioning at all (plain side-by-side row,
// identical at every width) — the safest variant, can't overflow. "top"
// and "right" float the bubble beside the mascot without it consuming
// layout space, but only on desktop — on mobile they still collapse to the
// same plain row "inline" always uses, so a floated bubble can never run
// off a narrow viewport.
export function MascotWithSpeech({
  state,
  size = "md",
  message,
  animate = true,
  position = "inline",
  className = "",
  showTail = true,
}: MascotWithSpeechProps) {
  const pixelSize = SIZE_PX[size];
  const mascot = <Mascot state={state} size={pixelSize} className="shrink-0" />;

  if (position === "inline") {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {mascot}
        <SpeechBubble text={message} animate={animate} showTail={showTail} />
      </div>
    );
  }

  const desktopAnchorClass =
    position === "top" ? "-top-2 left-[60%]" : "left-full top-8 ml-2";

  return (
    <div className={`relative inline-flex ${className}`}>
      {mascot}

      {/* Mobile: plain row beneath the mascot, never absolutely positioned. */}
      <div className="mt-3 md:hidden">
        <SpeechBubble text={message} animate={animate} showTail={showTail} />
      </div>

      {/* Desktop: floats beside the mascot per `position`. */}
      <div className={`absolute hidden max-w-[calc(100vw-2rem)] md:block ${desktopAnchorClass}`}>
        <SpeechBubble text={message} animate={animate} showTail={showTail} />
      </div>
    </div>
  );
}
