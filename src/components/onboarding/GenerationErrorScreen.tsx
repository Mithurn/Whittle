"use client";

import { MascotWithSpeech } from "@/components/MascotWithSpeech";

interface GenerationErrorScreenProps {
  onRetry: () => void;
}

export function GenerationErrorScreen({ onRetry }: GenerationErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 bg-background">
      <div className="w-full max-w-sm sm:max-w-2xl mx-auto">
        <MascotWithSpeech
          state="error"
          message="Couldn't put your plan together — mind trying again?"
          size="lg"
          position="top"
        />
      </div>

      <div className="w-full max-w-sm mx-auto mt-10">
        <button
          type="button"
          onClick={onRetry}
          className="
            w-full py-4 rounded-[18px]
            bg-gradient-to-r from-cta-start via-cta-mid to-cta-end
            font-label text-base font-semibold tracking-wide text-cta-foreground
            shadow-[0_0_12px_rgba(198,105,0,0.3)]
            hover:shadow-[0_0_20px_rgba(198,105,0,0.5)]
            hover:scale-[1.02]
            active:scale-[0.98]
            transition-all duration-150 ease-out
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body
          "
        >
          Try again
        </button>
      </div>
    </div>
  );
}
