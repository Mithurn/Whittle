import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KnownTopicsScreen } from "./KnownTopicsScreen";
import { KNOWN_TOPICS_MAX_COUNT } from "@/lib/schemas";

vi.mock("@/components/Mascot", () => ({
  Mascot: () => null,
}));

describe("KnownTopicsScreen", () => {
  it("is skippable — Continue works with zero topics", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<KnownTopicsScreen initialValue={[]} onNext={onNext} onBack={vi.fn()} />);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);
    expect(onNext).toHaveBeenCalledWith([]);
  });

  it("commits a chip on Enter and removes it on click", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<KnownTopicsScreen initialValue={[]} onNext={onNext} onBack={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: /add a topic/i }), "castling{enter}");
    expect(screen.getByText("castling")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove castling" }));
    expect(screen.queryByText("castling")).not.toBeInTheDocument();
  });

  it("commits any text still in the field when Continue is pressed", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<KnownTopicsScreen initialValue={[]} onNext={onNext} onBack={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: /add a topic/i }), "en passant");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onNext).toHaveBeenCalledWith(["en passant"]);
  });

  it("silently ignores a case-insensitive duplicate", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<KnownTopicsScreen initialValue={["Castling"]} onNext={onNext} onBack={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: /add a topic/i }), "castling{enter}");
    expect(screen.getAllByText(/castling/i)).toHaveLength(1);
  });

  it("stops accepting new topics once the cap is reached", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const maxedOut = Array.from({ length: KNOWN_TOPICS_MAX_COUNT }, (_, i) => `topic-${i}`);
    render(<KnownTopicsScreen initialValue={maxedOut} onNext={onNext} onBack={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: /add a topic/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onNext).toHaveBeenCalledWith(maxedOut);
  });
});
