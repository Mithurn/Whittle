"use client";

import { useState, useEffect } from "react";
import { usePlanStore } from "@/store/plan-store";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function Home() {
  const currentPlan = usePlanStore((s) => s.currentPlan);

  // Zustand persist hydration: avoid flash of wrong UI on first render
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  if (!hydrated) {
    // Blank screen while Zustand hydrates from localStorage — instant
    return <div className="min-h-dvh bg-background" />;
  }

  // If a plan already exists, show the roadmap (placeholder for now)
  if (currentPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-background">
        <p className="text-text-muted font-sans text-lg">
          Roadmap coming soon — plan loaded ✓
        </p>
      </div>
    );
  }

  // Onboarding flow (manages its own step state internally)
  return <OnboardingFlow />;
}
