"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";
import { Play, BookOpen, Headphones, Flame, NotebookPen, X, type LucideIcon } from "lucide-react";
import { usePlanStore } from "@/store/plan-store";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { MarkdownLite } from "@/components/MarkdownLite";
import type { Technique, Resource } from "@/types/domain";

interface TechniqueModalProps {
  technique: Technique | null;
  isMobile: boolean;
  onClose: () => void;
  /** Fired only on the mastered path (not skip) — lets page.tsx trigger the
   * rail mascot's one scoped celebration beat (see MascotCompanion.tsx). */
  onMastered: () => void;
}

type TabId = "video" | "reading" | "audio" | "master";

const TAB_META: Record<TabId, { label: string; Icon: LucideIcon }> = {
  video: { label: "Video", Icon: Play },
  reading: { label: "Reading", Icon: BookOpen },
  audio: { label: "Audio", Icon: Headphones },
  master: { label: "Master", Icon: Flame },
};

// Grouped by what actually renders, not by the AI's stated resource.type —
// a "podcast" search for an audio-typed resource has been observed live
// landing on a YouTube video page (see search-service.ts), so anything
// that resolves to a real YouTube embed belongs in the Video tab
// regardless of its label, and only genuinely non-video audio stays in Audio.
function categorizeResources(resources: Resource[]) {
  const video: Resource[] = [];
  const reading: Resource[] = [];
  const audio: Resource[] = [];
  for (const resource of resources) {
    if (getYouTubeEmbedUrl(resource.url)) {
      video.push(resource);
    } else if (resource.type === "reading") {
      reading.push(resource);
    } else {
      audio.push(resource);
    }
  }
  return { video, reading, audio };
}

function getAvailableTabs(resources: Resource[]): TabId[] {
  const { video, reading, audio } = categorizeResources(resources);
  const tabs: TabId[] = [];
  if (video.length > 0) tabs.push("video");
  if (reading.length > 0) tabs.push("reading");
  if (audio.length > 0) tabs.push("audio");
  tabs.push("master");
  return tabs;
}

