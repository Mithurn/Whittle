import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MascotWithSpeech } from "./MascotWithSpeech";

// Mascot.tsx fetches its own Lottie JSON and needs a real <canvas> context
// that jsdom doesn't provide. Surfacing the `size` prop it received lets
// tests verify the sm/md/lg -> px mapping without needing Mascot's real internals.
vi.mock("@/components/Mascot", () => ({
  Mascot: ({ size }: { size: number }) => <div data-testid="mascot" data-size={size} />,
}));

// MascotWithSpeech now loads Mascot via next/dynamic (see MascotWithSpeech.tsx
// — defers lottie-react out of the initial bundle), so it no longer appears
// on the very first synchronous render; every assertion on it needs to wait
// via find*/findAllBy* rather than getBy*/getAllBy*.
describe("MascotWithSpeech", () => {
  beforeEach(() => {
    // Force reduced motion so TypingText reveals its full text immediately.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("renders the mascot and the message", async () => {
    render(<MascotWithSpeech state="idle" message="Ready to light the first fire?" />);
    expect(await screen.findByTestId("mascot")).toBeInTheDocument();
    expect(screen.getAllByText("Ready to light the first fire?").length).toBeGreaterThan(0);
  });

  it("'inline' renders exactly one mascot and one bubble instance (no mobile/desktop duplication)", async () => {
    render(<MascotWithSpeech state="idle" message="Nice! How much do you know already?" position="inline" />);
    expect(await screen.findAllByTestId("mascot")).toHaveLength(1);
    expect(screen.getAllByText("Nice! How much do you know already?")).toHaveLength(1);
  });

  it("'top' and 'right' render exactly one mascot and one bubble instance, in a single flex row (no absolute-positioned float)", async () => {
    for (const position of ["top", "right"] as const) {
      const { unmount } = render(
        <MascotWithSpeech state="error" message="Couldn't put your plan together" position={position} />
      );
      expect(await screen.findAllByTestId("mascot")).toHaveLength(1);
      expect(screen.getAllByText("Couldn't put your plan together")).toHaveLength(1);
      unmount();
    }
  });

  it.each([
    ["sm", "56"],
    ["md", "220"],
    ["lg", "320"],
  ] as const)("maps size %s to %spx on the mascot", async (size, expectedPx) => {
    render(<MascotWithSpeech state="idle" message="hi" size={size} />);
    expect(await screen.findByTestId("mascot")).toHaveAttribute("data-size", expectedPx);
  });

  it("defaults to size md when no size is given", async () => {
    render(<MascotWithSpeech state="idle" message="hi" />);
    expect(await screen.findByTestId("mascot")).toHaveAttribute("data-size", "220");
  });
});
