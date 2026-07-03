import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SkippedTechniquesList } from "./SkippedTechniquesList";
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

describe("SkippedTechniquesList", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders nothing when no technique has been skipped", () => {
    const plan = makePlan([makeTechnique({ id: "t0", order: 0, status: "not_started" })]);
    usePlanStore.setState({ currentPlan: plan });
    const { container } = render(<SkippedTechniquesList plan={plan} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("collapses behind a compact 'N skipped' toggle by default — this renders inside a fixed-position rail that can't scroll to reach an overflowing list", () => {
    const plan = makePlan([
      makeTechnique({ id: "t0", order: 0, status: "skipped", name: "Forking" }),
      makeTechnique({ id: "t1", order: 1, status: "skipped", name: "Pinning" }),
    ]);
    usePlanStore.setState({ currentPlan: plan });
    render(<SkippedTechniquesList plan={plan} />);

    expect(screen.getByRole("button", { name: /2 skipped/ })).toBeInTheDocument();
    expect(screen.queryByText("Forking")).not.toBeInTheDocument();
    expect(screen.queryByText("Pinning")).not.toBeInTheDocument();
  });

  it("expands to list every skipped technique by name when the toggle is used", async () => {
    const plan = makePlan([
      makeTechnique({ id: "t0", order: 0, status: "skipped", name: "Forking" }),
      makeTechnique({ id: "t1", order: 1, status: "not_started" }),
      makeTechnique({ id: "t2", order: 2, status: "skipped", name: "Pinning" }),
    ]);
    usePlanStore.setState({ currentPlan: plan });
    render(<SkippedTechniquesList plan={plan} />);

    await userEvent.click(screen.getByRole("button", { name: /skipped/ }));

    expect(screen.getByText("Forking")).toBeInTheDocument();
    expect(screen.getByText("Pinning")).toBeInTheDocument();
    expect(screen.queryByText(`Technique t1`)).not.toBeInTheDocument();
  });

  it("'Bring back' sets the technique back to not_started", async () => {
    const plan = makePlan([makeTechnique({ id: "t0", order: 0, status: "skipped", name: "Forking" })]);
    usePlanStore.setState({ currentPlan: plan });
    render(<SkippedTechniquesList plan={plan} />);

    await userEvent.click(screen.getByRole("button", { name: /skipped/ }));
    await userEvent.click(screen.getByRole("button", { name: "Bring back" }));

    expect(usePlanStore.getState().currentPlan?.techniques[0].status).toBe("not_started");
  });
});
