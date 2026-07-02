import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpeechBubble } from "./SpeechBubble";

describe("SpeechBubble", () => {
  beforeEach(() => {
    // Force reduced motion so TypingText reveals its full text immediately
    // instead of racing its character-reveal interval.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("renders the given text", () => {
    render(<SpeechBubble text="Ready to light the first fire?" />);
    expect(screen.getByText("Ready to light the first fire?")).toBeInTheDocument();
  });

  it("renders plain text (no typing effect) when animate is false", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    render(<SpeechBubble text="Plain and immediate" animate={false} />);
    expect(screen.getByText("Plain and immediate")).toBeInTheDocument();
  });

  it("shows the tail by default", () => {
    const { container } = render(<SpeechBubble text="hi" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("hides the tail when showTail is false", () => {
    const { container } = render(<SpeechBubble text="hi" showTail={false} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
