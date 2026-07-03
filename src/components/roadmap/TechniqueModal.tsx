"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";
import { Play, BookOpen, Headphones, Flame, type LucideIcon } from "lucide-react";
import { usePlanStore } from "@/store/plan-store";
import type { Technique, Resource, ResourceType } from "@/types/domain";

interface TechniqueModalProps {
  technique: Technique | null;
  isMobile: boolean;
  onClose: () => void;
  /** Fired only on the mastered path (not skip) — lets page.tsx trigger the
   * rail mascot's one scoped celebration beat (see MascotCompanion.tsx). */
  onMastered: () => void;
}

const RESOURCE_ICONS: Record<ResourceType, LucideIcon> = {
  video: Play,
  reading: BookOpen,
  audio: Headphones,
};

// Overlay is the final technique-detail surface — no separate /technique/[id]
// page. Replaces the earlier stub version of this component.
export function TechniqueModal({ technique, isMobile, onClose, onMastered }: TechniqueModalProps) {
  const updateTechniqueStatus = usePlanStore((s) => s.updateTechniqueStatus);
  const open = technique !== null;

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const handleMastered = () => {
    if (!technique) return;
    updateTechniqueStatus(technique.id, "mastered");
    onClose();
    onMastered();
  };

  const handleSkip = () => {
    if (!technique) return;
    updateTechniqueStatus(technique.id, "skipped");
    onClose();
  };

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-[100] bg-black/60" />
          <Drawer.Viewport className="fixed inset-x-0 bottom-0 z-[100]">
            <Drawer.Popup className="relative flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-surface-1 outline-none">
              {technique && (
                <>
                  {/* No peeking mascot/bubble on mobile — it read as
                      floating over the roadmap content behind the sheet
                      regardless of positioning. Just the drawer here. */}
                  <div className="shrink-0 px-6 pt-6 pb-4">
                    <Drawer.Title className="font-heading text-xl font-bold text-text-primary">
                      {technique.name}
                    </Drawer.Title>
                    <Drawer.Description className="mt-2 font-sans text-sm text-text-muted">
                      {technique.description}
                    </Drawer.Description>
                  </div>

                  {/* Only the playlist scrolls — header and actions stay put. */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
                    <ResourceList resources={technique.resources} />
                  </div>

                  <div className="shrink-0 border-t border-border px-6 py-6">
                    <ModalActions onMastered={handleMastered} onSkip={handleSkip} />
                  </div>
                </>
              )}
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-black/60" />
        {/* Right-anchored and no Mascot inside — the existing rail mascot on
            the page (bumped to z-[110]) stays visible above this backdrop
            and carries technique.rationale in its own speech bubble instead
            (see page.tsx / MascotCompanion's overrideMessage). right-[10vw]
            (up from 6vw) centers this within the right half of the screen
            rather than hugging the edge, and max-w-2xl gives it more room
            as a premium reading surface — still clear of the rail, which
            page.tsx's md:pl-[450px] roadmap shift confirms has real breathing
            room now that the speech bubble is uncapped. */}
        <Dialog.Popup className="fixed right-[10vw] top-1/2 z-[100] flex max-h-[85vh] w-full max-w-2xl -translate-y-1/2 flex-col rounded-2xl border border-border bg-surface-1 outline-none">
          {technique && (
            <>
              <div className="shrink-0 p-8 pb-4">
                <Dialog.Title className="font-heading text-2xl font-bold text-text-primary">
                  {technique.name}
                </Dialog.Title>
                <Dialog.Description className="mt-2 font-sans text-sm text-text-muted">
                  {technique.description}
                </Dialog.Description>
              </div>

              {/* Only the playlist scrolls — header and actions stay put. */}
              <div className="min-h-0 flex-1 overflow-y-auto px-8 py-2">
                <ResourceList resources={technique.resources} />
              </div>

              <div className="shrink-0 border-t border-border p-8 pt-6">
                <ModalActions onMastered={handleMastered} onSkip={handleSkip} />
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Cards are a vertical stack, not a literal carousel — matches how the
// content actually reads at 1-3 items and keeps keyboard/scroll navigation
// simple. Clicking opens the resource directly: title, source, and
// whyChosen are already fully visible on the card, so a nested preview-
// before-leaving overlay would just be an overlay inside this one.
function ResourceList({ resources }: { resources: Resource[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {resources.map((resource) => {
        const Icon = RESOURCE_ICONS[resource.type];
        return (
          <li key={resource.id}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3 transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-1 text-primary">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-sans text-sm font-semibold text-text-primary">{resource.title}</span>
                  <span className="shrink-0 rounded-full bg-surface-1 px-2 py-0.5 font-label text-[10px] font-semibold tracking-wide text-text-muted uppercase">
                    {resource.sourceName}
                  </span>
                </span>
                <span className="font-sans text-xs text-text-muted">{resource.whyChosen}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ModalActions({ onMastered, onSkip }: { onMastered: () => void; onSkip: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onSkip}
        className="min-h-11 rounded-md px-2 font-label text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
      >
        Skip this technique
      </button>
      <button
        type="button"
        onClick={onMastered}
        className="
          inline-flex min-h-11 items-center gap-2 rounded-[18px] px-6 py-3
          bg-gradient-to-r from-cta-start via-cta-mid to-cta-end
          font-label text-sm font-semibold tracking-wide text-cta-foreground
          shadow-[0_0_12px_rgba(198,105,0,0.3)]
          hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(198,105,0,0.5)]
          active:scale-[0.98]
          transition-all duration-150 ease-out
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body
        "
      >
        <Flame size={16} aria-hidden="true" />
        Mark as Mastered
      </button>
    </div>
  );
}
