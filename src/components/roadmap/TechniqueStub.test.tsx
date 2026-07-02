import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TechniqueStub } from "./TechniqueStub";

describe("TechniqueStub", () => {
  it("renders nothing when no technique is selected", () => {
    render(<TechniqueStub techniqueName={null} isMobile={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the technique name as the modal title on desktop", () => {
    render(<TechniqueStub techniqueName="Forking" isMobile={false} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Forking")).toBeInTheDocument();
  });

  it("shows the technique name as the sheet title on mobile", () => {
    render(<TechniqueStub techniqueName="Forking" isMobile onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Forking")).toBeInTheDocument();
  });

  it("calls onClose when the close action is used, on desktop", async () => {
    const onClose = vi.fn();
    render(<TechniqueStub techniqueName="Forking" isMobile={false} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the close action is used, on mobile", async () => {
    const onClose = vi.fn();
    render(<TechniqueStub techniqueName="Forking" isMobile onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
