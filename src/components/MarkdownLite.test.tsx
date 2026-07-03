import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownLite } from "./MarkdownLite";

describe("MarkdownLite", () => {
  it("renders headings at three levels", () => {
    render(<MarkdownLite text={"# Big\n\n## Medium\n\n### Small"} />);
    expect(screen.getByRole("heading", { name: "Big", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Medium", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Small", level: 4 })).toBeInTheDocument();
  });

  it("renders bold and italic inline text", () => {
    render(<MarkdownLite text="This is **bold** and this is *italic*." />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
  });

  it("renders a link with the real href, opening in a new tab", () => {
    render(<MarkdownLite text="See [the source](https://example.com/article) for more." />);
    const link = screen.getByRole("link", { name: "the source" });
    expect(link).toHaveAttribute("href", "https://example.com/article");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders a bullet list as actual list items", () => {
    render(<MarkdownLite text={"- First point\n- Second point"} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("First point")).toBeInTheDocument();
    expect(screen.getByText("Second point")).toBeInTheDocument();
  });

  it("renders plain lines as paragraphs", () => {
    render(<MarkdownLite text={"First paragraph.\n\nSecond paragraph."} />);
    expect(screen.getByText("First paragraph.").tagName).toBe("P");
    expect(screen.getByText("Second paragraph.").tagName).toBe("P");
  });

  it("renders a standalone image as a real <img>, not literal '!' + link text", () => {
    render(<MarkdownLite text="![A mountain bike frame](https://example.com/bike.jpg)" />);
    const img = screen.getByRole("img", { name: "A mountain bike frame" });
    expect(img).toHaveAttribute("src", "https://example.com/bike.jpg");
    expect(screen.queryByText(/^!/)).not.toBeInTheDocument();
  });

  it("renders multiple images concatenated on one line (observed live from jina), each as its own <img>", () => {
    render(
      <MarkdownLite text="![Image 1: Frame](https://example.com/a.jpg)![Image 2: Fork](https://example.com/b.jpg)" />
    );
    expect(screen.getByRole("img", { name: "Image 1: Frame" })).toHaveAttribute("src", "https://example.com/a.jpg");
    expect(screen.getByRole("img", { name: "Image 2: Fork" })).toHaveAttribute("src", "https://example.com/b.jpg");
  });

  it("renders a markdown table with blank lines between rows (observed live from jina) as a real <table>", () => {
    const text = [
      "| Frequency | Task |",
      "",
      "| --- | --- |",
      "",
      "| Weekly | Clean the chain |",
      "",
      "| Monthly | Check the bolts |",
    ].join("\n");
    render(<MarkdownLite text={text} />);

    expect(screen.getByRole("columnheader", { name: "Frequency" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Task" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    // header row + 2 body rows
    expect(rows).toHaveLength(3);
    expect(screen.getByText("Clean the chain")).toBeInTheDocument();
    expect(screen.getByText("Check the bolts")).toBeInTheDocument();
  });

  it("does not treat a paragraph starting with a single '|' character as a table", () => {
    render(<MarkdownLite text={"| this is not actually a table, just a paragraph"} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
