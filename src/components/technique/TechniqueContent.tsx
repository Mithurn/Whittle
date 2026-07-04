"use client";

import { getYouTubeEmbedUrl } from "@/lib/youtube";
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
