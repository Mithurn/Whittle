"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlanStore } from "@/store/plan-store";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { RoadmapBackground } from "@/components/roadmap/RoadmapBackground";
import { RoadmapPath } from "@/components/roadmap/RoadmapPath";
import { MascotCompanion } from "@/components/roadmap/MascotCompanion";
import { SkippedTechniquesList } from "@/components/roadmap/SkippedTechniquesList";
import { StartOverAction } from "@/components/roadmap/StartOverAction";
import { useIsMobile } from "@/lib/use-is-mobile";

export default function Home() {
  const router = useRouter();
  const currentPlan = usePlanStore((s) => s.currentPlan);
  // Set by the /technique/[id] page right before it navigates back here —
  // see plan-store.ts's celebratingTechniqueId doc comment. The roadmap
  // (not the technique page, which is about to unmount) is what plays the
  // one scoped "mastered" celebration beat.
  const celebratingTechniqueId = usePlanStore((s) => s.celebratingTechniqueId);
  const clearCelebration = usePlanStore((s) => s.clearCelebration);
  const isMobile = useIsMobile();

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

  // If a plan already exists, show the roadmap
  if (currentPlan) {
    return (
      <div className="relative min-h-dvh w-full overflow-hidden bg-background">
        <RoadmapBackground isMobile={isMobile} />

        {/* No app nav sidebar — this is a single-plan app with no screen
            hierarchy to navigate between. Desktop: the guide rail is taken out
            of flow (fixed, pinned left) so its width can never shift the
            roadmap off-center — the roadmap centers on the full viewport,
            independent of it. Mobile: mascot stays in normal flow, compact,
            above a full-width path, small enough that the first node is
            visible without scrolling. */}
        <div className="relative z-[110] px-4 pt-6 md:fixed md:left-12 md:top-8 md:px-0 md:pt-0">
          <MascotCompanion
            plan={currentPlan}
            celebrating={celebratingTechniqueId !== null}
            onCelebrationEnd={clearCelebration}
          />
        </div>

        {/* md:pl-[450px] shifts the centering axis right on desktop, clear
            of the mascot rail — without it, "justify-center" centers
            against the full viewport and the rail (mascot + now-unclamped
            speech bubble) crowds into the roadmap's left edge. */}
        <div className="relative z-20 flex justify-center px-4 py-6 md:py-16 md:pl-[450px]">
          <RoadmapPath
            plan={currentPlan}
            isMobile={isMobile}
            onNodeClick={(techniqueId) => router.push(`/technique/${techniqueId}`)}
          />
        </div>

        {/* Mobile only — desktop renders these inside the fixed rail via
            MascotCompanion.tsx, using the space under the progress bar that
            would otherwise sit empty. On mobile there's no such dead space
            (one continuous scrolling column already), so these stay here,
            below the main path. */}
        <div className="relative z-20 md:hidden">
          <div className="mx-auto w-full max-w-xl px-4 pb-6">
            <SkippedTechniquesList plan={currentPlan} />
          </div>
          <div className="mx-auto w-full max-w-xl px-4 pb-10 text-center">
            <StartOverAction />
          </div>
        </div>
      </div>
    );
  }

  // Onboarding flow (manages its own step state internally)
  return <OnboardingFlow />;
}
