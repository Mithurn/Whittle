"use client";

import { ExternalLink } from "lucide-react";

// Small, clickable pill for an external source backing the lesson (the
// scraped article, a Reddit thread, etc.) — deliberately lightweight,
// unlike ImageCard's full-size treatment. Extracted from the inline markup
// that used to live in TechniquePage's renderSlideHeader so it's a single,
// reusable definition instead of copy-pasted per slide.
interface SourceChipProps {
  url: string;
  sourceName: string;
}

export function SourceChip({ url, sourceName }: SourceChipProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 font-label text-xs font-semibold text-text-muted hover:bg-surface-3 hover:text-text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mascot-body"
    >
      <ExternalLink size={12} aria-hidden="true" />
      Source: {sourceName}
    </a>
  );
}
