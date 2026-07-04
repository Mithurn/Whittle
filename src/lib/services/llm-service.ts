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
function buildCurriculumJsonSchema(targetCount: number) {
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
            rationale: { type: "string" }
          },
          required: ["name", "description", "rationale"],
          additionalProperties: false
        }
      }
    },
    required: ["summary", "techniques"],
    additionalProperties: false
  } as const;
}

function buildResourcesJsonSchema() {
  return {
    type: "object",
    properties: {
      techniques: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
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
          required: ["name", "resources"],
          additionalProperties: false,
        },
      },
    },
    required: ["techniques"],
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
  `Each technique must have exactly 3 resources: one video, one reading/article, and one audio/podcast. ` +
  `Never substitute the audio resource for a second reading, and never use audio-only for a ` +
  `technique that requires seeing physical form (that's what the video is for).`;

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

function buildCurriculumPrompt(input: GeneratePlanRequest, targetCount: number): string {
  return (
    `${describeInput(input)}\n\n` +
    `Create a learning plan curriculum with exactly ${targetCount} techniques for this hobby — not a range, exactly ${targetCount}. ${SEQUENCING_RULE} ${RATIONALE_LENGTH_RULE} ` +
    `${SKILL_LEVEL_RULES[input.level]} Tailor the plan to the stated goal and what they already know. ` +
    `Also include a one-line summary tying the plan to their goal.`
  );
}

// Groq's raw two-stage response shapes. Trusted only structurally here —
// the final merged payload is re-validated against AIPlanResponseSchema at
// the end of structureWithFallback, which is the actual safety net; these
// types just describe what the pipeline expects to flow between its own
// steps.
interface CurriculumResponse {
  summary: string;
  techniques: Array<{ name: string; description: string; rationale: string }>;
}

interface ResourcesResponse {
  techniques: Array<{
    name: string;
    resources: Array<{ type: string; title: string; url: string; whyChosen: string }>;
  }>;
}

function buildResourcesPrompt(curriculum: CurriculumResponse): string {
  return (
    `Given the following learning curriculum:\n${JSON.stringify(curriculum, null, 2)}\n\n` +
    `For each technique, invent exactly 3 resources. Write a plausible title and resource type. ${RESOURCE_MIX_RULE} ` +
    `Write a one-line reason each resource fits this user. For the "url" field, write exactly "https://placeholder.com" — it will be filled in automatically later.`
  );
}

async function callChatJsonSchema(
  endpoint: string,
  apiKey: string,
  model: string,
  userContent: string,
  schema: object,
  schemaName: string
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
        json_schema: { name: schemaName, strict: true, schema },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`${endpoint} responded with ${res.status}`);
  }

  const data = await res.json();
  devLog(`${schemaName} on ${endpoint}`, data.usage);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`${endpoint} returned no message content`);
  }
  return JSON.parse(content);
}

async function callGroq(userContent: string, schema: object, schemaName: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  return callChatJsonSchema(GROQ_ENDPOINT, apiKey, GROQ_MODEL, userContent, schema, schemaName);
}

export async function structureWithFallback(input: GeneratePlanRequest): Promise<AIPlanResponse> {
  const targetCount = getTargetTechniqueCount(input.timeCommitment);
  
  // Step 1: Generate Curriculum (The "What")
  let curriculum: CurriculumResponse | undefined;
  let curriculumError: unknown;
  const curriculumPrompt = buildCurriculumPrompt(input, targetCount);
  const curriculumSchema = buildCurriculumJsonSchema(targetCount);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = (await callGroq(curriculumPrompt, curriculumSchema, "hobby_curriculum")) as CurriculumResponse;
      if (result && result.techniques && result.techniques.length > 0) {
        curriculum = result;
        break;
      }
    } catch (err) {
      curriculumError = err;
    }
  }

  if (!curriculum) {
    throw new Error("Groq curriculum generation failed", { cause: curriculumError });
  }

  // Step 2: Generate Resources (The "Where" & "Why")
  let resourcesResp: ResourcesResponse | undefined;
  let resourcesError: unknown;
  const resourcesPrompt = buildResourcesPrompt(curriculum);
  const resourcesSchema = buildResourcesJsonSchema();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = (await callGroq(resourcesPrompt, resourcesSchema, "hobby_resources")) as ResourcesResponse;
      if (result && result.techniques) {
        resourcesResp = result;
        break;
      }
    } catch (err) {
      resourcesError = err;
    }
  }

  if (!resourcesResp) {
    throw new Error("Groq resources generation failed", { cause: resourcesError });
  }

  // Step 3: Merge and Enrich
  const mergedTechniques = curriculum.techniques.map((tech) => {
    // Find the matching resources for this technique name
    const resourceMatch = resourcesResp.techniques.find((r) => r.name === tech.name);
    return {
      ...tech,
      resources: resourceMatch ? resourceMatch.resources : []
    };
  });

  const finalPayload = {
    summary: curriculum.summary,
    techniques: mergedTechniques
  };

  const parsed = AIPlanResponseSchema.safeParse(finalPayload);
  
  if (parsed.success) return parsed.data;
  
  throw new Error("Merged result failed schema validation", { cause: parsed.error });
}
