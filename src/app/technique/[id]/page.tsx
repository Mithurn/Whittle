"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Flame, Play, Info, CheckCircle, AlertTriangle, BookOpen, Edit3, Plus, Headphones, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePlanStore } from "@/store/plan-store";
import { categorizeResources } from "@/lib/technique-tabs";
import { MarkdownLite } from "@/components/MarkdownLite";
import { ProsConsList } from "@/components/technique/ProsConsList";
import { HowItWorksTimeline } from "@/components/technique/HowItWorksTimeline";
import { NotesDrawer } from "@/components/technique/NotesDrawer";
import { SourceChip } from "@/components/technique/SourceChip";
import { ImageCard } from "@/components/technique/ImageCard";

import thinkingAnimation from "../../../../maskot/thinking.json";

// lottie-react, the YouTube iframe embed, and the podcast iframe widget are
// each only needed once the user actually swipes to a slide that renders
// them — deferring them out of the page's initial bundle means someone who
// only reads the Introduction and exits never pays for any of the three.
// ssr:false on all three: this page's real content is already gated behind
// a client-only hydration check (see the `!hydrated` early return below),
// so there's no meaningful server-rendered output to preserve.
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
const VideoSection = dynamic(
  () => import("@/components/technique/TechniqueContent").then((mod) => mod.VideoSection),
  { ssr: false }
);
const PodcastMode = dynamic(
  () => import("@/components/technique/PodcastMode").then((mod) => mod.PodcastMode),
  { ssr: false }
);

