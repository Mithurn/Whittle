import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HobbyPlan, Technique, TechniqueStatus } from "@/types/domain";

interface PlanState {
  currentPlan: HobbyPlan | null;
  setPlan: (plan: HobbyPlan) => void;
  updateTechniqueStatus: (techniqueId: string, status: TechniqueStatus) => void;
  updateTechniqueNotes: (techniqueId: string, notes: string) => void;
  startOver: () => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      currentPlan: null,

      setPlan: (plan) => set({ currentPlan: plan }),

      updateTechniqueStatus: (techniqueId, status) =>
        set((state) => {
          if (!state.currentPlan) return state;
          return {
            currentPlan: {
              ...state.currentPlan,
              techniques: state.currentPlan.techniques.map((technique) =>
                technique.id === techniqueId ? { ...technique, status } : technique
              ),
            },
          };
        }),

      updateTechniqueNotes: (techniqueId, notes) =>
        set((state) => {
          if (!state.currentPlan) return state;
          return {
            currentPlan: {
              ...state.currentPlan,
              techniques: state.currentPlan.techniques.map((technique) =>
                technique.id === techniqueId ? { ...technique, notes } : technique
              ),
            },
          };
        }),

      startOver: () => set({ currentPlan: null }),
    }),
    {
      name: "hobby-plan-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentPlan: state.currentPlan }),
    }
  )
);

// --- Derived state — pure selectors, never stored, always computed on read. ---

export function getProgress(plan: HobbyPlan): {
  mastered: number;
  total: number;
  percentage: number;
} {
  const mastered = plan.techniques.filter((technique) => technique.status === "mastered").length;
  const skipped = plan.techniques.filter((technique) => technique.status === "skipped").length;
  const total = plan.techniques.length - skipped;
  const percentage = total === 0 ? 0 : Math.round((mastered / total) * 100);
  return { mastered, total, percentage };
}

export function getVisibleTechniques(plan: HobbyPlan): Technique[] {
  return plan.techniques
    .filter((technique) => technique.status !== "skipped")
    .sort((a, b) => a.order - b.order);
}

export function getSkippedTechniques(plan: HobbyPlan): Technique[] {
  return plan.techniques
    .filter((technique) => technique.status === "skipped")
    .sort((a, b) => a.order - b.order);
}
