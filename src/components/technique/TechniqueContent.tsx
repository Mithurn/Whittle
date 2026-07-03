"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Headphones } from "lucide-react";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { MarkdownLite } from "@/components/MarkdownLite";
import type { Resource } from "@/types/domain";

function ResourceMeta({ resource }: { resource: Resource }) {
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-sans text-base font-semibold text-text-primary">{resource.title}</span>
        <span className="rounded-full bg-surface-1 px-2 py-0.5 font-label text-[10px] font-semibold tracking-wide text-text-muted uppercase">
          {resource.sourceName}
        </span>
      </div>
      <p className="mt-1 font-sans text-sm text-text-muted">{resource.whyChosen}</p>
    </div>
  );
}

// Prominent and ready to play the moment the tab is opened — no "Open
// Video" click required.
export function VideoSection({ resources }: { resources: Resource[] }) {
  return (
    <div className="flex flex-col gap-10">
      {resources.map((resource) => {
        const embedUrl = getYouTubeEmbedUrl(resource.url);
        if (!embedUrl) return null;
        return (
          <div key={resource.id}>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm">
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

type ArticleFetchState = { status: "loading" } | { status: "loaded"; content: string } | { status: "error" };

interface ArticleSectionProps {
  resource: Resource;
  cache: React.RefObject<Map<string, string>>;
  hobbyName?: string;
  level?: string;
}

// Auto-fetches the moment this section renders — no extra click to enter
// "reader mode". Each article manages its own fetch lifecycle so one slow/
// failing source never blocks another.
function ArticleSection({ resource, cache, hobbyName, level }: ArticleSectionProps) {
  const [state, setState] = useState<ArticleFetchState>(() => {
    const cached = cache.current.get(resource.id);
    return cached ? { status: "loaded", content: cached } : { status: "loading" };
  });

  useEffect(() => {
    if (state.status !== "loading") return;
    let cancelled = false;
    const params = new URLSearchParams({ url: resource.url });
    if (hobbyName) params.set("hobbyName", hobbyName);
    if (level) params.set("level", level);
    fetch(`/api/read-article?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`read-article responded with ${res.status}`);
        const data: { content?: string } = await res.json();
        if (!data.content || !data.content.trim()) throw new Error("read-article returned empty content");
        cache.current.set(resource.id, data.content);
        if (!cancelled) setState({ status: "loaded", content: data.content });
      })
      .catch((err) => {
        // Graceful degradation: r.jina.ai is a free, no-SLA third-party
        // service — falls back to a clickable external-link card rather
        // than auto-opening a new tab, since fetching starts automatically
        // on render, not from a direct click (an unprompted popup at that
        // point is a worse surprise and likely blocked by the browser
        // anyway, since it isn't a direct result of a user gesture).
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
      <div className="mt-5">
        {state.status === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
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
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-4 font-sans text-sm text-text-primary transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <BookOpen size={18} className="shrink-0 text-primary" aria-hidden="true" />
            Couldn&apos;t load this article in-app — open on {resource.sourceName}
          </a>
        )}
      </div>
    </div>
  );
}

export function ReadingSection({
  resources,
  hobbyName,
  level,
}: {
  resources: Resource[];
  hobbyName?: string;
  level?: string;
}) {
  const cache = useRef<Map<string, string>>(new Map());
  return (
    <div className="flex flex-col gap-10">
      {resources.map((resource) => (
        <ArticleSection key={resource.id} resource={resource} cache={cache} hobbyName={hobbyName} level={level} />
      ))}
    </div>
  );
}

// Genuinely non-video audio only — anything that resolved to a real
// YouTube embed already went to the Video tab (see technique-tabs.ts).
export function AudioSection({ resources }: { resources: Resource[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {resources.map((resource) => (
        <li key={resource.id}>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-4 transition-colors duration-150 hover:bg-surface-2/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-1 text-primary">
              <Headphones size={20} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-base font-semibold text-text-primary">{resource.title}</span>
                <span className="shrink-0 rounded-full bg-surface-1 px-2 py-0.5 font-label text-[10px] font-semibold tracking-wide text-text-muted uppercase">
                  {resource.sourceName}
                </span>
              </span>
              <span className="font-sans text-sm text-text-muted">{resource.whyChosen}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
