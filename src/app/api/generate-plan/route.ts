import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  GeneratePlanRequestSchema,
  AIPlanResponseSchema,
  MIN_TECHNIQUES,
  MAX_TECHNIQUES,
  type GeneratePlanRequest,
  type AIPlanResponse,
} from "@/lib/schemas";
import type { HobbyPlan, Resource } from "@/types/domain";

const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Gemini's groundingChunks return a vertexaisearch.cloud.google.com redirect
// wrapper, not the real destination — resolving it is a single redirect hop
// (fetch with redirect:"manual", read Location), not a full page load, so
// this stays fast. Verified live: Node's fetch does NOT apply opaque-redirect
// response filtering server-side (that's a browser CORS concept), so the
// Location header is actually readable — confirmed against a real grounding
// call before writing this, not assumed from docs.
const REDIRECT_RESOLUTION_TIMEOUT_MS = 2500;

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

// Enforced again at the prompt level in buildGroundedPrompt/buildUngroundedPrompt
// (where the content is actually written) — not a Zod .max() (deliberately
// skipped: a hard schema cap would fail the whole plan over one long
// sentence). SpeechBubble.tsx's line-clamp-3 is the guaranteed visual
// backstop regardless of what the model actually sends.
const RATIONALE_LENGTH_RULE =
  `Keep each technique's "rationale" short and punchy — one sentence, maximum 15 words, no matter how long the source material is.`;

const STRUCTURING_SYSTEM_PROMPT =
  "Convert the input into JSON matching the schema exactly. Preserve any URLs and titles exactly as given in the input — do not alter or invent them. " +
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

function buildGroundedPrompt(input: GeneratePlanRequest): string {
  return (
    `${describeInput(input)}\n\n` +
    `Create a learning plan with ${MIN_TECHNIQUES}-${MAX_TECHNIQUES} techniques for this hobby. ${SEQUENCING_RULE} ${RATIONALE_LENGTH_RULE} ` +
    `Tailor the plan to the stated skill level, goal, and what they already know. For each technique, use Google Search to find ` +
    `real, currently-live resources. ${RESOURCE_MIX_RULE} Each resource's URL must point to a genuinely distinct ` +
    `source — never reuse the same URL for two different resources. For each resource include its exact title, exact URL, ` +
    `resource type, and a one-line reason it fits this specific user. Also include a one-line summary tying the plan to their goal.`
  );
}

function buildUngroundedPrompt(input: GeneratePlanRequest): string {
  return (
    `${describeInput(input)}\n\n` +
    `Create a learning plan with ${MIN_TECHNIQUES}-${MAX_TECHNIQUES} techniques for this hobby. ${SEQUENCING_RULE} ${RATIONALE_LENGTH_RULE} ` +
    `Tailor the plan to the stated skill level, goal, and what they already know. You do not have access to live search, so for each ` +
    `technique's resources, write a plausible title and resource type. ${RESOURCE_MIX_RULE} Write a one-line reason each resource ` +
    `fits this user. For the "url" field, write any well-formed https URL as a placeholder — it will be discarded and replaced ` +
    `automatically, so it does not need to be real. Also include a one-line summary tying the plan to their goal.`
  );
}

interface VerifiedResource {
  url: string;
  sourceName: string;
}

function buildStructuringPrompt(rawContent: string, verifiedResources: VerifiedResource[]): string {
  const base = `Convert this hobby learning plan into the required JSON structure:\n\n${rawContent}`;
  if (verifiedResources.length === 0) return base;

  const verifiedList = verifiedResources.map((r, i) => `${i + 1}. ${r.url} (${r.sourceName})`).join("\n");
  return (
    `${base}\n\n` +
    `Here are the verified, real source URLs found by Google Search:\n${verifiedList}\n\n` +
    `For each resource, you MUST use a URL from this verified list — match each resource to whichever verified URL best fits ` +
    `its title, content type, and source, based on the plan text above. Never invent, modify, or guess a URL. If no verified ` +
    `URL is left that fits a resource well, write "https://unresolved.invalid" for that resource's url instead of guessing.`
  );
}

let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAI;
}

interface GroundingChunkRef {
  uri?: string;
  title?: string;
}

interface GroundedResult {
  text: string;
  chunks: GroundingChunkRef[];
}

async function callGeminiGrounded(prompt: string): Promise<GroundedResult> {
  const response = await getGenAI().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });
  devLog("gemini-grounding", response.usageMetadata);
  const text = response.text;
  if (!text) throw new Error("Gemini grounding call returned no text");
  const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const chunks = rawChunks.map((chunk) => ({ uri: chunk.web?.uri, title: chunk.web?.title }));
  return { text, chunks };
}