export default function TechniquePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const currentPlan = usePlanStore((s) => s.currentPlan);
  const updateTechniqueStatus = usePlanStore((s) => s.updateTechniqueStatus);
  const setTechniqueLesson = usePlanStore((s) => s.setTechniqueLesson);
  const addTechniqueNote = usePlanStore((s) => s.addTechniqueNote);
  const updateTechniqueNote = usePlanStore((s) => s.updateTechniqueNote);
  const removeTechniqueNote = usePlanStore((s) => s.removeTechniqueNote);
  const triggerCelebration = usePlanStore((s) => s.triggerCelebration);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const technique = currentPlan?.techniques.find((t) => t.id === params.id) ?? null;

  // Background JIT fetch state
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  
  // Persist slide index across refreshes
  useEffect(() => {
    if (!hydrated || !technique || !params?.id) return;

    if (technique.status === "skipped") {
      // Skip is reversible, never framed as a dead end (per copy-guidelines)
      // — and since the Skip button only exists on the last slide, "resuming"
      // a skipped technique would otherwise always silently land back on
      // the Complete-Lesson screen the user just declined. Force a fresh
      // start at the Introduction instead.
      sessionStorage.removeItem(`slideIndex-${params.id}`);
      return;
    }

    const saved = sessionStorage.getItem(`slideIndex-${params.id}`);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSlideIndex(parsed);
      }
    }
  }, [hydrated, technique, params?.id]);

  useEffect(() => {
    if (hydrated && params?.id) {
      sessionStorage.setItem(`slideIndex-${params.id}`, slideIndex.toString());
    }
  }, [slideIndex, hydrated, params?.id]);

  const { video, reading, audio } = useMemo(() => {
    return technique ? categorizeResources(technique.resources) : { video: [], reading: [], audio: [] };
  }, [technique]);

  const renderSlideHeader = (title: string, showSource: boolean = false) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h1 className="font-heading text-3xl font-bold text-text-primary">{title}</h1>
      {showSource && reading.length > 0 && (
        <SourceChip url={reading[0].url} sourceName={reading[0].sourceName} />
      )}
    </div>
  );

  useEffect(() => {
    if (!hydrated || !technique || !currentPlan) return;
    if (technique.lesson || fetchState !== "idle") return;

    const readingResource = reading[0];
    if (!readingResource) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFetchState("error");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetchState("loading");
    const searchParams = new URLSearchParams({
      url: readingResource.url,
      hobbyName: currentPlan.hobbyName,
      level: currentPlan.level,
      techniqueName: technique.name,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout, just under Vercel's 60s limit

    fetch(`/api/read-article?${searchParams.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        clearTimeout(timeoutId);
        if (data.error) {
          console.warn("[JIT Fetch Error]:", data.error);
          setFetchState("error");
          return;
        }
        setTechniqueLesson(technique.id, data);
        setFetchState("success");
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error("[JIT Fetch Error/Timeout]:", err);
        setFetchState("error");
      });
  }, [hydrated, technique, currentPlan, fetchState, reading, setTechniqueLesson]);

  if (!hydrated) {
    return <div className="min-h-dvh bg-background" />;
  }

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

  const slides: { id: string; title: string; icon: LucideIcon }[] = [];
  slides.push({ id: "intro", title: "Introduction", icon: Info });
  if (video.length > 0) slides.push({ id: "video", title: "Watch & Learn", icon: Play });
  if (reading.length > 0) {
    slides.push({ id: "howItWorks", title: "How it Works", icon: BookOpen });
    slides.push({ id: "mistakesTips", title: "Watch Out For", icon: AlertTriangle });
  }
  
  if (audio.length > 0) {
    slides.push({ id: "podcast", title: "Podcast", icon: Headphones });
  }
  
  slides.push({ id: "master", title: "Master", icon: Flame });

  const currentSlide = slides[slideIndex];
  const hasPrev = slideIndex > 0;
  const hasNext = slideIndex < slides.length - 1;

  function paginate(newDirection: number) {
    const nextIndex = slideIndex + newDirection;
    if (nextIndex >= 0 && nextIndex < slides.length) {
      setDirection(newDirection);
      setSlideIndex(nextIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  const needsAI = ["howItWorks", "mistakesTips", "podcast"].includes(currentSlide.id);
  const isAILoading = needsAI && !technique.lesson && fetchState !== "error";
  const isAIError = needsAI && fetchState === "error";

  return (
    <div className="relative min-h-dvh bg-background pb-28 overflow-x-hidden">
      <div className="sticky top-0 z-30 bg-background/95 px-4 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3 pr-12">
          <Link
            href="/"
            className="-ml-2 flex min-h-11 items-center gap-1.5 rounded-md px-2 font-label text-sm font-semibold text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Exit</span>
          </Link>
          <div className="flex-1" />
          <span className="font-label text-sm font-semibold text-text-primary text-right line-clamp-2 max-w-[150px] sm:max-w-xs">
            {technique.name}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-8 relative min-h-[60vh]">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={slideIndex}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
              center: { zIndex: 1, x: 0, opacity: 1 },
              exit: (dir: number) => ({ zIndex: 0, x: dir < 0 ? 300 : -300, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.2 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              const SWIPE_THRESHOLD = 50;
              if (info.offset.x < -SWIPE_THRESHOLD) {
                if (hasNext && !(needsAI && (isAILoading || isAIError))) paginate(1);
              } else if (info.offset.x > SWIPE_THRESHOLD) {
                if (hasPrev) paginate(-1);
              }
            }}
            style={{ touchAction: "pan-y" }}
            className="w-full flex flex-col gap-6"
          >
            {currentSlide.id === "intro" && (
              <div className="flex flex-col gap-6">
                {(() => {
                  const ytMatch = video.length > 0 ? video[0].url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/) : null;
                  const ytId = ytMatch ? ytMatch[1] : null;
                  
                  if (!ytId) return null;

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const videoIdx = slides.findIndex((s) => s.id === "video");
                        if (videoIdx !== -1) {
                          setDirection(videoIdx > slideIndex ? 1 : -1);
                          setSlideIndex(videoIdx);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      aria-label={`Watch the video for ${technique.name}`}
                      className="group relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden shadow-sm border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
                    >
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                        alt={technique.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex size-14 items-center justify-center rounded-full bg-black/50 text-white transition-transform duration-150 group-hover:scale-110 group-hover:bg-black/60">
                          <Play size={24} fill="currentColor" className="ml-1" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  );
                })()}
                
                <div>
                  {renderSlideHeader("Introduction", true)}
                  <p className="font-sans text-lg text-text-muted leading-relaxed mt-4">
                    {technique.lesson?.intro || technique.description}
                  </p>
                </div>
                
                <div className="rounded-2xl bg-surface-2 p-6 border border-border shadow-sm mt-2">
                  <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">Why it matters for you</h3>
                  <p className="font-sans text-base text-text-muted">{technique.rationale}</p>
                </div>
              </div>
            )}

            {currentSlide.id === "video" && (
              <div className="flex flex-col gap-6">
                {renderSlideHeader("Watch & Learn")}
                <div className="rounded-2xl border border-border bg-surface-1 p-3 shadow-sm">
                  <VideoSection resources={video} />
                </div>
              </div>
            )}

            {isAILoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="w-48 h-48">
                  <Lottie animationData={thinkingAnimation} loop={true} />
                </div>
                <p className="font-sans text-lg font-semibold text-text-muted animate-pulse">
                  Synthesizing your custom lesson...
                </p>
              </div>
            )}

            {isAIError && !technique.lesson && (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <p className="font-sans text-text-muted">We couldn&apos;t generate the AI lesson for this technique right now.</p>
                {reading.length > 0 && (
                  <a
                    href={reading[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold"
                  >
                    Read the source article directly
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setFetchState("idle")}
                  className="mt-4 rounded-md bg-mascot-body px-5 py-2.5 font-label text-sm font-semibold text-white transition-colors hover:bg-mascot-body/90 shadow-sm"
                >
                  Try again
                </button>
              </div>
            )}

            {!isAILoading && !isAIError && technique.lesson && (
              <>
                {currentSlide.id === "howItWorks" && (
                  <div className="flex flex-col gap-6">
                    {renderSlideHeader("How it Works", true)}
                    {typeof technique.lesson.howItWorks === "string" ? (
                      <div className="rounded-2xl border border-border bg-surface-1 p-6 sm:p-8 shadow-sm">
                        <MarkdownLite text={technique.lesson.howItWorks as unknown as string} />
                      </div>
                    ) : (
                      <HowItWorksTimeline
                        overview={technique.lesson.howItWorks?.overview || ""}
                        steps={technique.lesson.howItWorks?.steps || []}
                      />
                    )}
                    {technique.lesson.images && technique.lesson.images.length > 0 && (
                      <div className="flex flex-col gap-4">
                        {technique.lesson.images.map((image, idx) => (
                          <ImageCard key={idx} url={image.url} caption={image.caption} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentSlide.id === "mistakesTips" && (
                  <div className="flex flex-col gap-6">
                    {renderSlideHeader("Watch Out For", true)}
                    <ProsConsList
                      tips={technique.lesson.mistakesTips?.tips || []}
                      mistakes={technique.lesson.mistakesTips?.mistakes || []}
                    />
                  </div>
                )}

                {currentSlide.id === "podcast" && audio.length > 0 && (
                  <div className="flex flex-col gap-6 w-full h-full pb-8">
                    <PodcastMode audioResource={audio[0]} />
                  </div>
                )}
              </>
            )}

            {currentSlide.id === "master" && (
              <div className="flex flex-col gap-8 py-6">
                <div className="text-center flex flex-col items-center">
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
                    className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10"
                  >
                    <CheckCircle size={40} strokeWidth={2.5} />
                  </motion.div>
                  <h1 className="font-heading text-3xl font-bold text-text-primary mb-3">Nice work — ready to lock this in?</h1>
                  <p className="font-sans text-base text-text-muted max-w-md mx-auto">
                    Jot down anything that clicked — future you will thank you.
                  </p>
                </div>

                {technique.lesson?.keyTakeaways && technique.lesson.keyTakeaways.length > 0 && (
                  <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full px-2">
                    <h2 className="font-heading text-lg font-bold text-text-primary">
                      Key Takeaways
                    </h2>
                    <ul className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-2 p-5 shadow-sm">
                      {technique.lesson.keyTakeaways.map((point, idx) => (
                        <li key={idx} className="group flex items-start justify-between gap-3 font-sans text-sm text-text-muted">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <CheckCircle size={12} strokeWidth={3} aria-hidden="true" />
                            </span>
                            <span className="[&_p]:m-0">
                              <MarkdownLite text={point} />
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              addTechniqueNote(technique.id, {
                                title: "Key Takeaway",
                                description: point,
                              });
                              setIsNotesOpen(true);
                            }}
                            title="Add to Notes"
                            className="flex shrink-0 items-center justify-center rounded-full p-1 text-text-muted transition-all hover:bg-surface-3 hover:text-primary sm:p-1.5"
                          >
                            <Plus size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full px-2">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-heading text-lg font-bold text-text-primary">
                      Your Lesson Notes
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenNoteId(null);
                        setIsNotesOpen(true);
                      }}
                      className="text-primary text-sm font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus size={16} /> Add Note
                    </button>
                  </div>
                  
                  {technique.notes && technique.notes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {technique.notes.map(note => (
                        <div 
                          key={note.id} 
                          onClick={() => {
                            setOpenNoteId(note.id);
                            setIsNotesOpen(true);
                          }}
                          className="rounded-2xl border border-border bg-surface-1 p-5 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all text-left group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-heading font-semibold text-text-primary truncate pr-2 group-hover:text-primary transition-colors">{note.title}</h3>
                            <Edit3 size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </div>
                          <p className="font-sans text-sm text-text-muted line-clamp-3 leading-relaxed">{note.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border border-dashed bg-surface-1/50 p-10 text-center flex flex-col items-center justify-center">
                      <p className="font-sans text-text-muted mb-4">You haven&apos;t taken any notes for this lesson yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenNoteId(null);
                          setIsNotesOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-surface-2 px-5 py-2.5 font-label text-sm font-semibold text-text-primary hover:bg-surface-3 transition-colors shadow-sm border border-border/50"
                      >
                        <Edit3 size={16} />
                        Add your first note
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-center pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleMastered}
                    className="
                      inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] px-8 py-3 w-full sm:w-auto
                      bg-gradient-to-r from-cta-start via-cta-mid to-cta-end
                      font-label text-base font-semibold tracking-wide text-cta-foreground
                      shadow-[0_0_12px_rgba(198,105,0,0.3)]
                      hover:shadow-[0_0_20px_rgba(198,105,0,0.5)]
                      transition-shadow duration-150 ease-out
                    "
                  >
                    <Flame size={18} aria-hidden="true" />
                    Complete Lesson
                  </motion.button>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="min-h-11 rounded-md px-3 py-2 font-label text-sm font-semibold text-text-muted transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
                  >
                    Skip this technique
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <div className="flex justify-center gap-1.5 px-4">
            {slides.map((s, idx) => (
              <div 
                key={s.id} 
                className={`h-1.5 rounded-full transition-all duration-300 flex-1 max-w-[40px] ${
                  idx === slideIndex ? "bg-primary" : 
                  idx < slideIndex ? "bg-primary/40" : "bg-border"
                }`} 
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex shrink-0 justify-start">
              <button
                type="button"
                onClick={() => hasPrev && paginate(-1)}
                disabled={!hasPrev}
                className={`flex shrink-0 min-w-11 items-center gap-1.5 rounded-full px-3 py-2 font-label text-sm font-semibold transition-colors duration-150 ${!hasPrev ? 'opacity-0 pointer-events-none' : 'text-text-primary hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body'}`}
              >
                <ArrowLeft size={16} aria-hidden="true" className="shrink-0" />
                <span className="hidden sm:inline">Back</span>
              </button>
            </div>

            <div className="flex items-center gap-2 justify-center flex-1 min-w-0 px-2 md:absolute md:left-1/2 md:-translate-x-1/2 pointer-events-none">
              {currentSlide.icon && <currentSlide.icon size={16} className="text-mascot-body shrink-0" />}
              <span className="font-label text-sm font-semibold text-text-primary truncate">{currentSlide.title}</span>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1">
              {audio.length > 0 && currentSlide.id !== "podcast" && (
                <button
                  type="button"
                  onClick={() => {
                    const podcastIdx = slides.findIndex(s => s.id === "podcast");
                    if (podcastIdx !== -1) {
                      setDirection(podcastIdx > slideIndex ? 1 : -1);
                      setSlideIndex(podcastIdx);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  title="Go to Podcast Mode"
                  className="flex shrink-0 items-center justify-center w-10 h-10 rounded-full text-primary hover:bg-primary/10 transition-colors mr-1 sm:mr-2"
                >
                  <Headphones size={18} className="shrink-0" />
                </button>
              )}

              <button
                type="button"
                onClick={() => hasNext && paginate(1)}
                disabled={!hasNext || (needsAI && (isAILoading || isAIError))}
                className={`flex shrink-0 min-w-11 items-center justify-end gap-1.5 rounded-full px-3 py-2 font-label text-sm font-semibold transition-colors duration-150 ${!hasNext ? 'opacity-0 pointer-events-none' : 'text-primary hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body disabled:opacity-30 disabled:hover:bg-transparent'}`}
              >
                <span className="hidden sm:inline">Next</span>
                {hasNext && <Play size={16} aria-hidden="true" className="shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpenNoteId(null);
                  setIsNotesOpen(true);
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 border border-border px-3 py-1.5 font-label text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body ml-1"
              >
                <Edit3 size={14} className="shrink-0" />
                <span className="hidden sm:inline">Notes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <NotesDrawer
        isOpen={isNotesOpen}
        notes={technique.notes || []}
        onClose={() => setIsNotesOpen(false)}
        onAdd={(note) => addTechniqueNote(technique.id, note)}
        onUpdate={(noteId, note) => updateTechniqueNote(technique.id, noteId, note)}
        onRemove={(noteId) => removeTechniqueNote(technique.id, noteId)}
        openNoteId={openNoteId}
        setOpenNoteId={setOpenNoteId}
      />
    </div>
  );
}
