import type { AIPlanResponse } from "@/lib/schemas";

// Minimal shape of what we actually read from Serper's raw response — typed
// properly instead of `any`; the fields used here are simple and stable
// enough not to need one.
interface SerperRawItem {
  link: string;
  title: string;
  duration?: string;
}
interface SerperResponse {
  organic?: SerperRawItem[];
  videos?: SerperRawItem[];
}

// The shape callSerper actually returns — link renamed to url, matching
// what Resource/constructSearchUrl expect throughout the rest of this file.
// durationSeconds is only ever populated for the "videos" endpoint —
// verified live: Serper's video results include a real "17:41"-style
// duration string per result, which is what makes time-budget-aware video
// selection possible without any extra API call.
interface SerperResultItem {
  url: string;
  title: string;
  durationSeconds: number | null;
}

const SERPER_TIMEOUT_MS = 5000;

function parseDurationToSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const parts = duration.split(":").map((p) => Number.parseInt(p, 10));
  if (parts.length === 0 || parts.some((p) => Number.isNaN(p))) return null;
  return parts.reduce((acc, part) => acc * 60 + part, 0);
}

// Maps the free-text-but-closed-set timeCommitment answer (see
// TimeCommitmentScreen.tsx's preset options) to how many minutes a single
// technique's session should roughly take. Not exact science — a genuine
// product judgment call, documented as such rather than left implicit.
const SESSION_BUDGET_MINUTES: Record<string, number> = {
  "15 mins a day": 15,
  "30 mins a day": 28,
  "A few hours a week": 45,
  "Weekends only": 70,
};
const DEFAULT_SESSION_BUDGET_MINUTES = 25;
// The video is the "hero" resource but not the whole session — the rest of
// the budget is implicitly left for the reading/audio resource.
const VIDEO_BUDGET_SHARE = 0.6;

export function getVideoTargetSeconds(timeCommitment: string): number {
  const sessionMinutes = SESSION_BUDGET_MINUTES[timeCommitment] ?? DEFAULT_SESSION_BUDGET_MINUTES;
  return Math.round(sessionMinutes * VIDEO_BUDGET_SHARE * 60);
}

// Picks whichever already-fetched candidate's duration is closest to the
// target — never fetches more results to find a "better" fit, and never
// excludes a technique's only video option just because every candidate
// runs long for a 15-minute budget (a worse video is still better than no
// video). Candidates with unknown duration are only used if nothing with a
// known duration exists at all.
function pickClosestDurationMatch(candidates: SerperResultItem[], targetSeconds: number): SerperResultItem {
  const withDuration = candidates.filter((c) => c.durationSeconds != null);
  const pool = withDuration.length > 0 ? withDuration : candidates;
  return pool.reduce((best, candidate) => {
    const bestDiff = Math.abs((best.durationSeconds ?? targetSeconds) - targetSeconds);
    const candidateDiff = Math.abs((candidate.durationSeconds ?? targetSeconds) - targetSeconds);
    return candidateDiff < bestDiff ? candidate : best;
  }, pool[0]);
}

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
    return items && items.length > 0
      ? items.map((r) => ({ url: r.link, title: r.title, durationSeconds: parseDurationToSeconds(r.duration) }))
      : null;
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

export async function enrichPlanWithSerper(
  plan: AIPlanResponse,
  hobbyName: string,
  timeCommitment: string
): Promise<AIPlanResponse> {
  const videoTargetSeconds = getVideoTargetSeconds(timeCommitment);

  const updatedTechniques = await Promise.all(
    plan.techniques.map(async (technique) => {
      let videoResults: SerperResultItem[] | null = null;
      let readingResults: SerperResultItem[] | null = null;
      let audioResults: SerperResultItem[] | null = null;
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
          if (videoResults && videoResults.length > 0) {
            const best = pickClosestDurationMatch(videoResults, videoTargetSeconds);
            finalUrl = best.url;
            finalTitle = best.title;
          } else {
            finalUrl = constructSearchUrl(res, hobbyName);
          }
        } else if (res.type === "reading") {
          if (!readingResults)
            readingResults = await callSerper(`${technique.name} ${hobbyName} guide article -site:youtube.com`, "search");
          if (readingResults && readingResults.length > readingCount) {
            finalUrl = readingResults[readingCount].url;
            finalTitle = readingResults[readingCount].title;
          } else {
            finalUrl = constructSearchUrl(res, hobbyName);
          }
          readingCount++;
        } else if (res.type === "audio") {
          if (!audioResults) {
            audioResults = await callSerper(
              `${technique.name} ${hobbyName} podcast episode (site:open.spotify.com/episode OR site:podcasts.apple.com OR site:soundcloud.com)`,
              "search"
            );
            // A podcast episode about one specific technique (e.g. "the
            // fork" in chess) is rare — most hobby podcasts talk about the
            // hobby broadly, not a single technique. Falling back to a
            // hobby-level query (still platform-restricted, so still
            // embeddable) finds a real, relevant episode far more often
            // than the narrow query alone, instead of falling all the way
            // to the non-embeddable YouTube search-results page below.
            if (!audioResults || audioResults.length === 0) {
              audioResults = await callSerper(
                `${hobbyName} podcast (site:open.spotify.com/episode OR site:podcasts.apple.com OR site:soundcloud.com)`,
                "search"
              );
            }
          }
          if (audioResults && audioResults.length > audioCount) {
            finalUrl = audioResults[audioCount].url;
            finalTitle = audioResults[audioCount].title;
          } else {
            // Fallback to youtube search if no embeddable podcast found
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
