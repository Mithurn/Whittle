import { NextRequest, NextResponse } from "next/server";
import {
  GeneratePlanRequestSchema,
  AIPlanResponseSchema,
  MIN_TECHNIQUES,
  MAX_TECHNIQUES,
  type GeneratePlanRequest,
  type AIPlanResponse,
} from "@/lib/schemas";
import type { HobbyPlan, Resource } from "@/types/domain";

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function devLog(label: string, usage: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[generate-plan] ${label} usage:`, usage);
  }
}

// Mirrors AIPlanResponseSchema — hand-written to avoid an extra
// zod-to-json-schema dependency for what is a small, stable shape.
const AI_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    techniques: {
      type: "array",
      minItems: MIN_TECHNIQUES,
      maxItems: MAX_TECHNIQUES,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          rationale: { type: "string" },
          resources: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["video", "reading", "audio"] },
                title: { type: "string" },
                url: { type: "string" },
                whyChosen: { type: "string" },
              },
              required: ["type", "title", "url", "whyChosen"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "description", "rationale", "resources"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "techniques"],
  additionalProperties: false,
} as const;

const RATIONALE_LENGTH_RULE =
  `Keep each technique's "rationale" short and punchy — one sentence, maximum 15 words, no matter how long the source material is.`;

const STRUCTURING_SYSTEM_PROMPT =
  "Convert the input into JSON matching the schema exactly. " +
  "CRITICAL URL RULE: Set every single resource 'url' field to the exact string 'https://placeholder.com'. " +
  RATIONALE_LENGTH_RULE;

function describeInput(input: GeneratePlanRequest): string {
  const known =
    input.knownTopics.length > 0
      ? `They already know: ${input.knownTopics.join(", ")}.`
      : "They are starting from scratch.";
  return `Hobby: ${input.hobbyName}. Skill level: ${input.level}. Goal: ${input.goal}. Time commitment: ${input.timeCommitment}. ${known}`;
}

const SEQUENCING_RULE =
  `Sequence techniques strictly from foundational to advanced — never place a technique before ` +
  `the prerequisite skills it depends on. Each technique should build on the ones before it.`;

const RESOURCE_MIX_RULE =
  `Each technique must have exactly 3 resources: one video, one reading/article, and one additional resource ` +
  `(either audio or another reading/article, whichever fits the technique better) — never audio-only for a ` +
  `technique that requires seeing physical form.`;

function buildSkeletonPrompt(input: GeneratePlanRequest): string {
  return (
    `${describeInput(input)}\n\n` +
    `Create a learning plan with ${MIN_TECHNIQUES}-${MAX_TECHNIQUES} techniques for this hobby. ${SEQUENCING_RULE} ${RATIONALE_LENGTH_RULE} ` +
    `Tailor the plan to the stated skill level, goal, and what they already know. ` +
    `For each technique's resources, write a plausible title and resource type. ${RESOURCE_MIX_RULE} ` +
    `Write a one-line reason each resource fits this user. For the "url" field, write exactly "https://placeholder.com" — it will be filled in automatically later. ` +
    `Also include a one-line summary tying the plan to their goal.`
  );
}

async function callSerper(query: string, endpoint: "search" | "videos"): Promise<{ url: string; title: string }[] | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://google.serper.dev/${endpoint}`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query, num: 1 })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (endpoint === "search" && data.organic?.length > 0) {
      return data.organic.map((r: any) => ({ url: r.link, title: r.title }));
    }
    if (endpoint === "videos" && data.videos?.length > 0) {
      return data.videos.map((r: any) => ({ url: r.link, title: r.title }));
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function enrichPlanWithSerper(plan: AIPlanResponse, hobbyName: string): Promise<AIPlanResponse> {
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
          if (!videoResults) videoResults = await callSerper(`${technique.name} ${hobbyName} tutorial`, "videos");
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

async function callChatJsonSchema(
  endpoint: string,
  apiKey: string,
  model: string,
  userContent: string
): Promise<unknown> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: STRUCTURING_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "hobby_plan", strict: true, schema: AI_PLAN_JSON_SCHEMA },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`${endpoint} responded with ${res.status}`);
  }

  const data = await res.json();
  devLog(endpoint, data.usage);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`${endpoint} returned no message content`);
  }
  return JSON.parse(content);
}

async function callGroq(userContent: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  return callChatJsonSchema(GROQ_ENDPOINT, apiKey, GROQ_MODEL, userContent);
}

function hasDuplicateResourceUrls(plan: AIPlanResponse): boolean {
  const urls = plan.techniques.flatMap((technique) =>
    technique.resources.map((resource) => resource.url)
  );
  // Exclude placeholders from uniqueness check
  const actualUrls = urls.filter(u => u !== "https://placeholder.com" && u !== "UNMATCHED");
  return new Set(actualUrls).size !== actualUrls.length;
}

async function structureWithFallback(userContent: string): Promise<AIPlanResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGroq(userContent);
      const parsed = AIPlanResponseSchema.safeParse(raw);
      if (parsed.success && !hasDuplicateResourceUrls(parsed.data)) return parsed.data;
      lastError = parsed.success ? new Error("Duplicate resource URLs across plan") : parsed.error;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error("Groq structuring failed schema/duplicate-URL validation twice", {
    cause: lastError,
  });
}

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

function constructSearchUrl(resource: { type: string; title: string }, hobbyName: string): string {
  const query = encodeURIComponent(`${resource.title} ${hobbyName}`);
  return resource.type === "video"
    ? `https://www.youtube.com/results?search_query=${query}`
    : `https://www.google.com/search?q=${query}`;
}

function toHobbyPlan(input: GeneratePlanRequest, aiPlan: AIPlanResponse): HobbyPlan {
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

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsedRequest = GeneratePlanRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsedRequest.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsedRequest.data;

  try {
    const rawSkeleton = await structureWithFallback(buildSkeletonPrompt(input));
    const enrichedPlan = await enrichPlanWithSerper(rawSkeleton, input.hobbyName);
    return NextResponse.json(toHobbyPlan(input, enrichedPlan), { status: 200 });
  } catch (err) {
    console.error("[generate-plan] failed after all fallbacks", err);
    return NextResponse.json(
      { error: "We couldn't generate your plan right now. Please try again in a moment." },
      { status: 502 }
    );
  }
}
