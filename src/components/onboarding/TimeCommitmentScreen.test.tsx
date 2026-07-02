import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimeCommitmentScreen } from "./TimeCommitmentScreen";

vi.mock("@/components/Mascot", () => ({
  Mascot: () => null,
}));

describe("TimeCommitmentScreen", () => {
  it("enables Continue once a preset is selected and calls onNext with it", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<TimeCommitmentScreen initialValue="" onNext={onNext} onBack={vi.fn()} />);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    const option = screen.getByRole("radio", { name: /30 mins a day/i });
    expect(option).toHaveAttribute("aria-checked", "false");

    await user.click(option);
    expect(option).toHaveAttribute("aria-checked", "true");
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);
    expect(onNext).toHaveBeenCalledWith("30 mins a day");
  });

  it("pre-selects the initial value when it matches a preset", () => {
    render(<TimeCommitmentScreen initialValue="Weekends only" onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /weekends only/i })).toHaveAttribute("aria-checked", "true");
  });
});
