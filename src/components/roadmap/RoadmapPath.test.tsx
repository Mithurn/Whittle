import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoadmapPath } from "./RoadmapPath";
import type { HobbyPlan, Technique } from "@/types/domain";

// lottie-react needs a real <canvas> context, which jsdom doesn't provide.
vi.mock("lottie-react", () => ({
  default: () => <div data-testid="lottie" />,
}));

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

describe("RoadmapPath", () => {
  it("renders every technique as a clickable node, and one zone header per visual-only zone", () => {
    const plan = makePlan(
      Array.from({ length: 6 }, (_, i) => makeTechnique({ id: `t${i}`, order: i }))
    );
    render(<RoadmapPath plan={plan} isMobile={false} onNodeClick={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getByText("Foundation Grove")).toBeInTheDocument();
    expect(screen.getByText("Application Forest")).toBeInTheDocument();
    expect(screen.getByText("Mastery Peak")).toBeInTheDocument();
  });

  it("shows each zone's real computed progress, not a placeholder", () => {
    const plan = makePlan([
      makeTechnique({ id: "t0", order: 0, status: "mastered" }),
      makeTechnique({ id: "t1", order: 1, status: "not_started" }),
    ]);
    render(<RoadmapPath plan={plan} isMobile={false} onNodeClick={vi.fn()} />);

    // 2 techniques -> single-zone-of-1 x2 (Foundation Grove / Application Forest)
    expect(screen.getByText("1/1 mastered")).toBeInTheDocument();
  });

  it("calls onNodeClick with the technique id when a node is tapped", async () => {
    const plan = makePlan([makeTechnique({ id: "t0", order: 0 })]);
    const onNodeClick = vi.fn();
    render(<RoadmapPath plan={plan} isMobile={false} onNodeClick={onNodeClick} />);

    await userEvent.click(screen.getByRole("button"));
    expect(onNodeClick).toHaveBeenCalledWith("t0");
  });

  it("keeps skipped techniques inline on the path rather than excluding them", () => {
    const plan = makePlan([
      makeTechnique({ id: "t0", order: 0, status: "not_started" }),
      makeTechnique({ id: "t1", order: 1, status: "skipped" }),
    ]);
    render(<RoadmapPath plan={plan} isMobile={false} onNodeClick={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /skipped, tap to revisit/i })).toBeInTheDocument();
  });

  it("keeps the path fully continuous across zone boundaries — one connector for every adjacent pair, including the last node of one zone into the first node of the next", () => {
    const plan = makePlan(
      Array.from({ length: 7 }, (_, i) => makeTechnique({ id: `t${i}`, order: i }))
    );
    const { container } = render(<RoadmapPath plan={plan} isMobile={false} onNodeClick={vi.fn()} />);

    // 7 techniques -> zones of [3,2,2], but the path itself should still be
    // N-1 = 6 connectors total, not 4 (which is what you'd get if the two
    // zone boundaries were missing a connector).
    expect(container.querySelectorAll('[data-testid="path-connector"]')).toHaveLength(6);
  });

  it("centers every zone's first node under its header — position resets per zone, not a running global index", () => {
    const plan = makePlan(
      Array.from({ length: 6 }, (_, i) => makeTechnique({ id: `t${i}`, order: i }))
    );
    render(<RoadmapPath plan={plan} isMobile={false} onNodeClick={vi.fn()} />);

    // 6 techniques -> zones of [2,2,2]. Global index 2 (Application
    // Forest's first node) would sit at the zig-zag's peak if position
    // were a running index instead of resetting per zone — it must be 0.
    // The translateX lives on the button's direct parent wrapper.
    const secondZoneFirstNode = screen.getByRole("button", { name: /Technique t2/ });
    expect(secondZoneFirstNode.parentElement?.style.transform).toBe("translateX(0px)");

    const thirdZoneFirstNode = screen.getByRole("button", { name: /Technique t4/ });
    expect(thirdZoneFirstNode.parentElement?.style.transform).toBe("translateX(0px)");
  });
});
