"use client";

import { Mascot, MascotState } from "@/components/Mascot";
import { TypingText } from "./TypingText";

interface SpeechMascotProps {
  state: MascotState;
  speech: string;
  /** "hero" is for standalone moment screens (loading/error) where the
   * mascot should dominate — not used on the compact question screens. */
  size?: "default" | "hero";
}

const MASCOT_SIZE = { default: { mobile: 220, desktop: 230 }, hero: { mobile: 320, desktop: 340 } };
const BUBBLE_TEXT = { default: { mobile: "text-sm", desktop: "text-lg" }, hero: { mobile: "text-base", desktop: "text-xl" } };

export function SpeechMascot({ state, speech, size = "default" }: SpeechMascotProps) {
  const mascotSize = MASCOT_SIZE[size];
  const bubbleText = BUBBLE_TEXT[size];

  return (
    <>
      {/* Mobile — big centered mascot, thought bubble floats above-right like a comic cloud */}
      <div className="flex sm:hidden flex-col items-center w-full">
        <div className="relative inline-block animate-float">
          <Mascot state={state} size={mascotSize.mobile} />

          <div className="absolute bottom-full mb-4 left-[48%] w-[170px] bg-surface-1 border border-border rounded-2xl px-4 py-3 shadow-sm">
            {/* Trailing circles — thought-cloud connector down to the mascot's head.
                Bubble sits fully above the mascot's box (bottom-full), so these can
                safely dip into the gap without ever overlapping the face. */}
            <div className="absolute -bottom-3 left-8 w-4 h-4 rotate-45 bg-surface-1 border-l border-b border-border" />
            <div className="absolute -bottom-6 left-6 w-2 h-2 rounded-full bg-surface-1 border border-border" />
            <div className="absolute -bottom-9 left-4 w-1.5 h-1.5 rounded-full bg-surface-1 border border-border" />

            <p className={`font-sans text-text-primary ${bubbleText.mobile} leading-relaxed font-medium`}>
              <TypingText text={speech} />
            </p>
          </div>
        </div>
      </div>

      {/* Desktop — mascot beside its speech bubble */}
      <div className="hidden sm:flex flex-row items-center gap-6 w-full">
        <div className="animate-float flex-shrink-0">
          <Mascot state={state} size={mascotSize.desktop} />
        </div>

        <div className="relative bg-surface-1 border border-border rounded-2xl px-7 py-5 flex-1 shadow-sm">
          {/* Tail — points left into the mascot */}
          <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-3 rotate-45 bg-surface-1 border-l border-b border-border" />

          <p className={`font-sans text-text-primary ${bubbleText.desktop} leading-relaxed font-medium`}>
            <TypingText text={speech} />
          </p>
        </div>
      </div>
    </>
  );
}
