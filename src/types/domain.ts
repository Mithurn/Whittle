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

export interface NoteEntry {
  id: string;
  title: string;
  description: string;
  createdAt: string; // ISO date string
}

export interface LessonContent {
  intro: string;
  howItWorks: {
    overview: string;
    steps: Array<{
      title: string;
      text: string;
    }>;
  };
  // Images the model found in the source article, returned as their own
  // structured field rather than embedded inline as markdown `![alt](url)`
  // within prose — the old approach meant only one of four lesson fields
  // ever actually ran through a markdown parser, so images (and any other
  // markdown syntax) silently leaked as raw text in the other three.
  images: Array<{
    url: string;
    caption: string;
  }>;
  // Replaces the old generic "prosCons" (advantages/disadvantages) — pros
  // and cons is a comparison-shopping frame, not a coaching frame, and
  // doesn't fit "how do I do this technique." Actionable tips and mistakes
  // to avoid are the equivalent that's actually useful mid-practice.
  mistakesTips: {
    tips: string[];
    mistakes: string[];
  };
  // Replaces the old standalone "summaryTable" slide — a short recap
  // folded into the Master slide alongside the mastery action, instead of
  // a generic data table shown as its own disconnected step.
  keyTakeaways: string[];
}

export interface Technique {
  id: string;
  name: string; // e.g. "Forking"
  description: string; // what the technique is
  rationale: string; // why it's in this plan for this user
  resources: Resource[]; // 1-3 items, "a mix" of types
  status: TechniqueStatus;
  order: number;
  notes: NoteEntry[]; // user-added notes, most-recent-last; empty until they add one
  lesson?: LessonContent; // Cached structured lesson (JIT generated)
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
