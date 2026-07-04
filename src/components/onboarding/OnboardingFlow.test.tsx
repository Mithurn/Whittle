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

  // Skill level and time commitment auto-advance on selection — no Continue
  // button to click. The next screen mounts ~180ms after the tap, so the
  // following interaction waits for it via findByRole instead of getByRole.
  await user.click(screen.getByRole("radio", { name: /beginner/i }));

  await user.type(await screen.findByRole("textbox"), "Beat my dad at chess");
  await user.click(screen.getByRole("button", { name: "Continue" }));

  await user.click(screen.getByRole("radio", { name: /a few hours a week/i }));

  // Known topics is optional — Continue with nothing typed submits an
  // empty list, matching the "should feel skippable" requirement.
  await user.click(await screen.findByRole("button", { name: "Continue" }));
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

  it("includes typed known topics in the submitted request", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FAKE_PLAN,
    }) as unknown as typeof fetch;

    render(<OnboardingFlow />);
    await user.click(screen.getByRole("button", { name: "Get Started" }));
    await user.type(screen.getByRole("textbox"), "Chess");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: /beginner/i }));
    await user.type(await screen.findByRole("textbox"), "Beat my dad at chess");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: /a few hours a week/i }));

    await user.type(await screen.findByRole("textbox", { name: /add a topic/i }), "castling{enter}en passant{enter}");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/generate-plan",
      expect.objectContaining({
        body: JSON.stringify({
          hobbyName: "Chess",
          level: "beginner",
          goal: "Beat my dad at chess",
          timeCommitment: "A few hours a week",
          knownTopics: ["castling", "en passant"],
        }),
      })
    );
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
