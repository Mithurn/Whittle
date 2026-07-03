"use client";

import { useState, useEffect } from "react";
import { usePlanStore } from "@/store/plan-store";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { RoadmapBackground } from "@/components/roadmap/RoadmapBackground";
import { RoadmapPath } from "@/components/roadmap/RoadmapPath";
import { MascotCompanion } from "@/components/roadmap/MascotCompanion";
import { TechniqueModal } from "@/components/roadmap/TechniqueModal";
import { useIsMobile } from "@/lib/use-is-mobile";

export default function Home() {
  const currentPlan = usePlanStore((s) => s.currentPlan);
  const isMobile = useIsMobile();
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null);
  // One-shot mastered-celebration beat on the rail mascot — see
  // MascotCompanion.tsx's `celebrating` prop and motion-system.md.
  const [celebrating, setCelebrating] = useState(false);

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
        {/* No fixed width here (was md:w-80, matching the mascot's own
            320px) — that capped the flex row inside MascotCompanion's
            desktop MascotWithSpeech to exactly the mascot's own width, so
            the speech bubble had zero room to lay out beside it and got
            crushed into a near-zero column (line-clamp-3 then truncated
            after only a couple words). Letting this container size to its
            content lets the mascot+bubble row expand as wide as it needs.
            The progress bar's own 320px width now lives inside
            MascotCompanion.tsx, pinned to the mascot's width specifically
            rather than inherited from this wrapper.
            z-[110] deliberately sits above TechniqueModal's z-[100]
            backdrop — on desktop the rail mascot stays visible, undimmed,
            while the modal is open (see TechniqueModal.tsx). */}
        <div className="relative z-[110] px-4 pt-6 md:fixed md:left-12 md:top-8 md:px-0 md:pt-0">
          <MascotCompanion
            plan={currentPlan}
            isTechniqueOpen={selectedTechniqueId !== null}
            overrideMessage={selectedTechnique?.rationale}
            celebrating={celebrating}
            onCelebrationEnd={() => setCelebrating(false)}
          />
        </div>

        {/* md:pl-[450px] shifts the centering axis right on desktop, clear
            of the mascot rail — without it, "justify-center" centers
            against the full viewport and the rail (mascot + now-unclamped
            speech bubble) crowds into the roadmap's left edge. */}
        <div className="relative z-20 flex justify-center px-4 py-6 md:py-16 md:pl-[450px]">
          <RoadmapPath plan={currentPlan} isMobile={isMobile} onNodeClick={setSelectedTechniqueId} />
        </div>

        <TechniqueModal
          technique={selectedTechnique}
          isMobile={isMobile}
          onClose={() => setSelectedTechniqueId(null)}
          onMastered={() => setCelebrating(true)}
        />
      </div>
    );
  }

  // Onboarding flow (manages its own step state internally)
  return <OnboardingFlow />;
}