// A single redirect hop, not a full page fetch — reads the Location header
// and stops there. Verified live (not assumed) that Node's fetch exposes
// this header for redirect:"manual" requests; the opaque-redirect filtering
// that would normally hide it is a browser CORS concept, not applicable
// server-side.
async function resolveRedirectUrl(uri: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REDIRECT_RESOLUTION_TIMEOUT_MS);
  try {
    const res = await fetch(uri, { redirect: "manual", signal: controller.signal });
    return res.headers.get("location");
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Resolves every grounding chunk's redirect wrapper to its real destination,
// in parallel. A chunk that fails or times out is just dropped — it never
// makes it into the verified list, so it naturally falls back to
// constructSearchUrl later (see toHobbyPlan), the same as if grounding had
// never found it at all.
async function resolveVerifiedResources(chunks: GroundingChunkRef[]): Promise<VerifiedResource[]> {
  const resolved = await Promise.all(
    chunks.map(async (chunk): Promise<VerifiedResource | null> => {
      if (!chunk.uri) return null;
      const realUrl = await resolveRedirectUrl(chunk.uri);
      if (!realUrl) return null;
      return { url: realUrl, sourceName: deriveSourceName(realUrl) };
    })
  );
  const unique = new Map(resolved.filter((r): r is VerifiedResource => r !== null).map((r) => [r.url, r]));
  return Array.from(unique.values());
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

// A single grounding pass can fail to surface enough distinct sources for
// every resource slot; when that happens the structuring model tends to
// reuse a URL it already saw, paired with an invented title. Treating that
// as a validation failure (same as a schema mismatch) lets the existing
// retry catch it before a plan with contradictory resource titles ships.
function hasDuplicateResourceUrls(plan: AIPlanResponse): boolean {
  const urls = plan.techniques.flatMap((technique) =>
    technique.resources.map((resource) => resource.url)
  );
  return new Set(urls).size !== urls.length;
}

// Retries once on validation failure. Throws if neither attempt
// produces a schema-valid plan with no duplicate resource URLs.
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

interface GroundedPlanResult {
  aiPlan: AIPlanResponse;
  // Resolved, real destination URLs — never the vertexaisearch redirect
  // wrapper. Empty set flows through toHobbyPlan exactly like the
  // ungrounded path: every resource falls back to constructSearchUrl.
  verifiedUrls: Set<string>;
}

async function generateGroundedPlan(input: GeneratePlanRequest): Promise<GroundedPlanResult> {
  const { text, chunks } = await callGeminiGrounded(buildGroundedPrompt(input));
  const verifiedResources = await resolveVerifiedResources(chunks);
  devLog("verified-resources", { chunkCount: chunks.length, verifiedCount: verifiedResources.length });
  const aiPlan = await structureWithFallback(buildStructuringPrompt(text, verifiedResources));
  return { aiPlan, verifiedUrls: new Set(verifiedResources.map((r) => r.url)) };
}

const KNOWN_SOURCE_NAMES: Record<string, string> = {
  "youtube.com": "YouTube",
  "chess.com": "Chess.com",
  "lichess.org": "Lichess",
  "google.com": "Google Search",
};

// Never trust the AI to name its own source consistently — derive it from
// the URL itself, which is deterministic and can't be hallucinated.
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

// No post-processing needed here anymore — toHobbyPlan now forces every
// resource's url through constructSearchUrl regardless of path, so the
// per-resource rewrite that used to live here is redundant.
async function generateUngroundedPlan(input: GeneratePlanRequest): Promise<AIPlanResponse> {
  return structureWithFallback(buildUngroundedPrompt(input));
}

// verifiedUrls is empty for the ungrounded path (nothing to verify — every
// resource falls back to constructSearchUrl, same as before) and populated
// for the grounded path with real, redirect-resolved destination URLs. A
// resource only gets its AI-provided url trusted directly if it's an exact
// member of that set; anything else (Groq deviated, invented a URL, or
// there weren't enough verified sources for every slot) falls back to a
// constructed search URL — the guaranteed-resolving link, never a guess.
function toHobbyPlan(input: GeneratePlanRequest, aiPlan: AIPlanResponse, verifiedUrls: Set<string>): HobbyPlan {
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
      resources: technique.resources.map((resource): Resource => {
        const url = verifiedUrls.has(resource.url) ? resource.url : constructSearchUrl(resource, input.hobbyName);
        return {
          id: crypto.randomUUID(),
          type: resource.type,
          title: resource.title,
          url,
          // Derived from the final url either way — a verified url is a
          // real resolved destination (e.g. youtube.com), and a constructed
          // search url already derives a sensible name (YouTube/Google) on
          // its own, so there's no separate "preserve the original" case
          // to handle anymore.
          sourceName: deriveSourceName(url),
          whyChosen: resource.whyChosen,
        };
      }),
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
    let aiPlan: AIPlanResponse;
    let verifiedUrls = new Set<string>();
    try {
      const grounded = await generateGroundedPlan(input);
      aiPlan = grounded.aiPlan;
      verifiedUrls = grounded.verifiedUrls;
    } catch {
      aiPlan = await generateUngroundedPlan(input);
    }
    return NextResponse.json(toHobbyPlan(input, aiPlan, verifiedUrls), { status: 200 });
  } catch (err) {
    console.error("[generate-plan] failed after all fallbacks", err);
    return NextResponse.json(
      { error: "We couldn't generate your plan right now. Please try again in a moment." },
      { status: 502 }
    );
  }
}
