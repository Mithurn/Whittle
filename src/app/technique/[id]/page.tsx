"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Flame, NotebookPen, Play, BookOpen, Headphones, type LucideIcon } from "lucide-react";
import { usePlanStore } from "@/store/plan-store";
import { getAvailableTabs, categorizeResources, type TabId } from "@/lib/technique-tabs";
import { VideoSection, ReadingSection, AudioSection } from "@/components/technique/TechniqueContent";
import { NotesDrawer } from "@/components/technique/NotesDrawer";

const TAB_META: Record<TabId, { label: string; Icon: LucideIcon }> = {
  video: { label: "Video", Icon: Play },
  reading: { label: "Reading", Icon: BookOpen },
  audio: { label: "Audio", Icon: Headphones },
  master: { label: "Master", Icon: Flame },
};

// Dedicated technique-detail page (decisions.md #16) — replaces the earlier
// modal/tabbed-hub design (#14, #15). Handles direct-load/refresh: the
// technique only exists in localStorage via Zustand persist, so this route
// needs its own "no plan found" fallback rather than assuming currentPlan
// is populated immediately.
export default function TechniquePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentPlan = usePlanStore((s) => s.currentPlan);
  const updateTechniqueStatus = usePlanStore((s) => s.updateTechniqueStatus);
  const addTechniqueNote = usePlanStore((s) => s.addTechniqueNote);
  const removeTechniqueNote = usePlanStore((s) => s.removeTechniqueNote);
  const triggerCelebration = usePlanStore((s) => s.triggerCelebration);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  if (!hydrated) {
    return <div className="min-h-dvh bg-background" />;
  }

  const technique = currentPlan?.techniques.find((t) => t.id === params.id) ?? null;

  if (!currentPlan || !technique) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-5 text-center">
        <p className="font-sans text-text-primary">
          {currentPlan ? "We couldn't find that technique." : "No plan found."}
        </p>
        <Link
          href="/"
          className="min-h-11 rounded-md px-3 py-2 font-label text-sm font-semibold text-primary transition-colors duration-150 hover:text-mascot-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
        >
          Back to your roadmap
        </Link>
      </div>
    );
  }

  const availableTabs = getAvailableTabs(technique.resources);
  const currentTab = activeTab && availableTabs.includes(activeTab) ? activeTab : availableTabs[0];
  const currentIndex = availableTabs.indexOf(currentTab);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < availableTabs.length - 1;
  const { video, reading, audio } = categorizeResources(technique.resources);

  function goToTab(tab: TabId) {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleMastered() {
    updateTechniqueStatus(technique!.id, "mastered");
    triggerCelebration(technique!.id);
    router.push("/");
  }

  function handleSkip() {
    updateTechniqueStatus(technique!.id, "skipped");
    router.push("/");
  }

  return (
    <div className="relative min-h-dvh bg-background pb-24">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link
            href="/"
            className="-ml-2 flex min-h-11 items-center gap-1.5 rounded-md px-2 font-label text-sm font-semibold text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Back to Roadmap
          </Link>
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-2 font-label text-xs font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <NotebookPen size={16} aria-hidden="true" />
            Notes{technique.notes.length > 0 ? ` (${technique.notes.length})` : ""}
          </button>
        </div>

        <div role="tablist" aria-label="Technique content" className="mx-auto mt-3 flex max-w-3xl gap-2 overflow-x-auto">
          {availableTabs.map((tab) => {
            const { label, Icon } = TAB_META[tab];
            const isActive = tab === currentTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => goToTab(tab)}
                className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 py-2 font-label text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body ${
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
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-8">
        <h1 className="font-heading text-2xl font-bold text-text-primary sm:text-3xl">{technique.name}</h1>
        <p className="mt-2 font-sans text-base text-text-muted">{technique.description}</p>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        {currentTab === "video" && <VideoSection resources={video} />}
        {currentTab === "reading" && <ReadingSection resources={reading} />}
        {currentTab === "audio" && <AudioSection resources={audio} />}
        {currentTab === "master" && (
          <div className="flex flex-col gap-6">
            <p className="font-sans text-base leading-relaxed text-text-muted">{technique.rationale}</p>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
              <button
                type="button"
                onClick={handleSkip}
                className="min-h-11 rounded-md px-2 font-label text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
              >
                Skip this technique
              </button>
              <button
                type="button"
                onClick={handleMastered}
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
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => hasPrev && goToTab(availableTabs[currentIndex - 1])}
            disabled={!hasPrev}
            className="min-h-11 rounded-md px-4 font-label text-sm font-semibold text-text-primary transition-opacity duration-150 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            Back
          </button>
          <span className="font-label text-xs text-text-muted">
            {currentIndex + 1} / {availableTabs.length}
          </span>
          <button
            type="button"
            onClick={() => hasNext && goToTab(availableTabs[currentIndex + 1])}
            disabled={!hasNext}
            className="min-h-11 rounded-md px-4 font-label text-sm font-semibold text-primary transition-opacity duration-150 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            Next
          </button>
        </div>
      </div>

      <NotesDrawer
        isOpen={notesOpen}
        notes={technique.notes}
        onClose={() => setNotesOpen(false)}
        onAdd={(note) => addTechniqueNote(technique.id, note)}
        onRemove={(noteId) => removeTechniqueNote(technique.id, noteId)}
      />
    </div>
  );
}
