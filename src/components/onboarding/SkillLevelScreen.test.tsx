import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SkillLevelScreen } from "./SkillLevelScreen";

vi.mock("@/components/Mascot", () => ({
  Mascot: () => null,
}));

describe("SkillLevelScreen", () => {
  it("enables Continue once a level is selected and calls onNext with it", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<SkillLevelScreen onNext={onNext} onBack={vi.fn()} />);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    const intermediateCard = screen.getByRole("radio", { name: /intermediate/i });
    expect(intermediateCard).toHaveAttribute("aria-checked", "false");

    await user.click(intermediateCard);
    expect(intermediateCard).toHaveAttribute("aria-checked", "true");
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);
    expect(onNext).toHaveBeenCalledWith("intermediate");
  });

  it("pre-selects the initial value when provided", () => {
    render(<SkillLevelScreen initialValue="advanced" onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /advanced/i })).toHaveAttribute("aria-checked", "true");
  });
});
