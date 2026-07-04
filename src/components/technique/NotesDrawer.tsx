"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Plus, Trash2, X, Edit3 } from "lucide-react";
import type { NoteEntry } from "@/types/domain";

interface NotesDrawerProps {
  isOpen: boolean;
  notes: NoteEntry[];
  onClose: () => void;
  onAdd: (note: { title: string; description: string }) => void;
  onUpdate: (noteId: string, note: { title: string; description: string }) => void;
  onRemove: (noteId: string) => void;
  openNoteId: string | null;
  setOpenNoteId: (id: string | null) => void;
}

// Slides in from the right, covering roughly a third of the page — wide
// enough to read comfortably without fully hiding the content the notes
// are about. A plain transform-based panel (not a nested Base UI Drawer)
// keeps this independent of whatever tab/section is active underneath.
export function NotesDrawer({ isOpen, notes, onClose, onAdd, onUpdate, onRemove, openNoteId, setOpenNoteId }: NotesDrawerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (editingNoteId) {
      onUpdate(editingNoteId, { title: trimmedTitle, description: description.trim() });
    } else {
      onAdd({ title: trimmedTitle, description: description.trim() });
    }
    setTitle("");
    setDescription("");
    setIsFormOpen(false);
    setEditingNoteId(null);
  }

  const openNote = notes.find((n) => n.id === openNoteId) ?? null;

  return (
    <>
      {/* Dims the page behind the drawer without a second full Base UI
          Dialog/backdrop stack — purely decorative, doesn't trap focus
          itself (the drawer's own contents are still just regular DOM). */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-surface-1 shadow-2xl transition-transform duration-200 sm:w-[35%] sm:min-w-[380px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <h2 className="font-heading text-lg font-bold text-text-primary">My Notes</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notes"
            tabIndex={isOpen ? 0 : -1}
            className="flex size-11 items-center justify-center rounded-full text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isFormOpen ? (
            <div className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title"
                tabIndex={isOpen ? 0 : -1}
                autoFocus
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 font-sans text-sm font-semibold text-text-primary focus:border-mascot-body focus:outline-none"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What do you want to remember? (paste a snippet, or write your own)"
                tabIndex={isOpen ? 0 : -1}
                rows={4}
                className="w-full resize-none rounded-md border border-border bg-surface-1 px-3 py-2 font-sans text-sm text-text-primary focus:border-mascot-body focus:outline-none"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingNoteId(null);
                    setTitle("");
                    setDescription("");
                  }}
                  tabIndex={isOpen ? 0 : -1}
                  className="min-h-11 rounded-md px-3 font-label text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!title.trim()}
                  tabIndex={isOpen ? 0 : -1}
                  className="min-h-11 rounded-md bg-gradient-to-r from-cta-start via-cta-mid to-cta-end px-4 font-label text-sm font-semibold text-cta-foreground transition-opacity duration-150 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
                >
                  Save note
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              tabIndex={isOpen ? 0 : -1}
              className="mb-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border font-label text-sm font-semibold text-primary transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
            >
              <Plus size={16} aria-hidden="true" />
              Add a note
            </button>
          )}

          {notes.length === 0 ? (
            <p className="font-sans text-sm text-text-muted">No notes yet. Add one while you watch or read.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notes
                .slice()
                .reverse()
                .map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => setOpenNoteId(note.id)}
                      tabIndex={isOpen ? 0 : -1}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
                    >
                      <span className="min-w-0 truncate font-sans text-sm font-semibold text-text-primary">
                        {note.title}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog.Root open={openNote !== null} onOpenChange={(next) => !next && setOpenNoteId(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/60" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-[60] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface-1 p-6 outline-none">
            {openNote && (
              <>
                <Dialog.Title className="font-heading text-lg font-bold text-text-primary">
                  {openNote.title}
                </Dialog.Title>
                <Dialog.Description className="mt-3 whitespace-pre-wrap font-sans text-sm text-text-primary">
                  {openNote.description || "No description added."}
                </Dialog.Description>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenNoteId(null);
                        setIsFormOpen(true);
                        setEditingNoteId(openNote.id);
                        setTitle(openNote.title);
                        setDescription(openNote.description);
                      }}
                      className="flex min-h-11 items-center gap-1.5 rounded-md px-2 font-label text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
                    >
                      <Edit3 size={15} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRemove(openNote.id);
                        setOpenNoteId(null);
                      }}
                    className="flex min-h-11 items-center gap-1.5 rounded-md px-2 font-label text-sm font-medium text-destructive transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
                  >
                      <Trash2 size={15} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenNoteId(null)}
                    className="min-h-11 rounded-md px-4 font-label text-sm font-semibold text-primary transition-colors duration-150 hover:text-mascot-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
