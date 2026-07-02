import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingFlow } from "./OnboardingFlow";
import { usePlanStore } from "@/store/plan-store";
import type { HobbyPlan } from "@/types/domain";

vi.mock("@/components/Mascot", () => ({
  Mascot: () => null,
}));

const FAKE_PLAN: HobbyPlan = {
  id: "plan-1",
  hobbyName: "Chess",
  level: "beginner",
  goal: "Beat my dad at chess",
  timeCommitment: "A few hours a week",
  knownTopics: [],
  summary: "A plan for chess.",
  createdAt: "2026-01-01T00:00:00.000Z",
  techniques: [],
};

async function completeOnboardingUpToSubmit(user: ReturnType<typeof userEvent.setup>) {
  render(<OnboardingFlow />);

  await user.click(screen.getByRole("button", { name: "Get Started" }));
  await user.type(screen.getByRole("textbox"), "Chess");
  await user.click(screen.getByRole("button", { name: "Continue" }));

  await user.click(screen.getByRole("radio", { name: /beginner/i }));
  await user.click(screen.getByRole("button", { name: "Continue" }));

  await user.type(screen.getByRole("textbox"), "Beat my dad at chess");
  await user.click(screen.getByRole("button", { name: "Continue" }));

  // Selecting the last field submits the plan directly — there's no
  // separate known-topics step anymore.
  await user.click(screen.getByRole("radio", { name: /a few hours a week/i }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

describe("OnboardingFlow", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlanStore.setState({ currentPlan: null });
  });

  it("submits the collected answers and stores the returned plan on success", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FAKE_PLAN,
    }) as unknown as typeof fetch;

    await completeOnboardingUpToSubmit(user);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/generate-plan",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          hobbyName: "Chess",
          level: "beginner",
          goal: "Beat my dad at chess",
          timeCommitment: "A few hours a week",
          knownTopics: [],
        }),
      })
    );
    expect(usePlanStore.getState().currentPlan).toEqual(FAKE_PLAN);
  });

  it("shows the error screen on failure, and retries the same request", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502 }) as unknown as typeof fetch;

    await completeOnboardingUpToSubmit(user);

    await screen.findAllByText(/couldn't put your plan together/i);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
