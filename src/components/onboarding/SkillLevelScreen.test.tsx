import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SkillLevelScreen } from "./SkillLevelScreen";

vi.mock("@/components/Mascot", () => ({
  Mascot: () => null,
}));

describe("SkillLevelScreen", () => {
  it("auto-advances with the selected level shortly after a tap, with no Continue button", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<SkillLevelScreen onNext={onNext} onBack={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();

    const intermediateCard = screen.getByRole("radio", { name: /intermediate/i });
    expect(intermediateCard).toHaveAttribute("aria-checked", "false");

    await user.click(intermediateCard);
    expect(intermediateCard).toHaveAttribute("aria-checked", "true");
    expect(onNext).not.toHaveBeenCalled();

    await waitFor(() => expect(onNext).toHaveBeenCalledWith("intermediate"));
  });

  it("pre-selects the initial value when provided", () => {
    render(<SkillLevelScreen initialValue="advanced" onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /advanced/i })).toHaveAttribute("aria-checked", "true");
  });
});
