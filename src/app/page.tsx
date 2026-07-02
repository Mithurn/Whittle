"use client";

import { useState, useEffect } from "react";
import { usePlanStore } from "@/store/plan-store";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { RoadmapBackground } from "@/components/roadmap/RoadmapBackground";
import { RoadmapPath } from "@/components/roadmap/RoadmapPath";
import { MascotCompanion } from "@/components/roadmap/MascotCompanion";
import { TechniqueStub } from "@/components/roadmap/TechniqueStub";
import { useIsMobile } from "@/lib/use-is-mobile";

export default function Home() {
  const currentPlan = usePlanStore((s) => s.currentPlan);
  const isMobile = useIsMobile();
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null);

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
    const selectedTechnique = selectedTechniqueId
      ? (currentPlan.techniques.find((t) => t.id === selectedTechniqueId) ?? null)
      : null;

    return (
      <div className="relative min-h-dvh w-full overflow-hidden bg-background">
        <RoadmapBackground isMobile={isMobile} />

        {/* No app nav sidebar — this is a single-plan app, per
            component-architecture.md. Desktop: the guide rail is taken out
            of flow (fixed, pinned left) so its width can never shift the
            roadmap off-center — the roadmap centers on the full viewport,
            independent of it. Mobile: mascot stays in normal flow, compact,
            above a full-width path, small enough that the first node is
            visible without scrolling. */}
        {/* w-80 matches the "lg" mascot's own 320px width exactly, so the
            progress bar (which fills this container) lines up under the
            mascot instead of reading as a separate, wider element. */}
        <div className="relative z-50 px-4 pt-6 md:fixed md:left-12 md:top-8 md:w-80 md:px-0 md:pt-0">
          <MascotCompanion plan={currentPlan} isTechniqueOpen={selectedTechniqueId !== null} />
        </div>

        <div className="relative z-20 flex justify-center px-4 py-6 md:py-16">
          <RoadmapPath plan={currentPlan} isMobile={isMobile} onNodeClick={setSelectedTechniqueId} />
        </div>

        {/* Stub only — see decisions.md's note on this task for the
            reconciliation this needs once /technique/[id] exists. */}
        <TechniqueStub
          techniqueName={selectedTechnique?.name ?? null}
          isMobile={isMobile}
          onClose={() => setSelectedTechniqueId(null)}
        />
      </div>
    );
  }

  // Onboarding flow (manages its own step state internally)
  return <OnboardingFlow />;
}
