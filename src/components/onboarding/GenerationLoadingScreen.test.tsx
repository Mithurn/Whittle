import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GenerationLoadingScreen } from "./GenerationLoadingScreen";
import type { GeneratePlanRequest } from "@/lib/schemas";

const mascotMock = vi.fn();
vi.mock("@/components/Mascot", () => ({
  Mascot: (props: { state: string }) => {
    mascotMock(props);
    return null;
  },
}));

const REQUEST: GeneratePlanRequest = {
  hobbyName: "Chess",
  level: "advanced",
  goal: "Beat my dad at chess",
  timeCommitment: "A few hours a week",
  knownTopics: [],
};

describe("GenerationLoadingScreen", () => {
  beforeEach(() => {
    // Force reduced motion so each typed message is present immediately.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the mascot in its thinking state", async () => {
    render(<GenerationLoadingScreen request={REQUEST} />);
    // Mascot now loads via next/dynamic (see GenerationLoadingScreen.tsx),
    // so the mock isn't called on the very first synchronous render.
    await waitFor(() => expect(mascotMock).toHaveBeenCalledWith(expect.objectContaining({ state: "thinking" })));
  });

  it("personalizes the first message with the hobby, and gets the a/an article right for the skill level", () => {
    render(<GenerationLoadingScreen request={REQUEST} />);
    expect(screen.getByText("Mapping out a plan for Chess...")).toBeInTheDocument();
  });

  it("rotates to the next personalized message over time", () => {
    vi.useFakeTimers();
    try {
      render(<GenerationLoadingScreen request={REQUEST} />);
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(screen.getByText("Finding the right first steps for an advanced...")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
