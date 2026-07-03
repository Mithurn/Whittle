import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("shows the technique name, description, and each resource's title/source/why-chosen on desktop", () => {
    render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Forking")).toBeInTheDocument();
    expect(screen.getByText("A tactic that attacks two pieces at once.")).toBeInTheDocument();
    expect(screen.getByText("Mastering the Fork")).toBeInTheDocument();
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(screen.getByText("Grandmaster analysis of double attacks.")).toBeInTheDocument();
    expect(screen.getByText("The Pin Theory")).toBeInTheDocument();
  });

  it("links a non-embeddable resource directly to its real URL, opened in a new tab", () => {
    render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
    const link = screen.getByText("The Pin Theory").closest("a");
    expect(link).toHaveAttribute("href", "https://chess.com/pin-theory");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("embeds a YouTube resource natively instead of linking out", () => {
    render(<TechniqueModal technique={technique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.getByText("Mastering the Fork").closest("a")).not.toBeInTheDocument();
    const iframe = screen.getByTitle("Mastering the Fork");
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute("src", "https://www.youtube.com/embed/abc");
  });

  it("falls back to an external link when a video-typed resource isn't actually a YouTube URL", () => {
    const nonYouTubeVideoTechnique: Technique = {
      ...technique,
      resources: [
        {
          id: "r2",
          type: "video",
          title: "Some Other Video Host",
          url: "https://vimeo.com/12345",
          sourceName: "Vimeo",
          whyChosen: "x",
        },
      ],
    };
    render(
      <TechniqueModal technique={nonYouTubeVideoTechnique} isMobile={false} onClose={vi.fn()} onMastered={vi.fn()} />
    );
    const link = screen.getByText("Some Other Video Host").closest("a");
    expect(link).toHaveAttribute("href", "https://vimeo.com/12345");
  });

  it("marks the technique mastered, closes, and fires onMastered when the primary CTA is used", async () => {
    const onClose = vi.fn();
    const onMastered = vi.fn();
    render(<TechniqueModal technique={technique} isMobile={false} onClose={onClose} onMastered={onMastered} />);

    await userEvent.click(screen.getByRole("button", { name: /mark as mastered/i }));

    expect(usePlanStore.getState().currentPlan?.techniques[0].status).toBe("mastered");
    expect(onClose).toHaveBeenCalled();
    expect(onMastered).toHaveBeenCalled();
  });

  it("marks the technique skipped, closes, and does NOT fire onMastered when skip is used", async () => {
    const onClose = vi.fn();
    const onMastered = vi.fn();
    render(<TechniqueModal technique={technique} isMobile={false} onClose={onClose} onMastered={onMastered} />);

    await userEvent.click(screen.getByRole("button", { name: /skip this technique/i }));

    expect(usePlanStore.getState().currentPlan?.techniques[0].status).toBe("skipped");
    expect(onClose).toHaveBeenCalled();
    expect(onMastered).not.toHaveBeenCalled();
  });

  it("renders as a plain sheet on mobile — no mascot or speech bubble, just the drawer content", () => {
    render(<TechniqueModal technique={technique} isMobile onClose={vi.fn()} onMastered={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Forking")).toBeInTheDocument();
    expect(screen.queryByTestId("mascot")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Forks and pins are the bread and butter of any master's toolkit.")
    ).not.toBeInTheDocument();
  });
});
