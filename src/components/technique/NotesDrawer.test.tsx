import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NotesDrawer } from "./NotesDrawer";
import type { NoteEntry } from "@/types/domain";

const note: NoteEntry = {
  id: "n0",
  title: "Watch for forks",
  description: "Check both diagonals before moving the king.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("NotesDrawer", () => {
  it("shows an empty state when there are no notes", () => {
    render(<NotesDrawer isOpen notes={[]} onClose={vi.fn()} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });

  it("shows only the note title in the list, not the description", () => {
    render(<NotesDrawer isOpen notes={[note]} onClose={vi.fn()} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("Watch for forks")).toBeInTheDocument();
    expect(screen.queryByText("Check both diagonals before moving the king.")).not.toBeInTheDocument();
  });

  it("clicking a note title opens a popup with the full description", async () => {
    const user = userEvent.setup();
    render(<NotesDrawer isOpen notes={[note]} onClose={vi.fn()} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Watch for forks" }));
    expect(await screen.findByText("Check both diagonals before moving the king.")).toBeInTheDocument();
  });

  it("adds a note with title and description via the add form", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<NotesDrawer isOpen notes={[]} onClose={vi.fn()} onAdd={onAdd} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /add a note/i }));
    await user.type(screen.getByPlaceholderText("Note title"), "Key idea");
    await user.type(screen.getByPlaceholderText(/what do you want to remember/i), "Some detail");
    await user.click(screen.getByRole("button", { name: /save note/i }));

    expect(onAdd).toHaveBeenCalledWith({ title: "Key idea", description: "Some detail" });
  });

  it("does not save a note with an empty title", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<NotesDrawer isOpen notes={[]} onClose={vi.fn()} onAdd={onAdd} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /add a note/i }));
    expect(screen.getByRole("button", { name: /save note/i })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("deletes a note from its detail popup", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<NotesDrawer isOpen notes={[note]} onClose={vi.fn()} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={onRemove} />);

    await user.click(screen.getByRole("button", { name: "Watch for forks" }));
    await user.click(await screen.findByRole("button", { name: /delete/i }));

    expect(onRemove).toHaveBeenCalledWith("n0");
  });

  it("closes via the close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<NotesDrawer isOpen notes={[]} onClose={onClose} onAdd={vi.fn()} onUpdate={vi.fn()} onRemove={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /close notes/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
