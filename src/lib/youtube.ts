// Resources can be embedded natively when their URL is a real YouTube link
// — checked directly on the URL itself, not on the resource's stated
// `type`. Serper's generic "podcast" search for an audio-typed resource has
// been observed live to land on a YouTube video page, not an actual audio
// source (see search-service.ts) — trusting `type` alone would either miss
// an embeddable video or (worse) try to embed a non-video page. Checking
// the resolved URL's hostname instead makes this correct regardless of
// what type the AI assigned.
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

export function getYouTubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(hostname)) return null;

  if (hostname === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (parsed.pathname === "/watch") {
    const id = parsed.searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;

  const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)/);
  if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;

  return null;
}
