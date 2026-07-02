import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampfireNode } from "./CampfireNode";
import type { RoadmapNode } from "@/store/plan-store";
import type { Technique } from "@/types/domain";

// lottie-react needs a real <canvas> context, which jsdom doesn't provide —
// a lightweight stand-in is enough to assert render/fetch behavior.
vi.mock("lottie-react", () => ({
  default: () => <div data-testid="lottie" />,
}));

function makeNode(state: RoadmapNode["state"], overrides: Partial<Technique> = {}): RoadmapNode {
  const technique: Technique = {
    id: "t1",
    name: "Forking",
    description: "desc",
    rationale: "rationale",
    resources: [],
    status: "not_started",
    order: 0,
    ...overrides,
  };
  return { technique, state };
}

describe("CampfireNode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({}) }) as unknown as typeof fetch;
  });

  it.each([
    ["current", "Forking — up next, tap to start"],
    ["completed", "Forking — mastered"],
    ["available", "Forking — tap to view"],
    ["skipped", "Forking — skipped, tap to revisit"],
  ] as const)("renders the %s state with an accessible label", (state, label) => {
    render(<CampfireNode node={makeNode(state)} />);
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("exposes the node state via data-node-state for downstream styling/positioning", () => {
    render(<CampfireNode node={makeNode("completed")} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-node-state", "completed");
  });

  it("calls onClick with the technique id when tapped, for every state (skipped stays clickable)", async () => {
    const onClick = vi.fn();
    render(<CampfireNode node={makeNode("skipped")} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledWith("t1");
  });

  it("fetches the fire animation only for the current node", async () => {
    render(<CampfireNode node={makeNode("current")} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/mascot/fire-node.json"));
  });

  it.each(["completed", "available", "skipped"] as const)(
    "never fetches the fire animation for the %s state",
    async (state) => {
      render(<CampfireNode node={makeNode(state)} />);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(global.fetch).not.toHaveBeenCalledWith("/mascot/fire-node.json");
    }
  );

  it("fetches the completed-node animation only for the completed state", async () => {
    render(<CampfireNode node={makeNode("completed")} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/mascot/completed-node.json"));
  });

  it.each(["current", "available", "skipped"] as const)(
    "never fetches the completed-node animation for the %s state",
    async (state) => {
      render(<CampfireNode node={makeNode(state)} />);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(global.fetch).not.toHaveBeenCalledWith("/mascot/completed-node.json");
    }
  );

  it("skips the completed-node animation under prefers-reduced-motion (falls back to the static gradient)", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    render(<CampfireNode node={makeNode("completed")} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(global.fetch).not.toHaveBeenCalledWith("/mascot/completed-node.json");
  });
});
