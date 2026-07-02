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
            minItems: 1,
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

const STRUCTURING_SYSTEM_PROMPT =
  "Convert the input into JSON matching the schema exactly. Preserve any URLs and titles exactly as given in the input — do not alter or invent them.";

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

function buildGroundedPrompt(input: GeneratePlanRequest): string {
  return (
    `${describeInput(input)}\n\n` +
    `Create a learning plan with ${MIN_TECHNIQUES}-${MAX_TECHNIQUES} techniques for this hobby. ${SEQUENCING_RULE} ` +
    `Tailor the plan to the stated skill level, goal, and what they already know. For each technique, use Google Search to find ` +
    `1-3 real, currently-live resources (a mix of video/reading/audio where sensible for a physical or practical skill — ` +
    `never audio-only for a technique that requires seeing physical form). Each resource's URL must point to a genuinely distinct ` +
    `source — never reuse the same URL for two different resources. For each resource include its exact title, exact URL, ` +
    `resource type, and a one-line reason it fits this specific user. Also include a one-line summary tying the plan to their goal.`
  );
}

function buildUngroundedPrompt(input: GeneratePlanRequest): string {
  return (
    `${describeInput(input)}\n\n` +
    `Create a learning plan with ${MIN_TECHNIQUES}-${MAX_TECHNIQUES} techniques for this hobby. ${SEQUENCING_RULE} ` +
    `Tailor the plan to the stated skill level, goal, and what they already know. You do not have access to live search, so for each ` +
    `technique's 1-3 resources, write a plausible title and resource type (a mix of video/reading/audio where sensible — never ` +
    `audio-only for a technique that requires seeing physical form) and a one-line reason it fits this user. For the "url" field, ` +
    `write any well-formed https URL as a placeholder — it will be discarded and replaced automatically, so it does not need to be real. ` +
    `Also include a one-line summary tying the plan to their goal.`
  );
}

function buildStructuringPrompt(rawContent: string): string {
  return `Convert this hobby learning plan into the required JSON structure:\n\n${rawContent}`;
}

let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAI;
}

async function callGeminiGrounded(prompt: string): Promise<string> {
  const response = await getGenAI().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });
  devLog("gemini-grounding", response.usageMetadata);
  const text = response.text;
  if (!text) throw new Error("Gemini grounding call returned no text");
  return text;
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

async function generateGroundedPlan(input: GeneratePlanRequest): Promise<AIPlanResponse> {
  const groundedText = await callGeminiGrounded(buildGroundedPrompt(input));
  return structureWithFallback(buildStructuringPrompt(groundedText));
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

async function generateUngroundedPlan(input: GeneratePlanRequest): Promise<AIPlanResponse> {
  const plan = await structureWithFallback(buildUngroundedPrompt(input));
  return {
    ...plan,
    techniques: plan.techniques.map((technique) => ({
      ...technique,
      resources: technique.resources.map((resource) => ({
        ...resource,
        url: constructSearchUrl(resource, input.hobbyName),
      })),
    })),
  };
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
      resources: technique.resources.map(
        (resource): Resource => ({
          id: crypto.randomUUID(),
          type: resource.type,
          title: resource.title,
          url: resource.url,
          sourceName: deriveSourceName(resource.url),
          whyChosen: resource.whyChosen,
        })
      ),
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
    try {
      aiPlan = await generateGroundedPlan(input);
    } catch {
      aiPlan = await generateUngroundedPlan(input);
    }
    return NextResponse.json(toHobbyPlan(input, aiPlan), { status: 200 });
  } catch (err) {
    console.error("[generate-plan] failed after all fallbacks", err);
    return NextResponse.json(
      { error: "We couldn't generate your plan right now. Please try again in a moment." },
      { status: 502 }
    );
  }
}
