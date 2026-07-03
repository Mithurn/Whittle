import {
  AIPlanResponseSchema,
  MIN_TECHNIQUES,
  MAX_TECHNIQUES,
  type GeneratePlanRequest,
  type AIPlanResponse,
} from "@/lib/schemas";
import type { SkillLevel } from "@/types/domain";

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function devLog(label: string, usage: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[generate-plan] ${label} usage:`, usage);
  }
}

// Maps the free-text-but-closed-set timeCommitment answer (see
// TimeCommitmentScreen.tsx's preset options) to an exact technique count,
// instead of leaving the 5-8 range up to the model's own judgment — a
// 15-min/day learner and a weekends-only learner shouldn't get roadmaps
// that could come out the same length by chance. Bounded by the same
// MIN_TECHNIQUES/MAX_TECHNIQUES the rest of the pipeline already enforces.
const TECHNIQUE_COUNT_BY_TIME_COMMITMENT: Record<string, number> = {
  "15 mins a day": MIN_TECHNIQUES,
  "30 mins a day": 6,
  "A few hours a week": 7,
  "Weekends only": MAX_TECHNIQUES,
};
const DEFAULT_TECHNIQUE_COUNT = 6;

export function getTargetTechniqueCount(timeCommitment: string): number {
  return TECHNIQUE_COUNT_BY_TIME_COMMITMENT[timeCommitment] ?? DEFAULT_TECHNIQUE_COUNT;
}

// Mirrors AIPlanResponseSchema — hand-written to avoid an extra
// zod-to-json-schema dependency for what is a small, stable shape.
// minItems/maxItems are both set to the exact per-request target count
// (not the outer MIN/MAX_TECHNIQUES range) so the JSON-schema constraint
// itself pushes toward that exact number, not just the prompt text.
function buildPlanJsonSchema(targetCount: number) {
  return {
  type: "object",
  properties: {
    summary: { type: "string" },
    techniques: {
      type: "array",
      minItems: targetCount,
      maxItems: targetCount,
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
}

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

// A generic "tailor to the stated skill level" instruction was tried first
// and reproducibly failed — verified live: an "intermediate" chess request
// still came back with "Opening Principles" and "Basic Tactical Motifs" as
// the first two techniques, both textbook beginner content. Each level now
// gets an explicit exclusion rule instead of a vague tailoring request.
const SKILL_LEVEL_RULES: Record<SkillLevel, string> = {
  beginner:
    `The user is a complete beginner with this hobby — assume zero prior exposure. Start from the most ` +
    `foundational technique (core rules, basic setup/equipment, essential vocabulary) and build up from there.`,
  intermediate:
    `The user already knows the basics — do NOT include any technique a first-time beginner would need ` +
    `(basic rules, how to set up or hold equipment, core terminology, "getting started" content). Every ` +
    `technique must assume that foundation is already solid and build past it.`,
  advanced:
    `The user is already comfortable with most of this hobby, including intermediate-level skills — do NOT ` +
    `include any beginner or general-intermediate technique. Focus exclusively on nuanced, high-level, or ` +
    `mastery-oriented techniques a comfortable practitioner would still need to refine.`,
};

function buildSkeletonPrompt(input: GeneratePlanRequest, targetCount: number): string {
  return (
    `${describeInput(input)}\n\n` +
    `Create a learning plan with exactly ${targetCount} techniques for this hobby — not a range, exactly ${targetCount}. ${SEQUENCING_RULE} ${RATIONALE_LENGTH_RULE} ` +
    `${SKILL_LEVEL_RULES[input.level]} Tailor the plan to the stated goal and what they already know. ` +
    `For each technique's resources, write a plausible title and resource type. ${RESOURCE_MIX_RULE} ` +
    `Write a one-line reason each resource fits this user. For the "url" field, write exactly "https://placeholder.com" — it will be filled in automatically later. ` +
    `Also include a one-line summary tying the plan to their goal.`
  );
}

async function callChatJsonSchema(
  endpoint: string,
  apiKey: string,
  model: string,
  userContent: string,
  targetCount: number
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
        json_schema: { name: "hobby_plan", strict: true, schema: buildPlanJsonSchema(targetCount) },
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

async function callGroq(userContent: string, targetCount: number): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  return callChatJsonSchema(GROQ_ENDPOINT, apiKey, GROQ_MODEL, userContent, targetCount);
}

// Invents the full plan skeleton — technique names, descriptions, rationale,
// resource titles/types — with every resource url set to a literal
// placeholder (see buildSkeletonPrompt); real URLs are filled in later by
// search-service's enrichPlanWithSerper. Retries once on schema-validation
// failure before being treated as a failure (transient malformed JSON is
// common enough with any LLM to be worth one retry before giving up).
//
// Zod validation below still accepts the outer MIN_TECHNIQUES-MAX_TECHNIQUES
// range rather than requiring exactly targetCount — deliberately: the
// prompt text and the JSON schema's minItems/maxItems both push the model
// toward the exact count, but LLMs aren't perfectly reliable at hard count
// constraints, and rejecting a near-miss (e.g. 5 techniques when 6 were
// asked for) would trade a real robustness cost for a validation nicety.
export async function structureWithFallback(input: GeneratePlanRequest): Promise<AIPlanResponse> {
  const targetCount = getTargetTechniqueCount(input.timeCommitment);
  const userContent = buildSkeletonPrompt(input, targetCount);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGroq(userContent, targetCount);
      const parsed = AIPlanResponseSchema.safeParse(raw);
      // No duplicate-URL check here anymore — at this stage every resource's
      // url is uniformly the "https://placeholder.com" literal (see
      // buildSkeletonPrompt), so a same-value check would just compare
      // placeholders against each other and never find a real collision.
      // Real duplicates can only exist after enrichPlanWithSerper assigns
      // actual URLs — see transformer.ts's dedupeResourceUrls instead.
      if (parsed.success) return parsed.data;
      lastError = parsed.error;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error("Groq structuring failed schema validation twice", {
    cause: lastError,
  });
}
