import type { AIPlanResponse, GeneratePlanRequest } from "@/lib/schemas";
import type { HobbyPlan, Resource } from "@/types/domain";
import { constructSearchUrl } from "./search-service";

const KNOWN_SOURCE_NAMES: Record<string, string> = {
  "youtube.com": "YouTube",
  "chess.com": "Chess.com",
  "lichess.org": "Lichess",
  "google.com": "Google Search",
};

function deriveSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname in KNOWN_SOURCE_NAMES) return KNOWN_SOURCE_NAMES[hostname];
    const label = hostname.split(".")[0];
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return "Unknown source";
  }
}

// Real duplicates can only happen post-enrichment (see llm-service's
// structureWithFallback) — e.g. two resources' Serper queries landing on
// the same top result. Rather than retry the whole Groq call (burns tokens
// for a problem that's cheap to fix locally), this just walks the plan
// once and swaps any URL that's already been seen for its own
// constructSearchUrl fallback, keeping first-seen as the "real" one.
export function dedupeResourceUrls(plan: AIPlanResponse, hobbyName: string): AIPlanResponse {
  const seen = new Set<string>();

  // enrichPlanWithSerper overwrites `title` with the real result's title
  // (to keep title/link coherent) — so when two resources' searches land
  // on the exact same real page, they end up with the same title too
  // (title describes the destination, not the query that found it). That
  // means a naive constructSearchUrl fallback can *also* collide for both.
  // This keeps disambiguating with a counter until it lands on something
  // unseen, rather than assuming one fallback pass is always enough.
  function uniqueFallback(resource: { type: string; title: string }): string {
    let url = constructSearchUrl(resource, hobbyName);
    let disambiguator = 1;
    while (seen.has(url)) {
      disambiguator++;
      url = constructSearchUrl({ ...resource, title: `${resource.title} ${disambiguator}` }, hobbyName);
    }
    return url;
  }

  return {
    ...plan,
    techniques: plan.techniques.map((technique) => ({
      ...technique,
      resources: technique.resources.map((resource) => {
        if (!seen.has(resource.url)) {
          seen.add(resource.url);
          return resource;
        }
        const url = uniqueFallback(resource);
        seen.add(url);
        return { ...resource, url };
      }),
    })),
  };
}

export function toHobbyPlan(input: GeneratePlanRequest, aiPlan: AIPlanResponse): HobbyPlan {
  return {
    id: crypto.randomUUID(),
    hobbyName: input.hobbyName,
    level: input.level,
    goal: input.goal,
    timeCommitment: input.timeCommitment,
    knownTopics: input.knownTopics,
    summary: aiPlan.summary,
    createdAt: new Date().toISOString(),
    techniques: aiPlan.techniques.map((technique, order) => ({
      id: crypto.randomUUID(),
      name: technique.name,
      description: technique.description,
      rationale: technique.rationale,
      status: "not_started",
      order,
      resources: technique.resources.map((resource): Resource => ({
        id: crypto.randomUUID(),
        type: resource.type,
        title: resource.title,
        url: resource.url,
        sourceName: deriveSourceName(resource.url),
        whyChosen: resource.whyChosen,
      })),
    })),
  };
}
