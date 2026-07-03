import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TechniquePage from "./page";
import { usePlanStore } from "@/store/plan-store";
import type { HobbyPlan, Technique } from "@/types/domain";

const pushMock = vi.fn();
let currentParamId = "t0";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: currentParamId }),
}));

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
  notes: [],
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

describe("TechniquePage", () => {
  beforeEach(() => {
    localStorage.clear();
    pushMock.mockClear();
    currentParamId = "t0";
    usePlanStore.setState({ currentPlan: null, celebratingTechniqueId: null });
  });

  it("shows a 'no plan found' fallback when there's no current plan", async () => {
    render(<TechniquePage />);
    expect(await screen.findByText("No plan found.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to your roadmap/i })).toHaveAttribute("href", "/");
  });

  it("shows a 'couldn't find that technique' fallback when the id doesn't match any technique", async () => {
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    currentParamId = "does-not-exist";
    render(<TechniquePage />);
    expect(await screen.findByText("We couldn't find that technique.")).toBeInTheDocument();
  });

  it("defaults to the Video tab and embeds the YouTube resource", async () => {
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);
    expect(await screen.findByRole("tab", { name: /video/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTitle("Mastering the Fork")).toHaveAttribute("src", "https://www.youtube.com/embed/abc");
  });

  it("switches tabs on click and auto-fetches the article for Reading", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: "The pin theory explained." }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await user.click(await screen.findByRole("tab", { name: /reading/i }));
    expect(await screen.findByText("The pin theory explained.")).toBeInTheDocument();
  });

  it("marks the technique mastered, triggers celebration, and navigates back to the roadmap", async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await user.click(await screen.findByRole("tab", { name: /master/i }));
    await user.click(screen.getByRole("button", { name: /mark as mastered/i }));

    expect(usePlanStore.getState().currentPlan?.techniques[0].status).toBe("mastered");
    expect(usePlanStore.getState().celebratingTechniqueId).toBe("t0");
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("marks the technique skipped and navigates back without triggering celebration", async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await user.click(await screen.findByRole("tab", { name: /master/i }));
    await user.click(screen.getByRole("button", { name: /skip this technique/i }));

    expect(usePlanStore.getState().currentPlan?.techniques[0].status).toBe("skipped");
    expect(usePlanStore.getState().celebratingTechniqueId).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("opens the notes drawer and adds a structured note", async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await user.click(await screen.findByRole("button", { name: /^notes/i }));
    await user.click(screen.getByRole("button", { name: /add a note/i }));
    await user.type(screen.getByPlaceholderText("Note title"), "Watch for the fork");
    await user.click(screen.getByRole("button", { name: /save note/i }));

    const notes = usePlanStore.getState().currentPlan?.techniques[0].notes;
    expect(notes).toHaveLength(1);
    expect(notes?.[0].title).toBe("Watch for the fork");
  });
});
