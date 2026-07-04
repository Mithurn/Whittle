import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProsConsList } from "./ProsConsList";

describe("ProsConsList", () => {
  it("renders both sections when tips and mistakes are present", () => {
    render(<ProsConsList tips={["Warm up first"]} mistakes={["Skipping the warm-up"]} />);
    expect(screen.getByText("Pro Tips")).toBeInTheDocument();
    expect(screen.getByText("Common Mistakes")).toBeInTheDocument();
    expect(screen.getByText("Warm up first")).toBeInTheDocument();
    expect(screen.getByText("Skipping the warm-up")).toBeInTheDocument();
  });

  it("renders only the Pro Tips section when mistakes is empty", () => {
    render(<ProsConsList tips={["Warm up first"]} mistakes={[]} />);
    expect(screen.getByText("Pro Tips")).toBeInTheDocument();
    expect(screen.queryByText("Common Mistakes")).not.toBeInTheDocument();
  });

  it("renders only the Common Mistakes section when tips is empty", () => {
    render(<ProsConsList tips={[]} mistakes={["Skipping the warm-up"]} />);
    expect(screen.queryByText("Pro Tips")).not.toBeInTheDocument();
    expect(screen.getByText("Common Mistakes")).toBeInTheDocument();
  });

  it("renders a graceful fallback instead of empty boxes when both arrays are empty", () => {
    render(<ProsConsList tips={[]} mistakes={[]} />);
    expect(screen.queryByText("Pro Tips")).not.toBeInTheDocument();
    expect(screen.queryByText("Common Mistakes")).not.toBeInTheDocument();
    expect(
      screen.getByText("No specific tips or common mistakes for this one — just practice.")
    ).toBeInTheDocument();
  });
});
