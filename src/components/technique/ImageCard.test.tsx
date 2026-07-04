import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageCard } from "./ImageCard";

describe("ImageCard", () => {
  it("renders the image with its caption", () => {
    render(<ImageCard url="https://example.com/fork.png" caption="A knight fork in action" />);
    const img = screen.getByRole("img", { name: "A knight fork in action" });
    expect(img).toHaveAttribute("src", "https://example.com/fork.png");
    expect(screen.getByText("A knight fork in action")).toBeInTheDocument();
  });

  it("disappears gracefully instead of showing a broken image if the url fails to load", () => {
    render(<ImageCard url="https://example.com/missing.png" caption="A missing image" />);
    const img = screen.getByRole("img", { name: "A missing image" });

    fireEvent.error(img);

    expect(screen.queryByRole("img", { name: "A missing image" })).not.toBeInTheDocument();
    expect(screen.queryByText("A missing image")).not.toBeInTheDocument();
  });
});
