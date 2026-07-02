import { z } from "zod";

// Hard input length caps (CLAUDE.md rule 8: explicit, not implicit).
export const HOBBY_NAME_MAX = 60;
export const GOAL_MAX = 300;
export const TIME_COMMITMENT_MAX = 100;
export const KNOWN_TOPIC_MAX = 60;
export const KNOWN_TOPICS_MAX_COUNT = 10;
export const MIN_TECHNIQUES = 5;
export const MAX_TECHNIQUES = 8;

export const SkillLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const ResourceTypeSchema = z.enum(["video", "reading", "audio"]);

// What the user submits from the onboarding form.
export const GeneratePlanRequestSchema = z.object({
  hobbyName: z.string().trim().min(1).max(HOBBY_NAME_MAX),
  level: SkillLevelSchema,
  goal: z.string().trim().min(1).max(GOAL_MAX),
  timeCommitment: z.string().trim().min(1).max(TIME_COMMITMENT_MAX),
  knownTopics: z
    .array(z.string().trim().min(1).max(KNOWN_TOPIC_MAX))
    .max(KNOWN_TOPICS_MAX_COUNT)
    .default([]),
});
export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;

// What the AI is allowed to produce — no id/status/order/createdAt.
// The server assigns those when building the full HobbyPlan.
export const AIResourceSchema = z.object({
  type: ResourceTypeSchema,
  title: z.string().min(1),
  url: z.string().url(),
  whyChosen: z.string().min(1),
});

export const AITechniqueSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  rationale: z.string().min(1),
  resources: z.array(AIResourceSchema).min(1).max(3),
});

export const AIPlanResponseSchema = z.object({
  summary: z.string().min(1),
  techniques: z.array(AITechniqueSchema).min(MIN_TECHNIQUES).max(MAX_TECHNIQUES),
});
export type AIPlanResponse = z.infer<typeof AIPlanResponseSchema>;
