"use client";

import { useState } from "react";

// Full-size, native-feeling image card — deliberately not a chip. Images
// from the source article are the actual lesson content (a diagrammed
// stance, a board position), not just a reference link, so they render
// fully visible with a caption, styled like a real app card. Gracefully
// disappears rather than showing a broken-image icon if the model's
// reported URL 404s — an AI-sourced URL is never trusted as guaranteed-valid.
interface ImageCardProps {
  url: string;
  caption: string;
}

export function ImageCard({ url, caption }: ImageCardProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-sm">
      <img
        src={url}
        alt={caption || "Illustration"}
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-full h-auto object-cover"
      />
      {caption && (
        <figcaption className="px-4 py-3 font-sans text-sm text-text-muted">{caption}</figcaption>
      )}
    </figure>
  );
}
