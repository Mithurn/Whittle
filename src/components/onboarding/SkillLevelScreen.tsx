"use client";

import { useState } from "react";
import { SignalLow, SignalMedium, SignalHigh, type LucideIcon } from "lucide-react";
import { MascotWithSpeech } from "@/components/MascotWithSpeech";
import { ProgressBar } from "./ProgressBar";
import type { SkillLevel } from "@/types/domain";

const SKILL_LEVELS: { value: SkillLevel; label: string; description: string; Icon: LucideIcon }[] = [
  { value: "beginner", label: "Beginner", description: "I'm just starting out", Icon: SignalLow },
  { value: "intermediate", label: "Intermediate", description: "I know the basics", Icon: SignalMedium },
  { value: "advanced", label: "Advanced", description: "I'm comfortable with most of it", Icon: SignalHigh },
];

interface SkillLevelScreenProps {
  initialValue?: SkillLevel;
  onNext: (level: SkillLevel) => void;
  onBack: () => void;
}

export function SkillLevelScreen({ initialValue, onNext, onBack }: SkillLevelScreenProps) {
  const [selected, setSelected] = useState<SkillLevel | undefined>(initialValue);

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

        <ProgressBar currentStep={2} />

        <div className="w-10 flex-shrink-0" />
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 items-center justify-center px-5 pt-20 sm:pt-0 w-full max-w-sm sm:max-w-2xl mx-auto">
        <MascotWithSpeech state="idle" message="Nice! How much do you know already?" size="md" position="inline" stackOnMobile />

        <div role="radiogroup" aria-label="Skill level" className="w-full max-w-sm mx-auto mt-14 flex flex-col gap-3">
          {SKILL_LEVELS.map(({ value, label, description, Icon }) => {
            const isSelected = selected === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(value)}
                className={`
                  flex items-center gap-4 w-full text-left
                  bg-surface-2 border-2 rounded-xl px-5 py-4
                  transition-colors cursor-pointer
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body
                  ${isSelected ? "border-mascot-body" : "border-border hover:border-mascot-body/50"}
                `}
              >
                <Icon size={22} className={isSelected ? "text-mascot-body flex-shrink-0" : "text-text-muted flex-shrink-0"} aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="font-sans font-semibold text-text-primary">{label}</span>
                  <span className="font-sans text-sm text-text-muted">{description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer / CTA ── */}
      <div className="px-5 pb-8 pt-4 max-w-sm w-full mx-auto self-center">
        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="
            w-full py-4 rounded-[18px]
            bg-gradient-to-r from-cta-start via-cta-mid to-cta-end
            font-label text-base font-semibold tracking-wide text-cta-foreground
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
