import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MascotCompanion } from "./MascotCompanion";
import type { HobbyPlan, Technique } from "@/types/domain";

// Mascot.tsx fetches its own Lottie JSON and needs a real <canvas> context
// that jsdom doesn't provide.
vi.mock("@/components/Mascot", () => ({
  Mascot: () => <div data-testid="mascot" />,
}));

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

describe("MascotCompanion", () => {
  beforeEach(() => {
    // Force reduced motion so TypingText reveals its full text immediately
    // instead of racing its character-reveal interval.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("shows the real computed mastered/total (label) and percentage (react-aria's valueText), never a placeholder", () => {
    const plan = makePlan([
      makeTechnique({ id: "t0", order: 0, status: "mastered" }),
      makeTechnique({ id: "t1", order: 1, status: "not_started" }),
    ]);
    render(<MascotCompanion plan={plan} />);
    expect(screen.getAllByText("1/2 mastered").length).toBeGreaterThan(0);
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
  });

  it("shows the not-started prompt when nothing is mastered yet", () => {
    const plan = makePlan([makeTechnique({ id: "t0", order: 0 })]);
    render(<MascotCompanion plan={plan} />);
    expect(
      screen.getAllByText("Ready to light the first fire for Chess? Let's take it one simple step at a time.").length
    ).toBeGreaterThan(0);
  });

  it("shows the all-mastered message once everything is complete", () => {
    const plan = makePlan([makeTechnique({ id: "t0", order: 0, status: "mastered" })]);
    render(<MascotCompanion plan={plan} />);
    expect(
      screen.getAllByText("The whole trail is glowing! You’ve officially mastered Chess.").length
    ).toBeGreaterThan(0);
  });

  it("shows the all-skipped message, matching the locked wording for this empty state", () => {
    const plan = makePlan([makeTechnique({ id: "t0", order: 0, status: "skipped" })]);
    render(<MascotCompanion plan={plan} />);
    expect(
      screen.getAllByText("You've skipped everything in this plan — want to start fresh?").length
    ).toBeGreaterThan(0);
  });

  it("shows the celebration copy when celebrating", () => {
    const plan = makePlan([makeTechnique({ id: "t0", order: 0 })]);
    render(<MascotCompanion plan={plan} celebrating />);
    expect(screen.getAllByText("Boom! Just mastered a Chess technique. Keep it up!").length).toBeGreaterThan(0);
  });
});
