import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimeCommitmentScreen } from "./TimeCommitmentScreen";

vi.mock("@/components/Mascot", () => ({
  Mascot: () => null,
}));

describe("TimeCommitmentScreen", () => {
  it("auto-advances with the selected preset shortly after a tap, with no Continue button", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<TimeCommitmentScreen initialValue="" onNext={onNext} onBack={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();

    const option = screen.getByRole("radio", { name: /30 mins a day/i });
    expect(option).toHaveAttribute("aria-checked", "false");

    await user.click(option);
    expect(option).toHaveAttribute("aria-checked", "true");
    expect(onNext).not.toHaveBeenCalled();

    await waitFor(() => expect(onNext).toHaveBeenCalledWith("30 mins a day"));
  });

  it("pre-selects the initial value when it matches a preset", () => {
    render(<TimeCommitmentScreen initialValue="Weekends only" onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /weekends only/i })).toHaveAttribute("aria-checked", "true");
  });
});
