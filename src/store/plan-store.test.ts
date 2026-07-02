import { beforeEach, describe, expect, it } from "vitest";
import {
  usePlanStore,
  getProgress,
  getVisibleTechniques,
  getSkippedTechniques,
} from "./plan-store";
import type { HobbyPlan, Technique } from "@/types/domain";

function makeTechnique(overrides: Partial<Technique> & Pick<Technique, "id" | "order">): Technique {
  return {
    name: `Technique ${overrides.id}`,
    description: "desc",
    rationale: "rationale",
    resources: [],
    status: "not_started",
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

  it("updateTechniqueNotes updates only the targeted technique's notes", () => {
    const plan = makePlan([
      makeTechnique({ id: "t1", order: 0 }),
      makeTechnique({ id: "t2", order: 1 }),
    ]);
    usePlanStore.getState().setPlan(plan);
    usePlanStore.getState().updateTechniqueNotes("t1", "felt good today");

    const techniques = usePlanStore.getState().currentPlan?.techniques;
    expect(techniques?.find((t) => t.id === "t1")?.notes).toBe("felt good today");
    expect(techniques?.find((t) => t.id === "t2")?.notes).toBeUndefined();
  });

  it("startOver discards the current plan", () => {
    usePlanStore.getState().setPlan(makePlan([makeTechnique({ id: "t1", order: 0 })]));
    usePlanStore.getState().startOver();
    expect(usePlanStore.getState().currentPlan).toBeNull();
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
});
