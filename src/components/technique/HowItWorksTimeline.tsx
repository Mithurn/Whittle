"use client";

import { motion } from "motion/react";
import { Info } from "lucide-react";
import { MarkdownLite } from "@/components/MarkdownLite";
import { AnimatedList } from "@/components/ui/AnimatedList";

interface Step {
  title: string;
  text: string;
}

interface HowItWorksTimelineProps {
  overview: string;
  steps: Step[];
}

export function HowItWorksTimeline({ overview, steps }: HowItWorksTimelineProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Info size={16} strokeWidth={2.5} />
        </div>
        <h2 className="font-heading text-xl font-bold text-text-primary">
          How it Works
        </h2>
      </div>

      {overview && (
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface-1 p-5 sm:p-6 shadow-sm">
          <p className="font-sans text-base leading-relaxed text-text-primary">
            {overview}
          </p>
        </div>
      )}

      <AnimatedList
        items={steps}
        initialSelectedIndex={0}
        displayScrollbar={false}
        renderItem={(step: Step, isSelected: boolean) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h3 className={`font-heading text-lg font-bold transition-colors ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                {step.title}
              </h3>
            </div>
            <div className={`font-sans text-sm leading-relaxed transition-colors [&_p]:mb-0 ${isSelected ? 'text-text-primary' : 'text-text-muted'}`}>
              <MarkdownLite text={step.text} />
            </div>
          </div>
        )}
      />
    </div>
  );
}
