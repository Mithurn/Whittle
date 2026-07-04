"use client";

import { useEffect, useState } from "react";
import { MascotWithSpeech } from "@/components/MascotWithSpeech";
import { ProgressBar } from "./ProgressBar";
import { HOBBY_NAME_MAX } from "@/lib/schemas";
import { isPlausibleHobbyName } from "@/lib/hobby-validation";

const PLACEHOLDER_EXAMPLES = ["chess...", "guitar...", "watercolour...", "boxing...", "photography..."];
const PLACEHOLDER_ROTATE_MS = 2500;

interface HobbyInputScreenProps {
  initialValue: string;
  onNext: (val: string) => void;
  onBack: () => void;
}

export function HobbyInputScreen({ initialValue, onNext, onBack }: HobbyInputScreenProps) {
  const [value, setValue] = useState(initialValue);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const trimmedValue = value.trim();
  const isWithinLengthCap = trimmedValue.length > 0 && trimmedValue.length <= HOBBY_NAME_MAX;
  const isPlausible = trimmedValue.length === 0 || isPlausibleHobbyName(trimmedValue);
  const isValid = isWithinLengthCap && isPlausible;
  const showGibberishWarning = isWithinLengthCap && !isPlausible;

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, PLACEHOLDER_ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-background w-full">
      {/* ── Header (Wider on web, like Duolingo) ── */}
      <div className="flex items-center gap-4 pt-8 pb-4 px-5 w-full max-w-3xl mx-auto">
         <button 
           onClick={onBack} 
           className="text-text-muted hover:text-text-primary p-2 -ml-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body rounded-full flex-shrink-0"
           aria-label="Go back"
         >
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
             <path d="m15 18-6-6 6-6"/>
           </svg>
         </button>
         
         <ProgressBar currentStep={1} />
         
         {/* Spacer to keep the progress bar perfectly centered against the back button */}
         <div className="w-10 flex-shrink-0" />
      </div>

      {/* ── Content (Constrained, vertically centered so it doesn't sit pinned to the top).
          Wider on sm+ so the desktop mascot+bubble row has room to breathe — the input
          itself stays pinned to max-w-sm below, independent of this outer width. ── */}
      <div className="flex flex-col flex-1 items-center justify-center px-5 w-full max-w-sm sm:max-w-2xl mx-auto">
        <MascotWithSpeech state="idle" message="What hobby are you excited about?" size="md" position="inline" stackOnMobile />

        <div className="w-full max-w-sm mx-auto mt-14">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`e.g. ${PLACEHOLDER_EXAMPLES[placeholderIndex]}`}
            maxLength={HOBBY_NAME_MAX}
            aria-invalid={showGibberishWarning}
            aria-describedby={showGibberishWarning ? "hobby-name-warning" : undefined}
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
          {showGibberishWarning && (
            <p id="hobby-name-warning" className="mt-2 font-sans text-sm text-destructive">
              Hmm, that doesn&apos;t look like a hobby — try something like chess, guitar, or painting.
            </p>
          )}
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
