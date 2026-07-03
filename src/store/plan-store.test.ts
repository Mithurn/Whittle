import { beforeEach, describe, expect, it } from "vitest";
import {
  usePlanStore,
  getProgress,
  getVisibleTechniques,
  getSkippedTechniques,
  getRoadmapZones,
  migratePlanState,
} from "./plan-store";
import type { HobbyPlan, Technique } from "@/types/domain";

function makeTechnique(overrides: Partial<Technique> & Pick<Technique, "id" | "order">): Technique {
  return {
    name: `Technique ${overrides.id}`,
    description: "desc",
    rationale: "rationale",
    resources: [],
    status: "not_started",
    notes: [],
    ...overrides,
  };
}

function makePlan(techniques: Technique[]): HobbyPlan {
  return {
    id: "plan-1",
    hobbyName: "Juggling",
    level: "beginner",
    goal: "Learn to juggle",
    timeCommitment: "a few hours a week",
    knownTopics: [],
    summary: "A plan",
    createdAt: "2026-01-01T00:00:00.000Z",
    techniques,
  };
}

describe("plan-store", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlanStore.setState({ currentPlan: null });
  });

  it("setPlan stores the plan correctly", () => {
    const plan = makePlan([makeTechnique({ id: "t1", order: 0 })]);
    usePlanStore.getState().setPlan(plan);
    expect(usePlanStore.getState().currentPlan).toEqual(plan);
  });

  it("updateTechniqueStatus updates only the targeted technique", () => {
    const plan = makePlan([
      makeTechnique({ id: "t1", order: 0, status: "not_started" }),
      makeTechnique({ id: "t2", order: 1, status: "not_started" }),
    ]);
    usePlanStore.getState().setPlan(plan);
    usePlanStore.getState().updateTechniqueStatus("t2", "mastered");

    const techniques = usePlanStore.getState().currentPlan?.techniques;
    expect(techniques?.find((t) => t.id === "t1")?.status).toBe("not_started");
    expect(techniques?.find((t) => t.id === "t2")?.status).toBe("mastered");
  });

  it("updateTechniqueStatus is a no-op when there is no current plan", () => {
    usePlanStore.getState().updateTechniqueStatus("t1", "mastered");
    expect(usePlanStore.getState().currentPlan).toBeNull();
  });

  it("addTechniqueNote appends a note only to the targeted technique", () => {
    const plan = makePlan([
      makeTechnique({ id: "t1", order: 0 }),
      makeTechnique({ id: "t2", order: 1 }),
    ]);
    usePlanStore.getState().setPlan(plan);
    usePlanStore.getState().addTechniqueNote("t1", { title: "Key idea", description: "felt good today" });

    const techniques = usePlanStore.getState().currentPlan?.techniques;
    const t1Notes = techniques?.find((t) => t.id === "t1")?.notes;
    expect(t1Notes).toHaveLength(1);
    expect(t1Notes?.[0]).toMatchObject({ title: "Key idea", description: "felt good today" });
    expect(t1Notes?.[0].id).toBeTruthy();
    expect(t1Notes?.[0].createdAt).toBeTruthy();
    expect(techniques?.find((t) => t.id === "t2")?.notes).toEqual([]);
  });

  it("addTechniqueNote appends rather than replacing existing notes", () => {
    const plan = makePlan([makeTechnique({ id: "t1", order: 0 })]);
    usePlanStore.getState().setPlan(plan);
    usePlanStore.getState().addTechniqueNote("t1", { title: "First", description: "a" });
    usePlanStore.getState().addTechniqueNote("t1", { title: "Second", description: "b" });

    const notes = usePlanStore.getState().currentPlan?.techniques[0].notes;
    expect(notes?.map((n) => n.title)).toEqual(["First", "Second"]);
  });

  it("removeTechniqueNote removes only the targeted note", () => {
    const plan = makePlan([makeTechnique({ id: "t1", order: 0 })]);
    usePlanStore.getState().setPlan(plan);
    usePlanStore.getState().addTechniqueNote("t1", { title: "First", description: "a" });
    usePlanStore.getState().addTechniqueNote("t1", { title: "Second", description: "b" });
    const noteId = usePlanStore.getState().currentPlan?.techniques[0].notes[0].id;

    usePlanStore.getState().removeTechniqueNote("t1", noteId!);

    const notes = usePlanStore.getState().currentPlan?.techniques[0].notes;
    expect(notes?.map((n) => n.title)).toEqual(["Second"]);
  });

  it("triggerCelebration/clearCelebration set and clear the transient celebration flag", () => {
    expect(usePlanStore.getState().celebratingTechniqueId).toBeNull();
    usePlanStore.getState().triggerCelebration("t1");
    expect(usePlanStore.getState().celebratingTechniqueId).toBe("t1");
    usePlanStore.getState().clearCelebration();
    expect(usePlanStore.getState().celebratingTechniqueId).toBeNull();
  });

  it("startOver discards the current plan", () => {
    usePlanStore.getState().setPlan(makePlan([makeTechnique({ id: "t1", order: 0 })]));
    usePlanStore.getState().startOver();
    expect(usePlanStore.getState().currentPlan).toBeNull();
  });

  describe("migratePlanState (v0 -> v1: notes string -> NoteEntry[])", () => {
    it("wraps an old non-empty string note into a single structured entry", () => {
      const oldPlan = makePlan([makeTechnique({ id: "t1", order: 0 })]);
      const oldTechnique = { ...oldPlan.techniques[0], notes: "felt good today" } as unknown as Technique;
      const migrated = migratePlanState({ currentPlan: { ...oldPlan, techniques: [oldTechnique] } });

      const notes = migrated.currentPlan?.techniques[0].notes;
      expect(notes).toHaveLength(1);
      expect(notes?.[0].description).toBe("felt good today");
      expect(notes?.[0].id).toBeTruthy();
    });

    it("converts a missing/empty old notes field into an empty array, not a crash", () => {
      const oldPlan = makePlan([makeTechnique({ id: "t1", order: 0 })]);
      const oldTechnique = { ...oldPlan.techniques[0] } as unknown as Technique;
      delete (oldTechnique as unknown as { notes?: unknown }).notes;
      const migrated = migratePlanState({ currentPlan: { ...oldPlan, techniques: [oldTechnique] } });

      expect(migrated.currentPlan?.techniques[0].notes).toEqual([]);
    });

    it("leaves an already-migrated (array) notes field untouched", () => {
      const plan = makePlan([makeTechnique({ id: "t1", order: 0 })]);
      plan.techniques[0].notes = [
        { id: "n1", title: "Existing", description: "d", createdAt: "2026-01-01T00:00:00.000Z" },
      ];
      const migrated = migratePlanState({ currentPlan: plan });
      expect(migrated.currentPlan?.techniques[0].notes).toEqual(plan.techniques[0].notes);
    });

    it("handles no persisted plan at all without throwing", () => {
      expect(migratePlanState(undefined)).toEqual({ currentPlan: null });
      expect(migratePlanState({ currentPlan: null })).toEqual({ currentPlan: null });
    });
  });

  describe("getProgress", () => {
    it("computes mastered/total/percentage excluding skipped techniques", () => {
      const plan = makePlan([
        makeTechnique({ id: "t1", order: 0, status: "mastered" }),
        makeTechnique({ id: "t2", order: 1, status: "mastered" }),
        makeTechnique({ id: "t3", order: 2, status: "not_started" }),
        makeTechnique({ id: "t4", order: 3, status: "skipped" }),
      ]);
      expect(getProgress(plan)).toEqual({ mastered: 2, total: 3, percentage: 67 });
    });

    it("guards against divide-by-zero when every technique is skipped", () => {
      const plan = makePlan([
        makeTechnique({ id: "t1", order: 0, status: "skipped" }),
        makeTechnique({ id: "t2", order: 1, status: "skipped" }),
      ]);
      expect(getProgress(plan)).toEqual({ mastered: 0, total: 0, percentage: 0 });
    });
  });

  describe("getVisibleTechniques", () => {
    it("excludes skipped techniques and sorts by order", () => {
      const plan = makePlan([
        makeTechnique({ id: "t3", order: 2, status: "not_started" }),
        makeTechnique({ id: "t1", order: 0, status: "skipped" }),
        makeTechnique({ id: "t2", order: 1, status: "mastered" }),
      ]);
      expect(getVisibleTechniques(plan).map((t) => t.id)).toEqual(["t2", "t3"]);
    });
  });

  describe("getSkippedTechniques", () => {
    it("includes only skipped techniques and sorts by order", () => {
      const plan = makePlan([
        makeTechnique({ id: "t3", order: 2, status: "skipped" }),
        makeTechnique({ id: "t1", order: 0, status: "skipped" }),
        makeTechnique({ id: "t2", order: 1, status: "mastered" }),
      ]);
      expect(getSkippedTechniques(plan).map((t) => t.id)).toEqual(["t1", "t3"]);
    });
  });

  describe("getRoadmapZones", () => {
    const ZONE_NAMES = ["Foundation Grove", "Application Forest", "Mastery Peak"];

    it("normal split: 6 not-started techniques, first is current, rest available", () => {
      const plan = makePlan(
        Array.from({ length: 6 }, (_, i) => makeTechnique({ id: `t${i}`, order: i }))
      );
      const zones = getRoadmapZones(plan);

      expect(zones.map((z) => z.name)).toEqual(ZONE_NAMES);
      expect(zones.map((z) => z.nodes.length)).toEqual([2, 2, 2]);
      expect(zones.flatMap((z) => z.nodes.map((n) => n.technique.id))).toEqual([
        "t0", "t1", "t2", "t3", "t4", "t5",
      ]);
      expect(zones[0].nodes[0].state).toBe("current");
      expect(zones.flatMap((z) => z.nodes).slice(1).every((n) => n.state === "available")).toBe(true);
      expect(zones.every((z) => z.zoneProgress.completed === 0 && z.zoneProgress.total === 2)).toBe(true);
    });

    it("all mastered: every node is completed, no current node", () => {
      const plan = makePlan([
        makeTechnique({ id: "t0", order: 0, status: "mastered" }),
        makeTechnique({ id: "t1", order: 1, status: "mastered" }),
        makeTechnique({ id: "t2", order: 2, status: "mastered" }),
      ]);
      const zones = getRoadmapZones(plan);

      expect(zones.flatMap((z) => z.nodes).every((n) => n.state === "completed")).toBe(true);
      expect(zones.every((z) => z.zoneProgress.completed === 1 && z.zoneProgress.total === 1)).toBe(true);
    });

    it("mixed skipped/mastered/current/available: derives each state correctly and zoneProgress excludes skipped from total", () => {
      const plan = makePlan([
        makeTechnique({ id: "t0", order: 0, status: "mastered" }),
        makeTechnique({ id: "t1", order: 1, status: "skipped" }),
        makeTechnique({ id: "t2", order: 2, status: "not_started" }),
        makeTechnique({ id: "t3", order: 3, status: "skipped" }),
        makeTechnique({ id: "t4", order: 4, status: "not_started" }),
      ]);
      const zones = getRoadmapZones(plan);

      expect(zones.map((z) => z.nodes.length)).toEqual([2, 2, 1]);
      const byId = Object.fromEntries(
        zones.flatMap((z) => z.nodes).map((n) => [n.technique.id, n.state])
      );
      expect(byId).toEqual({
        t0: "completed",
        t1: "skipped",
        t2: "current",
        t3: "skipped",
        t4: "available",
      });
      expect(zones[0].zoneProgress).toEqual({ completed: 1, total: 1 });
      expect(zones[1].zoneProgress).toEqual({ completed: 0, total: 1 });
      expect(zones[2].zoneProgress).toEqual({ completed: 0, total: 1 });
    });

    it("1 technique: collapses to a single Foundation Grove zone", () => {
      const plan = makePlan([makeTechnique({ id: "t0", order: 0 })]);
      const zones = getRoadmapZones(plan);

      expect(zones.map((z) => z.name)).toEqual(["Foundation Grove"]);
      expect(zones.map((z) => z.nodes.length)).toEqual([1]);
      expect(zones[0].nodes[0].state).toBe("current");
    });

    it("2 techniques: collapses to Foundation Grove / Application Forest", () => {
      const plan = makePlan([
        makeTechnique({ id: "t0", order: 0 }),
        makeTechnique({ id: "t1", order: 1 }),
      ]);
      const zones = getRoadmapZones(plan);

      expect(zones.map((z) => z.name)).toEqual(["Foundation Grove", "Application Forest"]);
      expect(zones.map((z) => z.nodes.length)).toEqual([1, 1]);
    });

    it("0 techniques: returns no zones", () => {
      expect(getRoadmapZones(makePlan([]))).toEqual([]);
    });

    it.each([
      [5, [2, 2, 1]],
      [7, [3, 2, 2]],
      [8, [3, 3, 2]],
    ])("uneven count %d splits into zone sizes %j, no empty zones, order preserved", (count, expectedSizes) => {
      const plan = makePlan(
        Array.from({ length: count }, (_, i) => makeTechnique({ id: `t${i}`, order: i }))
      );
      const zones = getRoadmapZones(plan);

      expect(zones.map((z) => z.nodes.length)).toEqual(expectedSizes);
      expect(zones.every((z) => z.nodes.length > 0)).toBe(true);
      expect(zones.flatMap((z) => z.nodes.map((n) => n.technique.id))).toEqual(
        Array.from({ length: count }, (_, i) => `t${i}`)
      );
    });
  });
});
