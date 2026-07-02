import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GenerationErrorScreen } from "./GenerationErrorScreen";

vi.mock("@/components/Mascot", () => ({
  Mascot: () => null,
}));

describe("GenerationErrorScreen", () => {
  beforeEach(() => {
    // Force reduced motion so the typed message is present immediately.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("shows the retry message and calls onRetry when pressed", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<GenerationErrorScreen onRetry={onRetry} />);

    expect(screen.getAllByText(/couldn't put your plan together/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