// Tabbed Learning Hub — free navigation between a technique's real
// resources (not a forced sequence), plus a persistent notes side panel
// available from any tab. Overlay is the final technique-detail surface —
// no separate /technique/[id] page (decisions.md #14).
export function TechniqueModal({ technique, isMobile, onClose, onMastered }: TechniqueModalProps) {
  const updateTechniqueStatus = usePlanStore((s) => s.updateTechniqueStatus);
  const updateTechniqueNotes = usePlanStore((s) => s.updateTechniqueNotes);
  const open = technique !== null;

  const availableTabs = getAvailableTabs(technique?.resources ?? []);
  const [activeTab, setActiveTab] = useState<TabId>(availableTabs[0]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState(technique?.notes ?? "");
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset per-technique UI state when a *different* technique's modal opens
  // — adjusted during render (React's recommended pattern for "reset state
  // when a prop changes") rather than in a useEffect, which would call
  // setState after an extra commit and trigger a cascading-render lint error.
  const [lastTechniqueId, setLastTechniqueId] = useState(technique?.id);
  if (technique?.id !== lastTechniqueId) {
    setLastTechniqueId(technique?.id);
    setActiveTab(availableTabs[0]);
    setNotesOpen(false);
    setLocalNotes(technique?.notes ?? "");
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

  function handleNotesChange(value: string) {
    setLocalNotes(value);
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => {
      if (technique) updateTechniqueNotes(technique.id, value);
    }, 400);
  }

  const { video, reading, audio } = categorizeResources(technique?.resources ?? []);

  const body = technique && (
    <>
      <div className="shrink-0 px-6 pt-6 pb-3 sm:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {isMobile ? (
              <Drawer.Title className="font-heading text-xl font-bold text-text-primary">
                {technique.name}
              </Drawer.Title>
            ) : (
              <Dialog.Title className="font-heading text-2xl font-bold text-text-primary">
                {technique.name}
              </Dialog.Title>
            )}
            {isMobile ? (
              <Drawer.Description className="mt-1 font-sans text-sm text-text-muted">
                {technique.description}
              </Drawer.Description>
            ) : (
              <Dialog.Description className="mt-1 font-sans text-sm text-text-muted">
                {technique.description}
              </Dialog.Description>
            )}
          </div>
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            aria-label="Open my learning notes"
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-2 font-label text-xs font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <NotebookPen size={16} aria-hidden="true" />
            Notes
          </button>
        </div>
      </div>

      <TabBar tabs={availableTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 sm:px-8">
        {activeTab === "video" && <VideoTab resources={video} />}
        {activeTab === "reading" && <ReadingTab resources={reading} />}
        {activeTab === "audio" && <AudioTab resources={audio} />}
        {activeTab === "master" && (
          <MasterTab technique={technique} onMastered={handleMastered} onSkip={handleSkip} />
        )}
      </div>

      <NotesPanel
        isMobile={isMobile}
        isOpen={notesOpen}
        notes={localNotes}
        onChange={handleNotesChange}
        onClose={() => setNotesOpen(false)}
      />
    </>
  );

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-[100] bg-black/60" />
          <Drawer.Viewport className="fixed inset-x-0 bottom-0 z-[100]">
            <Drawer.Popup className="relative flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface-1 outline-none">
              {body}
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
            (see page.tsx / MascotCompanion's overrideMessage). */}
        <Dialog.Popup className="fixed right-[10vw] top-1/2 z-[100] flex max-h-[85vh] w-full max-w-2xl -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface-1 outline-none">
          {body}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TabBar({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: TabId[];
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div role="tablist" aria-label="Technique content" className="flex gap-2 border-b border-border px-6 pb-3 sm:px-8">
      {tabs.map((tab) => {
        const { label, Icon } = TAB_META[tab];
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab)}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 font-label text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body ${
              isActive
                ? "bg-gradient-to-r from-cta-start via-cta-mid to-cta-end text-cta-foreground"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ResourceMeta({ resource }: { resource: Resource }) {
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-sans text-sm font-semibold text-text-primary">{resource.title}</span>
        <span className="rounded-full bg-surface-1 px-2 py-0.5 font-label text-[10px] font-semibold tracking-wide text-text-muted uppercase">
          {resource.sourceName}
        </span>
      </div>
      <p className="mt-1 font-sans text-xs text-text-muted">{resource.whyChosen}</p>
    </div>
  );
}

// Prominent and ready to play the moment the tab is opened — no "Open
// Video" click required.
function VideoTab({ resources }: { resources: Resource[] }) {
  return (
    <div className="flex flex-col gap-8">
      {resources.map((resource) => {
        const embedUrl = getYouTubeEmbedUrl(resource.url);
        if (!embedUrl) return null;
        return (
          <div key={resource.id}>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={embedUrl}
                title={resource.title}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <ResourceMeta resource={resource} />
          </div>
        );
      })}
    </div>
  );
}

// Auto-fetches the moment this tab is rendered — no extra click to enter
// "reader mode" the way T5's first version worked. Each article manages
// its own fetch lifecycle so one slow/failing source never blocks another.
function ReadingTab({ resources }: { resources: Resource[] }) {
  const cache = useRef<Map<string, string>>(new Map());
  return (
    <div className="flex flex-col gap-8">
      {resources.map((resource) => (
        <ArticleSection key={resource.id} resource={resource} cache={cache} />
      ))}
    </div>
  );
}

type ArticleFetchState = { status: "loading" } | { status: "loaded"; content: string } | { status: "error" };

function ArticleSection({
  resource,
  cache,
}: {
  resource: Resource;
  cache: React.RefObject<Map<string, string>>;
}) {
  const [state, setState] = useState<ArticleFetchState>(() => {
    const cached = cache.current.get(resource.id);
    return cached ? { status: "loaded", content: cached } : { status: "loading" };
  });

  useEffect(() => {
    if (state.status !== "loading") return;
    let cancelled = false;
    fetch(`/api/read-article?url=${encodeURIComponent(resource.url)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`read-article responded with ${res.status}`);
        const data: { content?: string } = await res.json();
        if (!data.content || !data.content.trim()) throw new Error("read-article returned empty content");
        cache.current.set(resource.id, data.content);
        if (!cancelled) setState({ status: "loaded", content: data.content });
      })
      .catch((err) => {
        // Graceful degradation: r.jina.ai is a free, no-SLA third-party
        // service — when it fails, times out, or the source blocks it
        // (paywall, robots.txt), fall back to a clickable external-link
        // card. This no longer auto-opens a new tab (unlike T5's original
        // click-triggered version): fetching now starts automatically the
        // moment this tab renders, not from a direct user click, and an
        // unprompted popup at that point is both a worse surprise and
        // likely to be blocked by the browser anyway (not a direct result
        // of a user gesture).
        console.error("[ArticleSection] fetch failed, falling back to external link", err);
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.id]);

  return (
    <div>
      <ResourceMeta resource={resource} />
      <div className="mt-4">
        {state.status === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span
              className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
              aria-hidden="true"
            />
            <p className="font-sans text-sm text-text-muted">Fetching the article…</p>
          </div>
        )}
        {state.status === "loaded" && <MarkdownLite text={state.content} />}
        {state.status === "error" && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3 font-sans text-sm text-text-primary transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <BookOpen size={18} className="shrink-0 text-primary" aria-hidden="true" />
            Couldn&apos;t load this article in-app — open on {resource.sourceName}
          </a>
        )}
      </div>
    </div>
  );
}

// Genuinely non-video audio only — anything that resolved to a real
// YouTube embed already went to the Video tab (see categorizeResources).
function AudioTab({ resources }: { resources: Resource[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {resources.map((resource) => (
        <li key={resource.id}>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-3 transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-1 text-primary">
              <Headphones size={18} aria-hidden="true" />
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
      ))}
    </ul>
  );
}

function MasterTab({
  technique,
  onMastered,
  onSkip,
}: {
  technique: Technique;
  onMastered: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="font-sans text-sm leading-relaxed text-text-muted">{technique.rationale}</p>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
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
    </div>
  );
}

// Slides in from the right on desktop, from the bottom on mobile — a
// simple transform-based panel inside the modal's own Popup rather than a
// second nested overlay (Portal/backdrop), keeping z-index/focus management
// simple. Always mounted (not conditionally rendered) so the transition
// actually animates in both directions.
function NotesPanel({
  isMobile,
  isOpen,
  notes,
  onChange,
  onClose,
}: {
  isMobile: boolean;
  isOpen: boolean;
  notes: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const positionClass = isMobile
    ? `inset-x-0 bottom-0 h-[70%] rounded-t-2xl transition-transform duration-200 ${isOpen ? "translate-y-0" : "translate-y-full"}`
    : `inset-y-0 right-0 w-full max-w-sm transition-transform duration-200 ${isOpen ? "translate-x-0" : "translate-x-full"}`;

  return (
    <div
      className={`absolute z-20 flex flex-col border border-border bg-surface-1 shadow-xl ${positionClass}`}
      aria-hidden={!isOpen}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <h3 className="font-heading text-base font-bold text-text-primary">My Learning Notes</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notes"
          className="flex size-11 items-center justify-center rounded-full text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 p-5">
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Jot down anything you want to remember…"
          tabIndex={isOpen ? 0 : -1}
          className="size-full resize-none rounded-lg border border-border bg-surface-2 p-3 font-sans text-sm text-text-primary transition-colors duration-150 focus:border-mascot-body focus:outline-none"
        />
      </div>
    </div>
  );
}
