export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type TechniqueStatus =
  | "not_started"
  | "in_progress"
  | "mastered"
  | "skipped";

export type ResourceType = "video" | "reading" | "audio";

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  sourceName: string; // e.g. "YouTube", "Chess.com" — derived server-side from the URL's hostname, never AI-generated
  whyChosen: string; // AI's one-line reason THIS resource fits the user
}

export interface Technique {
  id: string;
  name: string; // e.g. "Forking"
  description: string; // what the technique is
  rationale: string; // why it's in this plan for this user
  resources: Resource[]; // 1-3 items, "a mix" of types
  status: TechniqueStatus;
  order: number;
  notes?: string; // optional user-written note, plain text
}

export interface HobbyPlan {
  id: string;
  hobbyName: string;
  level: SkillLevel;
  goal: string;
  timeCommitment: string; // free text, e.g. "a few hours a week"
  knownTopics: string[]; // what the user already knows, for personalization
  summary: string; // AI's one-line intro tying the plan to the user's goal
  createdAt: string; // ISO date string
  techniques: Technique[];
}
