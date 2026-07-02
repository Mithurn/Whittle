import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GoalScreen } from "./GoalScreen";

vi.mock("@/components/Mascot", () => ({
  Mascot: () => null,
}));

describe("GoalScreen", () => {
  it("enables Continue once a value is typed and calls onNext with it", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<GoalScreen initialValue="" hobbyName="Chess" onNext={onNext} onBack={vi.fn()} />);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "Beat my dad at chess");

    expect(continueButton).toBeEnabled();
    await user.click(continueButton);
    expect(onNext).toHaveBeenCalledWith("Beat my dad at chess");
  });

  it("personalizes the placeholder with the user's actual hobby", () => {
    render(<GoalScreen initialValue="" hobbyName="Watercolour" onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByPlaceholderText("e.g. get really good at Watercolour")).toBeInTheDocument();
  });
});
