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

// --- Roadmap-specific derived state (see decisions.md #11) ---

export type RoadmapNodeState = "completed" | "current" | "available" | "skipped";

export interface RoadmapNode {
  technique: Technique;
  state: RoadmapNodeState;
}

export interface RoadmapZone {
  name: string;
  nodes: RoadmapNode[];
  zoneProgress: { completed: number; total: number };
}

const ZONE_NAMES = ["Foundation Grove", "Application Forest", "Mastery Peak"];

// Visual-only grouping over the full ordered technique list — no schema
// change, the AI never sees or invents a zone/module field (decisions.md
// #11). Skipped techniques stay in the path here (unlike getVisibleTechniques,
// which excludes them) because skipped/available are sibling-level states,
// not a hidden list.
export function getRoadmapZones(plan: HobbyPlan): RoadmapZone[] {
  const ordered = [...plan.techniques].sort((a, b) => a.order - b.order);
  if (ordered.length === 0) return [];

  const nodes = deriveRoadmapNodes(ordered);
  const zoneCount = Math.min(ordered.length, ZONE_NAMES.length);
  const sizes = splitIntoZoneSizes(ordered.length, zoneCount);

  const zones: RoadmapZone[] = [];
  let cursor = 0;
  for (let i = 0; i < zoneCount; i++) {
    const zoneNodes = nodes.slice(cursor, cursor + sizes[i]);
    cursor += sizes[i];
    zones.push({
      name: ZONE_NAMES[i],
      nodes: zoneNodes,
      zoneProgress: computeZoneProgress(zoneNodes),
    });
  }
  return zones;
}

// No "locked" state — every technique is always accessible (decisions.md
// #11). "current" is guidance only: the first not-yet-resolved technique in
// order. Every other unresolved technique is "available", never gated.
function deriveRoadmapNodes(orderedTechniques: Technique[]): RoadmapNode[] {
  let currentAssigned = false;
  return orderedTechniques.map((technique) => {
    let state: RoadmapNodeState;
    if (technique.status === "mastered") {
      state = "completed";
    } else if (technique.status === "skipped") {
      state = "skipped";
    } else if (!currentAssigned) {
      currentAssigned = true;
      state = "current";
    } else {
      state = "available";
    }
    return { technique, state };
  });
}

// Distributes `total` items across `zoneCount` (1-3) zones as evenly as
// possible, remainder going to the earliest zones. Never produces an empty
// zone since zoneCount = min(total, 3) always holds at the call site.
function splitIntoZoneSizes(total: number, zoneCount: number): number[] {
  const base = Math.floor(total / zoneCount);
  const remainder = total % zoneCount;
  return Array.from({ length: zoneCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

// Mirrors getProgress's convention: skipped techniques are excluded from
// the denominator (opted-out, not "not done yet") — see decisions.md #3.
function computeZoneProgress(nodes: RoadmapNode[]): { completed: number; total: number } {
  const completed = nodes.filter((node) => node.state === "completed").length;
  const skipped = nodes.filter((node) => node.state === "skipped").length;
  return { completed, total: nodes.length - skipped };
}
