"use client";

import { motion } from "motion/react";
import { Info } from "lucide-react";
import { MarkdownLite } from "@/components/MarkdownLite";

interface Step {
  title: string;
  text: string;
}

interface HowItWorksTimelineProps {
  overview: string;
  steps: Step[];
}

export function HowItWorksTimeline({ overview, steps }: HowItWorksTimelineProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Overview Section */}
      <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface-1 p-5 sm:p-6 shadow-sm">
        <div className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 p-3 text-mascot-body">
          <Info size={20} />
        </div>
        <div className="flex-1">
          <p className="font-sans text-base leading-relaxed text-text-primary">
            {overview}
          </p>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="relative ml-2 sm:ml-4">
        {/* Continuous vertical connecting line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

        <div className="flex flex-col gap-6 relative z-10">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="group relative flex gap-6"
            >
              {/* Badge/Number */}
              <div className="flex shrink-0 items-start">
                <div className="flex size-10 items-center justify-center rounded-full border-2 border-surface-2 bg-background font-label text-sm font-bold text-text-muted shadow-sm transition-colors group-hover:border-mascot-body group-hover:text-mascot-body">
                  {index + 1}
                </div>
              </div>

              {/* Content Card */}
              <div className="flex-1 pt-1">
                <div className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-6 shadow-sm transition-shadow group-hover:shadow-md">
                  <h3 className="font-heading text-lg font-bold text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <div className="font-sans text-sm leading-relaxed text-text-muted [&_p]:mb-0">
                    <MarkdownLite text={step.text} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
