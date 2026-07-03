"use client";

import dynamic from "next/dynamic";
import { TypingText } from "./TypingText";

// See MascotWithSpeech.tsx — defers lottie-react out of the initial bundle
// so the very first screen the user sees isn't blocked on it.
const Mascot = dynamic(() => import("@/components/Mascot").then((mod) => mod.Mascot), {
  ssr: false,
});

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 bg-background">
      {/* ── Mascot with speech cloud ── */}
      <div className="flex flex-col items-center">
        {/* Speech cloud — sits above the mascot */}
        <div className="relative bg-surface-1 border border-border rounded-2xl px-6 py-4 max-w-xs sm:max-w-sm mb-4">
          <p className="font-sans text-text-primary text-base sm:text-lg leading-relaxed text-center">
            <TypingText
              text={[
                { text: "Hey! I'm " },
                { text: "Ember", className: "font-semibold text-mascot-body" },
                { text: ". Tell me what you want to learn, and I'll craft a plan just for you." },
              ]}
            />
          </p>

          {/* Tail — two small circles + triangle pointing down */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-3">
            <div className="w-4 h-4 rotate-45 bg-surface-1 border-r border-b border-border" />
          </div>
          <div className="absolute -bottom-6 left-1/2 translate-x-1">
            <div className="w-2 h-2 rounded-full bg-surface-1 border border-border" />
          </div>
          <div className="absolute -bottom-9 left-1/2 translate-x-3">
            <div className="w-1.5 h-1.5 rounded-full bg-surface-1 border border-border" />
          </div>
        </div>

        {/* Mascot */}
        <div className="animate-float">
          <Mascot state="welcome" size={220} className="sm:hidden" />
          <Mascot state="welcome" size={280} className="hidden sm:block" />
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="w-full max-w-xs sm:max-w-sm mt-10 sm:mt-12">
        <button
          onClick={onStart}
          className="
            w-full py-4 rounded-[18px]
            bg-gradient-to-r from-cta-start via-cta-mid to-cta-end
            font-label text-base font-semibold tracking-wide text-cta-foreground
            shadow-[0_0_12px_rgba(198,105,0,0.3)]
            hover:shadow-[0_0_20px_rgba(198,105,0,0.5)]
            hover:scale-[1.02]
            active:scale-[0.98]
            transition-all duration-150 ease-out
            cursor-pointer
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body
          "
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
