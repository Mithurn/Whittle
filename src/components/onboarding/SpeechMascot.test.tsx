import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpeechMascot } from "./SpeechMascot";

// lottie-react needs a real <canvas> context, which jsdom doesn't provide —
// a lightweight stand-in is enough to assert render order.
vi.mock("@/components/Mascot", () => ({
  Mascot: () => <div data-testid="mascot" />,
}));

describe("SpeechMascot", () => {
  beforeEach(() => {
    // Force reduced motion so the typed speech text is present immediately,
    // rather than racing TypingText's character-reveal interval.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("renders a mascot before its speech bubble in the DOM, for both the mobile and desktop layouts", () => {
    render(<SpeechMascot state="idle" speech="Hello!" />);

    const [mascot] = screen.getAllByTestId("mascot");
    const [speechText] = screen.getAllByText("Hello!");

    // DOCUMENT_POSITION_FOLLOWING means speechText comes after mascot in the DOM.
    expect(mascot.compareDocumentPosition(speechText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
