"use client";

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

export function ProgressBar({ currentStep, totalSteps = 4 }: ProgressBarProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);
  
  return (
    <div className="w-full bg-surface-2 h-3 rounded-full overflow-hidden border border-border">
      <div 
        className="h-full bg-gradient-to-r from-cta-start via-cta-mid to-cta-end transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
