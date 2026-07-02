import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TypingText } from "./TypingText";

describe("TypingText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals the text progressively rather than all at once", () => {
    const { container } = render(<TypingText text="Hello!" speedMs={10} />);

    // Immediately after mount, nothing has been revealed yet.
    expect(container.textContent).toBe("");

    act(() => {
      vi.advanceTimersByTime(3 * 10);
    });
    expect(container.textContent).toBe("Hel");

    act(() => {
      vi.advanceTimersByTime(10 * 10);
    });
    expect(container.textContent).toBe("Hello!");
  });

  it("preserves per-segment styling as it types", () => {
    render(
      <TypingText
        text={[{ text: "Hey " }, { text: "Ember", className: "text-mascot-body" }]}
        speedMs={10}
      />
    );

    act(() => {
      vi.advanceTimersByTime(20 * 10);
    });

    expect(screen.getByText("Ember")).toHaveClass("text-mascot-body");
  });

  it("shows the full text immediately when prefers-reduced-motion is set", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    render(<TypingText text="Hello!" speedMs={10} />);

    expect(screen.getByText("Hello!")).toBeInTheDocument();
  });
});
