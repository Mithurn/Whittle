import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TechniqueModal } from "./TechniqueModal";
import { usePlanStore } from "@/store/plan-store";
import type { HobbyPlan, Technique } from "@/types/domain";

const technique: Technique = {
  id: "t0",
  name: "Forking",
  description: "A tactic that attacks two pieces at once.",
  rationale: "Forks and pins are the bread and butter of any master's toolkit.",
  resources: [
    {
      id: "r0",
      type: "video",
      title: "Mastering the Fork",
      url: "https://youtube.com/watch?v=abc",
      sourceName: "YouTube",
      whyChosen: "Grandmaster analysis of double attacks.",
    },
    {
      id: "r1",
      type: "reading",
      title: "The Pin Theory",
      url: "https://chess.com/pin-theory",
      sourceName: "Chess.com",
      whyChosen: "Visual breakdown of alignment tactics.",
    },
    {
      id: "r2",
      type: "audio",
      title: "Tactics Podcast Ep. 3",
      url: "https://podcasts.example.com/ep3",
      sourceName: "Example Podcasts",
      whyChosen: "Discusses forks in a real-game context.",
    },
  ],
  status: "not_started",
  order: 0,
};

function makePlan(techniques: Technique[]): HobbyPlan {
  return {
    id: "plan-1",
    hobbyName: "Chess",
    level: "beginner",
    goal: "Get better",
    timeCommitment: "a few hours a week",
    knownTopics: [],
    summary: "A plan",
    createdAt: "2026-01-01T00:00:00.000Z",
    techniques,
  };
}

describe("TechniqueModal", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
  });

  it("renders nothing when no technique is selected", () => {
    render(<TechniqueModal technique={null} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the technique name and description in the header", () => {
    render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Forking")).toBeInTheDocument();
    expect(screen.getByText("A tactic that attacks two pieces at once.")).toBeInTheDocument();
  });

  it("defaults to the Video tab and embeds the YouTube resource natively", () => {
    render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /video/i })).toHaveAttribute("aria-selected", "true");
    const iframe = screen.getByTitle("Mastering the Fork");
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute("src", "https://www.youtube.com/embed/abc");
  });

  it("shows all four tabs when the technique has video, reading, and audio resources", () => {
    render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /video/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /reading/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /audio/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /master/i })).toBeInTheDocument();
  });

  it("puts a video-typed resource that isn't actually YouTube in the Audio tab instead of Video", async () => {
    const user = userEvent.setup();
    const mixedTechnique: Technique = {
      ...technique,
      resources: [
        { id: "rx", type: "video", title: "Some Other Host", url: "https://vimeo.com/12345", sourceName: "Vimeo", whyChosen: "x" },
      ],
    };
    render(<TechniqueModal technique={mixedTechnique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.queryByRole("tab", { name: /video/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /audio/i }));
    const link = screen.getByText("Some Other Host").closest("a");
    expect(link).toHaveAttribute("href", "https://vimeo.com/12345");
  });

  it("puts an audio-typed resource that actually resolves to YouTube in the Video tab", () => {
    const youtubeAudioTechnique: Technique = {
      ...technique,
      resources: [
        { id: "ry", type: "audio", title: "Podcast (actually YouTube)", url: "https://youtube.com/watch?v=xyz", sourceName: "YouTube", whyChosen: "x" },
      ],
    };
    render(<TechniqueModal technique={youtubeAudioTechnique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.queryByRole("tab", { name: /audio/i })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /video/i })).toBeInTheDocument();
    expect(screen.getByTitle("Podcast (actually YouTube)")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/xyz"
    );
  });

  describe("Reading tab", () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("auto-fetches and renders the article as soon as the tab is opened, no extra click", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: "# The Pin\n\nA real pinned piece can't move." }),
      }) as unknown as typeof fetch;

      const user = userEvent.setup();
      render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
      await user.click(screen.getByRole("tab", { name: /reading/i }));

      expect(await screen.findByText("A real pinned piece can't move.")).toBeInTheDocument();
    });

    it("falls back to a clickable external-link card when the fetch fails, without popping a new tab automatically", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      const user = userEvent.setup();
      render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
      await user.click(screen.getByRole("tab", { name: /reading/i }));

      const link = await screen.findByText(/couldn't load this article in-app/i);
      expect(link.closest("a")).toHaveAttribute("href", "https://chess.com/pin-theory");
      expect(openSpy).not.toHaveBeenCalled();

      openSpy.mockRestore();
    });
  });

  describe("Master tab", () => {
    it("shows the rationale and both actions", async () => {
      const user = userEvent.setup();
      render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
      await user.click(screen.getByRole("tab", { name: /master/i }));

      expect(screen.getByText("Forks and pins are the bread and butter of any master's toolkit.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /mark as mastered/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /skip this technique/i })).toBeInTheDocument();
    });

    it("marks the technique mastered, closes, and fires onMastered", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onMastered = vi.fn();
      render(<TechniqueModal technique={technique} isMobile={false} onClose={onClose} onMastered={onMastered} />);

      await user.click(screen.getByRole("tab", { name: /master/i }));
      await user.click(screen.getByRole("button", { name: /mark as mastered/i }));

      expect(usePlanStore.getState().currentPlan?.techniques[0].status).toBe("mastered");
      expect(onClose).toHaveBeenCalled();
      expect(onMastered).toHaveBeenCalled();
    });

    it("marks the technique skipped, closes, and does NOT fire onMastered", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onMastered = vi.fn();
      render(<TechniqueModal technique={technique} isMobile={false} onClose={onClose} onMastered={onMastered} />);

      await user.click(screen.getByRole("tab", { name: /master/i }));
      await user.click(screen.getByRole("button", { name: /skip this technique/i }));

      expect(usePlanStore.getState().currentPlan?.techniques[0].status).toBe("skipped");
      expect(onClose).toHaveBeenCalled();
      expect(onMastered).not.toHaveBeenCalled();
    });
  });

  describe("Notes panel", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("opens on click, and autosaves typed notes (debounced) via updateTechniqueNotes", async () => {
      const user = userEvent.setup();
      render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /open my learning notes/i }));
      const textarea = screen.getByPlaceholderText(/jot down anything/i);
      await user.type(textarea, "Remember to check for forks after every trade.");

      vi.advanceTimersByTime(500);

      expect(usePlanStore.getState().currentPlan?.techniques[0].notes).toBe(
        "Remember to check for forks after every trade."
      );
    });

    it("closes via the close button", async () => {
      const user = userEvent.setup();
      render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /open my learning notes/i }));
      expect(screen.getByPlaceholderText(/jot down anything/i)).toHaveAttribute("tabIndex", "0");

      await user.click(screen.getByRole("button", { name: /close notes/i }));
      expect(screen.getByPlaceholderText(/jot down anything/i)).toHaveAttribute("tabIndex", "-1");
    });
  });

  it("renders as a plain sheet on mobile — no mascot or speech bubble, just the drawer content", () => {
    render(<TechniqueModal technique={technique} isMobile onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Forking")).toBeInTheDocument();
    expect(screen.queryByTestId("mascot")).not.toBeInTheDocument();
  });
});
