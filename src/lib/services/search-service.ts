import type { AIPlanResponse } from "@/lib/schemas";

// Minimal shape of what we actually read from Serper's raw response — typed
// properly instead of `any`; the fields used here are simple and stable
// enough not to need one.
interface SerperRawItem {
  link: string;
  title: string;
}
interface SerperResponse {
  organic?: SerperRawItem[];
  videos?: SerperRawItem[];
}

// The shape callSerper actually returns — link renamed to url, matching
// what Resource/constructSearchUrl expect throughout the rest of this file.
interface SerperResultItem {
  url: string;
  title: string;
}

const SERPER_TIMEOUT_MS = 5000;

// No `num` param — Serper's own default (verified live: 9 organic / 10
// video results per query) gives the per-type result cache below
// (videoResults/readingResults/audioResults) enough headroom to serve a
// technique with two "reading"-type resources (see RESOURCE_MIX_RULE) by
// indexing further into the same array. An earlier version explicitly
// passed num:1, which reproducibly capped every query to exactly 1 result —
// confirmed against the live API, not assumed — silently starving that
// second resource every time.
async function callSerper(query: string, endpoint: "search" | "videos"): Promise<SerperResultItem[] | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);
  try {
    const res = await fetch(`https://google.serper.dev/${endpoint}`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: SerperResponse = await res.json();
    const items = endpoint === "search" ? data.organic : data.videos;
    return items && items.length > 0 ? items.map((r) => ({ url: r.link, title: r.title })) : null;
  } catch {
    // Timeout (via the abort above) or any network failure — the caller's
    // existing per-resource fallback to constructSearchUrl handles this.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function constructSearchUrl(resource: { type: string; title: string }, hobbyName: string): string {
  const query = encodeURIComponent(`${resource.title} ${hobbyName}`);
  return resource.type === "video"
    ? `https://www.youtube.com/results?search_query=${query}`
    : `https://www.google.com/search?q=${query}`;
}

export async function enrichPlanWithSerper(plan: AIPlanResponse, hobbyName: string): Promise<AIPlanResponse> {
  const updatedTechniques = await Promise.all(
    plan.techniques.map(async (technique) => {
      let videoResults: {url: string, title: string}[] | null = null;
      let readingResults: {url: string, title: string}[] | null = null;
      let audioResults: {url: string, title: string}[] | null = null;
      let videoCount = 0;
      let readingCount = 0;
      let audioCount = 0;

      const updatedResources = [];
      for (const res of technique.resources) {
        let finalUrl = res.url;
        let finalTitle = res.title;

        if (res.type === "video") {
          // Constrained to YouTube specifically (not just Serper's generic
          // "videos" search, which can surface other hosts) so the result
          // is guaranteed embeddable via getYouTubeEmbedUrl in the UI —
          // never a video-typed resource the player can't actually play in-app.
          if (!videoResults)
            videoResults = await callSerper(`${technique.name} ${hobbyName} tutorial site:youtube.com`, "videos");
          if (videoResults && videoResults.length > videoCount) {
            finalUrl = videoResults[videoCount].url;
            finalTitle = videoResults[videoCount].title;
          } else {
            finalUrl = constructSearchUrl(res, hobbyName);
          }
          videoCount++;
        } else if (res.type === "reading") {
          if (!readingResults) readingResults = await callSerper(`${technique.name} ${hobbyName} guide article -site:youtube.com`, "search");
          if (readingResults && readingResults.length > readingCount) {
            finalUrl = readingResults[readingCount].url;
            finalTitle = readingResults[readingCount].title;
          } else {
            finalUrl = constructSearchUrl(res, hobbyName);
          }
          readingCount++;
        } else if (res.type === "audio") {
          if (!audioResults) audioResults = await callSerper(`${technique.name} ${hobbyName} podcast episode`, "search");
          if (audioResults && audioResults.length > audioCount) {
            finalUrl = audioResults[audioCount].url;
            finalTitle = audioResults[audioCount].title;
          } else {
            finalUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(technique.name + " " + hobbyName + " podcast audio")}`;
          }
          audioCount++;
        }

        updatedResources.push({ ...res, url: finalUrl, title: finalTitle });
      }

      return { ...technique, resources: updatedResources };
    })
  );
  return { ...plan, techniques: updatedTechniques };
}
