"use client";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";
import { Play, BookOpen, Headphones, Flame, ArrowLeft, type LucideIcon } from "lucide-react";
import { usePlanStore } from "@/store/plan-store";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { MarkdownLite } from "@/components/MarkdownLite";
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

// Reader mode swaps this same modal's content in-place (see decisions.md
// #14) rather than stacking a second overlay — "closed" means the normal
// technique view (title/description/resource list) is showing.
type ReaderState =
  | { status: "closed" }
  | { status: "loading"; resourceId: string; resourceTitle: string }
  | { status: "loaded"; resourceId: string; resourceTitle: string; content: string };

// Overlay is the final technique-detail surface — no separate /technique/[id]
// page (decisions.md #14). Replaces the earlier stub version of this component.
export function TechniqueModal({ technique, isMobile, onClose, onMastered }: TechniqueModalProps) {
  const updateTechniqueStatus = usePlanStore((s) => s.updateTechniqueStatus);
  const open = technique !== null;

  const [reader, setReader] = useState<ReaderState>({ status: "closed" });
  // Cached in component state only, not the persisted plan/localStorage —
  // dies on reload by design (see decisions.md's T5 fetch-timing call).
  // Survives switching between techniques within the same session since
  // this component instance stays mounted throughout (page.tsx always
  // renders it; `technique` just changes value).
  const readerCache = useRef<Map<string, string>>(new Map());

  // Reset reader mode when a *different* technique's modal opens — adjusted
  // during render (React's recommended pattern for "reset state when a prop
  // changes") rather than in a useEffect, which would call setState after
  // an extra commit and trigger a cascading-render lint error.
  const [lastTechniqueId, setLastTechniqueId] = useState(technique?.id);
  if (technique?.id !== lastTechniqueId) {
    setLastTechniqueId(technique?.id);
    setReader({ status: "closed" });
  }

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

  async function openReader(resource: Resource) {
    const cached = readerCache.current.get(resource.id);
    if (cached) {
      setReader({ status: "loaded", resourceId: resource.id, resourceTitle: resource.title, content: cached });
      return;
    }
    setReader({ status: "loading", resourceId: resource.id, resourceTitle: resource.title });
    try {
      const res = await fetch(`/api/read-article?url=${encodeURIComponent(resource.url)}`);
      if (!res.ok) throw new Error(`read-article responded with ${res.status}`);
      const data: { content?: string } = await res.json();
      if (!data.content || !data.content.trim()) throw new Error("read-article returned empty content");
      readerCache.current.set(resource.id, data.content);
      setReader({ status: "loaded", resourceId: resource.id, resourceTitle: resource.title, content: data.content });
    } catch (err) {
      // Graceful degradation: r.jina.ai is a free, no-SLA third-party
      // service — when it fails, times out, or the source blocks it
      // (paywall, robots.txt), fall back to exactly what happened before
      // reader mode existed: open the real URL directly in a new tab.
      console.error("[TechniqueModal] reader mode failed, falling back to external link", err);
      setReader({ status: "closed" });
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  }

  function closeReader() {
    setReader({ status: "closed" });
  }

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
                    {reader.status !== "closed" && <BackToTechniqueButton onClick={closeReader} />}
                    <Drawer.Title className="font-heading text-xl font-bold text-text-primary">
                      {reader.status !== "closed" ? reader.resourceTitle : technique.name}
                    </Drawer.Title>
                    {reader.status === "closed" && (
                      <Drawer.Description className="mt-2 font-sans text-sm text-text-muted">
                        {technique.description}
                      </Drawer.Description>
                    )}
                  </div>

                  {/* Only this middle section scrolls — header and actions stay put. */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
                    {reader.status !== "closed" ? (
                      <ReaderPane reader={reader} />
                    ) : (
                      <ResourceList resources={technique.resources} onOpenReader={openReader} />
                    )}
                  </div>

                  {reader.status === "closed" && (
                    <div className="shrink-0 border-t border-border px-6 py-6">
                      <ModalActions onMastered={handleMastered} onSkip={handleSkip} />
                    </div>
                  )}
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
                {reader.status !== "closed" && <BackToTechniqueButton onClick={closeReader} />}
                <Dialog.Title className="font-heading text-2xl font-bold text-text-primary">
                  {reader.status !== "closed" ? reader.resourceTitle : technique.name}
                </Dialog.Title>
                {reader.status === "closed" && (
                  <Dialog.Description className="mt-2 font-sans text-sm text-text-muted">
                    {technique.description}
                  </Dialog.Description>
                )}
              </div>

              {/* Only this middle section scrolls — header and actions stay put. */}
              <div className="min-h-0 flex-1 overflow-y-auto px-8 py-2">
                {reader.status !== "closed" ? (
                  <ReaderPane reader={reader} />
                ) : (
                  <ResourceList resources={technique.resources} onOpenReader={openReader} />
                )}
              </div>

              {reader.status === "closed" && (
                <div className="shrink-0 border-t border-border p-8 pt-6">
                  <ModalActions onMastered={handleMastered} onSkip={handleSkip} />
                </div>
              )}
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Cards are a vertical stack, not a literal carousel — matches how the
// content actually reads at 1-3 items and keeps keyboard/scroll navigation
// simple.
function ResourceList({
  resources,
  onOpenReader,
}: {
  resources: Resource[];
  onOpenReader: (resource: Resource) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {resources.map((resource) => {
        // Checked on the resolved URL itself, not resource.type — a
        // "podcast" search for an audio-typed resource has been observed
        // live landing on a YouTube video page (see search-service.ts),
        // so type alone can't be trusted to mean "not embeddable".
        const embedUrl = getYouTubeEmbedUrl(resource.url);
        if (embedUrl) {
          return <EmbeddedVideoCard key={resource.id} resource={resource} embedUrl={embedUrl} />;
        }

        const Icon = RESOURCE_ICONS[resource.type];
        const cardContent = (
          <>
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
          </>
        );

        // Reading resources open natively in-app (fetched on click via
        // /api/read-article) instead of linking out — see decisions.md's
        // T5 entry for the fallback-to-external-link behavior on failure.
        if (resource.type === "reading") {
          return (
            <li key={resource.id}>
              <button
                type="button"
                onClick={() => onOpenReader(resource)}
                className="flex w-full items-start gap-3 rounded-lg border border-border bg-surface-2 p-3 text-left transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
              >
                {cardContent}
              </button>
            </li>
          );
        }

        return (
          <li key={resource.id}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3 transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
            >
              {cardContent}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function BackToTechniqueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 font-label text-sm font-semibold text-primary transition-colors duration-150 hover:text-mascot-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Back to Technique
    </button>
  );
}

function ReaderPane({ reader }: { reader: Extract<ReaderState, { status: "loading" | "loaded" }> }) {
  if (reader.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span
          className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
        <p className="font-sans text-sm text-text-muted">Fetching the article…</p>
      </div>
    );
  }
  return <MarkdownLite text={reader.content} />;
}

// Plays natively in-app instead of sending the user to YouTube — the
// title/source/whyChosen header stays identical to the external-link card
// above it, just with a real <iframe> player underneath instead of the
// whole card being a link out.
function EmbeddedVideoCard({ resource, embedUrl }: { resource: Resource; embedUrl: string }) {
  return (
    <li className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-1 text-primary">
          <Play size={18} aria-hidden="true" />
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
      </div>
      <div className="mt-3 aspect-video w-full overflow-hidden rounded-md bg-black">
        <iframe
          src={embedUrl}
          title={resource.title}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </li>
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
