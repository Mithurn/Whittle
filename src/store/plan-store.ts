import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HobbyPlan, Technique, TechniqueStatus, LessonContent } from "@/types/domain";

// v0 -> v1: Technique.notes changed from a plain string to a structured
// NoteEntry[] (see decisions.md #16). Any plan already sitting in a
// browser's localStorage from before this change still has the old shape
// — without this migration, technique.notes reads as a string/undefined
// instead of an array, and the first `.find`/`.filter` call on it throws
// at runtime (caught live: "notes.find is not a function"). A non-empty
// old note is preserved as a single entry rather than silently discarded.
// Exported directly so this can be unit-tested without needing to drive
// Zustand's actual localStorage-rehydration timing in a test.
export function migratePlanState(persistedState: unknown): { currentPlan: HobbyPlan | null } {
  const state = persistedState as { currentPlan: HobbyPlan | null } | undefined;
  if (!state?.currentPlan) return state ?? { currentPlan: null };
  return {
    ...state,
    currentPlan: {
      ...state.currentPlan,
      techniques: state.currentPlan.techniques.map((technique) => {
        const rawNotes = (technique as unknown as { notes?: unknown }).notes;
        if (Array.isArray(rawNotes)) return technique;
        const oldText = typeof rawNotes === "string" ? rawNotes.trim() : "";
        return {
          ...technique,
          notes: oldText
            ? [{ id: crypto.randomUUID(), title: "Note", description: oldText, createdAt: new Date().toISOString() }]
            : [],
        };
      }),
    },
  };
}

interface PlanState {
  currentPlan: HobbyPlan | null;
  // Transient, session-only signal that a technique was just marked
  // mastered — set from the /technique/[id] page right before navigating
  // back to the roadmap, so the roadmap can play its one scoped
  // celebration beat there instead of on the page that's about to unmount.
  // Deliberately excluded from partialize below: it must never persist.
  celebratingTechniqueId: string | null;
  setPlan: (plan: HobbyPlan) => void;
  updateTechniqueStatus: (techniqueId: string, status: TechniqueStatus) => void;
  setTechniqueLesson: (techniqueId: string, lesson: LessonContent) => void;
  addTechniqueNote: (techniqueId: string, note: { title: string; description: string }) => void;
  removeTechniqueNote: (techniqueId: string, noteId: string) => void;
  startOver: () => void;
  triggerCelebration: (techniqueId: string) => void;
  clearCelebration: () => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      currentPlan: null,
      celebratingTechniqueId: null,

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
        
      setTechniqueLesson: (techniqueId, lesson) =>
        set((state) => {
          if (!state.currentPlan) return state;
          return {
            currentPlan: {
              ...state.currentPlan,
              techniques: state.currentPlan.techniques.map((technique) =>
                technique.id === techniqueId ? { ...technique, lesson } : technique
              ),
            },
          };
        }),

      addTechniqueNote: (techniqueId, note) =>
        set((state) => {
          if (!state.currentPlan) return state;
          const entry = {
            id: crypto.randomUUID(),
            title: note.title,
            description: note.description,
            createdAt: new Date().toISOString(),
          };
          return {
            currentPlan: {
              ...state.currentPlan,
              techniques: state.currentPlan.techniques.map((technique) =>
                technique.id === techniqueId ? { ...technique, notes: [...technique.notes, entry] } : technique
              ),
            },
          };
        }),

      removeTechniqueNote: (techniqueId, noteId) =>
        set((state) => {
          if (!state.currentPlan) return state;
          return {
            currentPlan: {
              ...state.currentPlan,
              techniques: state.currentPlan.techniques.map((technique) =>
                technique.id === techniqueId
                  ? { ...technique, notes: technique.notes.filter((n) => n.id !== noteId) }
                  : technique
              ),
            },
          };
        }),

      startOver: () => set({ currentPlan: null }),

      triggerCelebration: (techniqueId) => set({ celebratingTechniqueId: techniqueId }),
      clearCelebration: () => set({ celebratingTechniqueId: null }),
    }),
    {
      name: "hobby-plan-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentPlan: state.currentPlan }),
      version: 1,
      migrate: migratePlanState,
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

// --- Roadmap-specific derived state ---

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
// change, the AI never sees or invents a zone/module field. Skipped
// techniques stay in the path here (unlike getVisibleTechniques,
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

// No "locked" state — every technique is always accessible. "current" is
// guidance only: the first not-yet-resolved technique in
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
// the denominator (opted-out, not "not done yet").
function computeZoneProgress(nodes: RoadmapNode[]): { completed: number; total: number } {
  const completed = nodes.filter((node) => node.state === "completed").length;
  const skipped = nodes.filter((node) => node.state === "skipped").length;
  return { completed, total: nodes.length - skipped };
}
