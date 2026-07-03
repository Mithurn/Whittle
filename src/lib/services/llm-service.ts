import {
  AIPlanResponseSchema,
  MIN_TECHNIQUES,
  MAX_TECHNIQUES,
  type GeneratePlanRequest,
  type AIPlanResponse,
} from "@/lib/schemas";

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

// Invents the full plan skeleton — technique names, descriptions, rationale,
// resource titles/types — with every resource url set to a literal
// placeholder (see buildSkeletonPrompt); real URLs are filled in later by
// search-service's enrichPlanWithSerper. Retries once on schema-validation
// failure before being treated as a failure (transient malformed JSON is
// common enough with any LLM to be worth one retry before giving up).
export async function structureWithFallback(input: GeneratePlanRequest): Promise<AIPlanResponse> {
  const userContent = buildSkeletonPrompt(input);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGroq(userContent);
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
