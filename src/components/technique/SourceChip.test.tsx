import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceChip } from "./SourceChip";

describe("SourceChip", () => {
  it("links to the source url and shows the source name", () => {
    render(<SourceChip url="https://chess.com/pin-theory" sourceName="Chess.com" />);
    const link = screen.getByRole("link", { name: /source: chess\.com/i });
    expect(link).toHaveAttribute("href", "https://chess.com/pin-theory");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
