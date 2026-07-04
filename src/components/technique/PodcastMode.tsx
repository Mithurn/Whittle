"use client";

import { Headphones, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";

interface PodcastModeProps {
  audioResource?: {
    title: string;
    url: string;
  };
}

export function PodcastMode({ audioResource }: PodcastModeProps) {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // If no audio resource, show fallback
  if (!audioResource) {
    return (
      <div className="flex flex-col gap-6 relative h-[480px] w-full max-w-2xl mx-auto rounded-3xl bg-surface-1 border border-border overflow-hidden shadow-sm items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-text-muted mb-4 opacity-50" />
        <h3 className="text-xl font-heading font-bold text-text-primary">No Podcast Found</h3>
        <p className="text-text-muted">We couldn&apos;t find a reliable podcast episode for this specific technique.</p>
      </div>
    );
  }

  const { url, title } = audioResource;
  let embedUrl = "";
  let platform = "";

  if (url.includes("open.spotify.com/episode")) {
    embedUrl = url.replace("open.spotify.com/episode", "open.spotify.com/embed/episode");
    platform = "Spotify";
  } else if (url.includes("podcasts.apple.com")) {
    // Apple embeds require a specific format. Apple usually defaults to the user's OS theme, 
    // but we can append theme=dark to force it to match our app.
    embedUrl = url.replace("podcasts.apple.com", "embed.podcasts.apple.com");
    embedUrl += embedUrl.includes("?") ? "&theme=dark" : "?theme=dark";
    platform = "Apple Podcasts";
  } else if (url.includes("soundcloud.com")) {
    embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
    platform = "SoundCloud";
  }

  const handleIframeLoad = () => {
    // Iframe onLoad fires when the HTML loads, but Apple/Spotify take an extra 
    // second to paint their internal UI. We delay hiding the loader to prevent the grey flash.
    setTimeout(() => {
      setIsIframeLoading(false);
    }, 4000);
  };

  return (
    <div className="flex flex-col w-full h-full max-w-4xl mx-auto pt-2">
      {embedUrl ? (
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          {/* We just let the iframe render without an extra dark container around it */}
          <div className="relative w-full h-[450px] rounded-2xl overflow-hidden">
            
            {/* Extended Loading Skeleton */}
            <div 
              className={`absolute inset-0 flex flex-col items-center justify-center gap-4 z-0 transition-opacity duration-700 bg-surface-2 ${isIframeLoading ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
                <div className="w-12 h-12 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" />
                <Headphones size={16} className="absolute text-primary/70" />
              </div>
              <span className="text-sm font-label text-text-muted font-medium tracking-wide">Tuning into {platform}...</span>
            </div>

            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              onLoad={handleIframeLoad}
              className={`absolute inset-0 w-full h-full z-10 transition-opacity duration-1000 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
            ></iframe>
          </div>

          {/* Minimal Source Link */}
          <div className="flex justify-end px-2">
            <Link 
              href={url}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-label font-medium text-text-muted hover:text-primary transition-colors"
            >
              Listen natively on {platform} <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px] text-center max-w-md mx-auto rounded-2xl border border-border/40 bg-surface-1/50">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Headphones size={28} className="text-primary" />
          </div>
          <h3 className="text-xl font-heading font-bold text-text-primary mb-3 line-clamp-2 px-6">{title}</h3>
          <p className="text-text-muted mb-8 px-8">This specific podcast couldn&apos;t be embedded, but you can listen to it directly on the web.</p>
          <Link 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 bg-primary text-background font-label font-bold hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            Open Podcast <ExternalLink size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
