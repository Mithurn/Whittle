import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TechniquePage from "./page";
import { usePlanStore } from "@/store/plan-store";
import type { HobbyPlan, Technique } from "@/types/domain";

// lottie-react needs a real <canvas> context, which jsdom doesn't provide —
// a lightweight stand-in is enough to assert render/fetch behavior. Matches
// the pattern already used by CampfireNode.test.tsx / RoadmapBackground.test.tsx.
vi.mock("lottie-react", () => ({
  default: () => <div data-testid="lottie" />,
}));

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
      url: "https://youtube.com/watch?v=abcdefghijk",
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

// The page fires a background JIT fetch for the lesson content (How it
// Works / Pros & Cons / Summary) the moment it mounts, regardless of which
// slide is showing — every test needs this stubbed so that fetch doesn't
// reject unhandled or spam the console, even tests that never navigate to
// an AI-generated slide.
function mockLessonFetch() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      intro: "Forking attacks two pieces with one move.",
      howItWorks: {
        overview: "Line up your piece so it threatens two targets at once.",
        steps: [{ title: "Spot the fork", text: "Look for two undefended pieces on one line." }],
      },
      prosCons: { advantages: ["Wins material"], disadvantages: ["Needs a tactical eye"] },
      summaryTable: { headers: ["Piece", "Best used"], rows: [["Knight", "Forking king and rook"]] },
    }),
  }) as unknown as typeof fetch;
}

async function goToSlide(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole("button", { name: /^next$/i }));
  }
}

describe("TechniquePage", () => {
  beforeEach(() => {
    localStorage.clear();
    pushMock.mockClear();
    currentParamId = "t0";
    usePlanStore.setState({ currentPlan: null, celebratingTechniqueId: null });
    mockLessonFetch();
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

  it("opens on the Introduction slide showing the technique's rationale", async () => {
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);
    expect(await screen.findByRole("heading", { name: "Introduction" })).toBeInTheDocument();
    expect(screen.getByText(technique.rationale)).toBeInTheDocument();
  });

  it("falls back to the technique's raw description on the Introduction slide before the JIT lesson loads", async () => {
    // Deliberately never resolves — asserts the pre-fetch state.
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);
    expect(await screen.findByRole("heading", { name: "Introduction" })).toBeInTheDocument();
    expect(screen.getByText(technique.description)).toBeInTheDocument();
  });

  it("jumps straight to the Watch & Learn slide when the Introduction slide's video thumbnail is clicked", async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await screen.findByRole("heading", { name: "Introduction" });
    await user.click(screen.getByRole("button", { name: /watch the video for forking/i }));

    expect(await screen.findByRole("heading", { name: "Watch & Learn" })).toBeInTheDocument();
    expect(screen.getByTitle("Mastering the Fork")).toHaveAttribute("src", "https://www.youtube.com/embed/abcdefghijk");
  });

  it("advances to the Watch & Learn slide and embeds the YouTube resource", async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await screen.findByRole("heading", { name: "Introduction" });
    await goToSlide(user, 1);

    expect(await screen.findByRole("heading", { name: "Watch & Learn" })).toBeInTheDocument();
    expect(screen.getByTitle("Mastering the Fork")).toHaveAttribute("src", "https://www.youtube.com/embed/abcdefghijk");
  });

  it("shows the JIT-generated How it Works content once the background lesson fetch resolves", async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await screen.findByRole("heading", { name: "Introduction" });
    await goToSlide(user, 2);

    expect(await screen.findByRole("heading", { name: "How it Works", level: 1 })).toBeInTheDocument();
    expect(
      await screen.findByText("Line up your piece so it threatens two targets at once.")
    ).toBeInTheDocument();
  });

  it("marks the technique mastered, triggers celebration, and navigates back to the roadmap", async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await screen.findByRole("heading", { name: "Introduction" });
    await goToSlide(user, 5);

    await user.click(await screen.findByRole("button", { name: /complete lesson/i }));

    expect(usePlanStore.getState().currentPlan?.techniques[0].status).toBe("mastered");
    expect(usePlanStore.getState().celebratingTechniqueId).toBe("t0");
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("marks the technique skipped and navigates back without triggering celebration", async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await screen.findByRole("heading", { name: "Introduction" });
    await goToSlide(user, 5);

    await user.click(await screen.findByRole("button", { name: /skip this technique/i }));

    expect(usePlanStore.getState().currentPlan?.techniques[0].status).toBe("skipped");
    expect(usePlanStore.getState().celebratingTechniqueId).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("opens the notes drawer and adds a note", async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ currentPlan: makePlan([technique]) });
    render(<TechniquePage />);

    await user.click(await screen.findByRole("button", { name: /^notes$/i }));
    await user.click(screen.getByRole("button", { name: /add a note/i }));
    await user.type(screen.getByPlaceholderText("Note title"), "Watch for the fork");
    await user.click(screen.getByRole("button", { name: /save note/i }));

    const notes = usePlanStore.getState().currentPlan?.techniques[0].notes;
    expect(notes).toHaveLength(1);
    expect(notes?.[0].title).toBe("Watch for the fork");
  });
});
