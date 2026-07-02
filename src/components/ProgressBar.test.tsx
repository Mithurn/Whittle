import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("shows the given label and a real percentage valueText, never a placeholder", () => {
    render(<ProgressBar label="3/6 mastered" value={50} maxValue={100} />);
    expect(screen.getByText("3/6 mastered")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("exposes the real percentage via aria-valuenow for accessibility", () => {
    render(<ProgressBar label="1/4 mastered" value={25} maxValue={100} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
  });

  it("renders 0% cleanly (not started) without a placeholder", () => {
    render(<ProgressBar label="0/5 mastered" value={0} maxValue={100} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
