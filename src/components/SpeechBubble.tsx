import React from "react";
import { TypingText } from "@/components/onboarding/TypingText";

interface SpeechBubbleProps {
  text: string;
  animate?: boolean;
  /** The tail always points left, which only reads correctly when the
   * bubble sits beside the mascot. Positions that place it above/elsewhere
   * (e.g. MascotWithSpeech's "top") can hide it rather than show a tail
   * pointing at nothing. Defaults to shown — the given design, untouched. */
  showTail?: boolean;
}

export function SpeechBubble({ text, animate = true, showTail = true }: SpeechBubbleProps) {
  return (
    <div className="relative filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
      {showTail && (
        <svg
          className="absolute -left-2 top-4 w-3 h-4 text-zinc-50"
          viewBox="0 0 8 12"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 6L8 0V12L0 6Z" />
        </svg>
      )}
      <div className="bg-zinc-50 px-5 py-3.5 rounded-2xl w-full max-w-[260px]">
        <p className="font-sans text-sm font-semibold text-zinc-900 leading-snug">
          {animate ? <TypingText text={text} /> : text}
        </p>
      </div>
    </div>
  );
}
