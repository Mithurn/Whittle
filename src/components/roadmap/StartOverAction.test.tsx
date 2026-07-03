import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { StartOverAction } from "./StartOverAction";
import { usePlanStore } from "@/store/plan-store";
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
    hobbyName: "Chess",
    level: "beginner",
    goal: "Get better",
    timeCommitment: "a few hours a week",
    knownTopics: [],
    summary: "A plan",
    createdAt: "2026-01-01T00:00:00.000Z",
    techniques,
  };
}

describe("StartOverAction", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlanStore.setState({ currentPlan: makePlan([makeTechnique({ id: "t0", order: 0 })]) });
  });

  it("shows only the plain 'Start over' link initially, with no confirm copy visible", () => {
    render(<StartOverAction />);
    expect(screen.getByRole("button", { name: "Start over" })).toBeInTheDocument();
    expect(screen.queryByText(/clears your whole plan/i)).not.toBeInTheDocument();
  });

  it("shows the locked confirm copy and does not clear the plan until confirmed", async () => {
    render(<StartOverAction />);
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(screen.getByText("This clears your whole plan — you'll start from scratch. Sure?")).toBeInTheDocument();
    expect(usePlanStore.getState().currentPlan).not.toBeNull();
  });

  it("cancel backs out without touching the plan", async () => {
    render(<StartOverAction />);
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText(/clears your whole plan/i)).not.toBeInTheDocument();
    expect(usePlanStore.getState().currentPlan).not.toBeNull();
  });

  it("confirming clears the plan via startOver()", async () => {
    render(<StartOverAction />);
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, start over" }));

    expect(usePlanStore.getState().currentPlan).toBeNull();
  });
});
