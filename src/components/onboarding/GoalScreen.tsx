"use client";

import { useState } from "react";
import { MascotWithSpeech } from "@/components/MascotWithSpeech";
import { ProgressBar } from "./ProgressBar";
import { GOAL_MAX } from "@/lib/schemas";

interface GoalScreenProps {
  initialValue: string;
  hobbyName: string;
  onNext: (val: string) => void;
  onBack: () => void;
}

export function GoalScreen({ initialValue, hobbyName, onNext, onBack }: GoalScreenProps) {
  const [value, setValue] = useState(initialValue);

  const isValid = value.trim().length > 0 && value.trim().length <= GOAL_MAX;

  return (
    <div className="flex flex-col min-h-dvh bg-background w-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 pt-8 pb-4 px-5 w-full max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary p-2 -ml-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body rounded-full flex-shrink-0"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <ProgressBar currentStep={3} />

        <div className="w-10 flex-shrink-0" />
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 items-center justify-center px-5 w-full max-w-sm sm:max-w-2xl mx-auto">
        <MascotWithSpeech state="idle" message="What are you working toward?" size="md" position="inline" />

        {/* Wider than the other inputs on sm+ — the placeholder interpolates the
            user's actual hobby name, which can run longer than a short example. */}
        <div className="w-full max-w-sm sm:max-w-xl mx-auto mt-14">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`e.g. get really good at ${hobbyName}`}
            maxLength={GOAL_MAX}
            className="
              w-full bg-surface-2 border-2 border-border
              focus:border-mascot-body focus:ring-0 focus:outline-none
              rounded-xl px-5 py-4 text-text-primary text-lg
              transition-all placeholder:text-text-muted
            "
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) {
                onNext(value.trim());
              }
            }}
          />
        </div>
      </div>

      {/* ── Footer / CTA ── */}
      <div className="px-5 pb-8 pt-4 max-w-sm w-full mx-auto self-center">
        <button
          onClick={() => onNext(value.trim())}
          disabled={!isValid}
          className="
            w-full py-4 rounded-[18px]
            bg-gradient-to-r from-cta-start via-cta-mid to-cta-end
            font-label text-base font-semibold tracking-wide text-text-primary
            shadow-[0_0_12px_rgba(198,105,0,0.3)]
            hover:shadow-[0_0_20px_rgba(198,105,0,0.5)]
            hover:scale-[1.02]
            active:scale-[0.98]
            transition-all duration-150 ease-out
            disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body
          "
        >
          Continue
        </button>
      </div>
    </div>
  );
}
