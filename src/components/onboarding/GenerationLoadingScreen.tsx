"use client";

import { useEffect, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { TypingText } from "./TypingText";
import type { GeneratePlanRequest } from "@/lib/schemas";
import type { SkillLevel } from "@/types/domain";

// "a beginner" / "an intermediate" / "an advanced" — a lookup rather than a
// generic a/an algorithm, since SkillLevel is a closed 3-value enum.
const SKILL_LEVEL_PHRASE: Record<SkillLevel, string> = {
  beginner: "a beginner",
  intermediate: "an intermediate",
  advanced: "an advanced",
};

const MESSAGE_ROTATE_MS = 4000;

function lowercaseFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function buildMessages(request: GeneratePlanRequest): string[] {
  return [
    `Mapping out a plan for ${request.hobbyName}...`,
    `Finding the right first steps for ${SKILL_LEVEL_PHRASE[request.level]}...`,
    `Building a plan around ${lowercaseFirst(request.timeCommitment)}...`,
  ];
}

interface GenerationLoadingScreenProps {
  request: GeneratePlanRequest;
}

// No header/progress bar — onboarding is complete by this point, this is a
// waiting state, not another question.
export function GenerationLoadingScreen({ request }: GenerationLoadingScreenProps) {
  const messages = buildMessages(request);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, MESSAGE_ROTATE_MS);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 bg-background gap-6">
      <div className="animate-float">
        <Mascot state="thinking" size={280} className="sm:hidden" />
        <Mascot state="thinking" size={460} className="hidden sm:block" />
      </div>

      <p className="font-sans text-text-primary text-base sm:text-xl text-center max-w-xs sm:max-w-lg font-medium">
        <TypingText text={messages[messageIndex]} />
      </p>
    </div>
  );
}
