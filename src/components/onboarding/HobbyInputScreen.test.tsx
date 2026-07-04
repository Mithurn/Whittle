import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { HobbyInputScreen } from "./HobbyInputScreen";

// lottie-react needs a real <canvas> context, which jsdom doesn't provide —
// the mascot's animation is irrelevant to this screen's own behavior.
vi.mock("@/components/Mascot", () => ({
  Mascot: () => null,
}));

describe("HobbyInputScreen", () => {
  it("rotates the input placeholder through example hobbies over time", () => {
    vi.useFakeTimers();
    try {
      render(<HobbyInputScreen initialValue="" onNext={vi.fn()} onBack={vi.fn()} />);

      const input = screen.getByRole("textbox");
      const firstPlaceholder = input.getAttribute("placeholder");

      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(input.getAttribute("placeholder")).not.toBe(firstPlaceholder);
    } finally {
      vi.useRealTimers();
    }
  });

  it("enables Continue once a value is typed and calls onNext with it", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<HobbyInputScreen initialValue="" onNext={onNext} onBack={vi.fn()} />);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "Chess");

    expect(continueButton).toBeEnabled();
    await user.click(continueButton);
    expect(onNext).toHaveBeenCalledWith("Chess");
  });

  it("keeps Continue disabled and shows an inline warning for keyboard-mash input", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<HobbyInputScreen initialValue="" onNext={onNext} onBack={vi.fn()} />);

    await user.type(screen.getByRole("textbox"), "asdkjqwe123!!!");

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByText(/doesn't look like a hobby/i)).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });
});
