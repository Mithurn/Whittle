export const APP_ROUTE = "/start";
export const REVEAL_THRESHOLD = 0.15;
export const REVEAL_STAGGER_MS = 90;
export const WHITTLE_DURATION_MS = 2600;
export const SCROLL_LEAD_RATIO = 0.85;
export const SCROLL_TAIL_RATIO = 0.1;
export const SCROLL_HEAD_RATIO = 0.2;
export const PROGRESS_EPSILON = 0.003;
export const DONE_THRESHOLD = 0.97;
export const SLIDER_DONE_THRESHOLD = 0.99;

export const MASCOT = {
  src: "/mascot.gif",
  ratio: 150 / 121,
} as const;

export const ROADMAP_STEPS = [
  "Grip and ready position",
  "The serve",
  "Dinking at the kitchen line",
  "Third shot drop",
  "Stacking and court sense",
  "Attack and counter",
] as const;

export const STAGE_BUBBLE_LINES: ReadonlyArray<readonly [number, string]> = [
  [0, "That is a lot of tabs."],
  [0.35, "Cutting the noise..."],
  [0.7, "Look at that. One path."],
  [0.97, "Five steps. That is all you need."],
];

interface PileChip {
  label: string;
  x: number;
  y: number;
  end?: readonly [number, number];
}

export const PILE_CHIPS: readonly PileChip[] = [
  { label: ROADMAP_STEPS[0], x: 10, y: 12, end: [32, 12] },
  { label: "pickleball vs tennis reddit", x: 34, y: 8 },
  { label: "Is the serve legal? 2019 thread", x: 62, y: 12 },
  { label: "Paddle reviews 2024 ranked", x: 88, y: 10 },
  { label: "POV: your first dink", x: 16, y: 30 },
  { label: ROADMAP_STEPS[1], x: 44, y: 26, end: [64, 28] },
  { label: "podcast: kitchen rules debate", x: 78, y: 30 },
  { label: ROADMAP_STEPS[2], x: 24, y: 48, end: [34, 46] },
  { label: "Beginner mistakes (part 3 of 9)", x: 54, y: 46 },
  { label: "Spin serve in 30 days", x: 86, y: 50 },
  { label: "Why you lose at 4.0", x: 12, y: 66 },
  { label: "Rules explained AGAIN", x: 40, y: 64 },
  { label: ROADMAP_STEPS[4], x: 72, y: 68, end: [62, 62] },
  { label: ROADMAP_STEPS[5], x: 90, y: 84, end: [48, 78] },
];

export const TRAIL_PATH = "M32 12 C 66 8, 70 22, 64 28 S 28 38, 34 46 S 68 54, 62 62 S 34 72, 48 78";

interface LessonSlide {
  name: string;
  title: string;
  desc: string;
  items?: readonly string[];
  video?: { label: string; why: string };
}

export const LESSON_TECHNIQUE = "The serve";

export const LESSON_SLIDES: readonly LessonSlide[] = [
  {
    name: "Introduction",
    title: "What it is and why it matters",
    desc: "Start with the big picture in two minutes, so everything after it makes sense.",
    items: ["What the technique is", "Where it fits on your roadmap", "What good looks like"],
  },
  {
    name: "Watch & Learn",
    title: "One video, picked for you",
    desc: "We found the clearest teacher for this technique and tell you why we chose it.",
    video: { label: "Video, 8 min", why: "Why this one: clear, slow, and shows it from the side." },
  },
  {
    name: "How it Works",
    title: "The moving parts, plainly",
    desc: "A short article read, broken into the few things that actually matter.",
    items: ["Stance and setup", "The motion, step by step", "The cue to remember"],
  },
  {
    name: "Watch Out For",
    title: "Common mistakes",
    desc: "The slips nearly every beginner makes, and the quick fix for each one.",
    items: ["Gripping too tight", "Rushing the setup", "Skipping the warm up"],
  },
  {
    name: "Master",
    title: "Try it, then call it",
    desc: "Practice with a simple drill. When it feels natural, mark it mastered. Not yet? Skip it for now.",
    items: ["Do the 10 minute drill", "Mark it mastered", "Or skip it and return later"],
  },
];

export const DEMO_MASTERED_COUNT = 1;
export const DEMO_HOBBY = "Pickleball";
