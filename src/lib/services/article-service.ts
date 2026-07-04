import type { SkillLevel, LessonContent } from "@/types/domain";

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Hard input cap on article text forwarded to the model — an unbounded
// scraped article is both a token-cost risk and a prompt-injection surface
// (CLAUDE.md's LLM-call guardrails). ~12k chars ≈ ~3k tokens, plenty for
// the model to find the valuable sections of any real tutorial article.
export const ARTICLE_INPUT_MAX_CHARS = 12_000;

const CONDENSE_TIMEOUT_MS = 15_000; // Increased slightly for JSON generation

function devLog(label: string, usage: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[read-article] ${label} usage:`, usage);
  }
}

type LessonBreakdown = Pick<LessonContent, "intro" | "howItWorks" | "images">;
type LessonCoaching = Pick<LessonContent, "mistakesTips" | "keyTakeaways">;

// Every text field this produces (intro, tips, mistakes, takeaways) is
// shown directly to the user as copy, not just internal data — so the
// model's own writing tone matters here as much as it does anywhere else
// in the app (see copy-guidelines.md: encouraging, clear, human,
// lightweight; never corporate or robotic).
function describeModule(hobbyName: string, level: SkillLevel, techniqueName: string): string {
  return `You are creating a structured learning module for someone learning ${hobbyName} at a ${level} level. ` +
    `The module is specifically about the technique: "${techniqueName}". ` +
    `Write every piece of text in an encouraging, clear, human tone — like a knowledgeable friend coaching them, ` +
    `not a textbook. Avoid corporate or robotic phrasing (e.g. never "leverage", "utilize", "in order to"). `;
}

// "images" is its own structured field rather than embedded inline as
// markdown in prose — the old single-prompt version asked the model to
// embed `![alt](url)` in prose text, but only one of four prose fields
// ever actually ran through a markdown parser client-side, so images (and
// any other markdown syntax) silently leaked as raw text in the others.
function buildBreakdownPrompt(hobbyName: string, level: SkillLevel, techniqueName: string, hasSource: boolean): string {
  let prompt = describeModule(hobbyName, level, techniqueName);

  if (hasSource) {
    prompt += `You will be provided with a raw, scraped web article. Use this article to synthesize the lesson. ` +
      `If the article references real images (photos, diagrams), list them in the "images" field with the exact ` +
      `URL from the article — never invent one. `;
  } else {
    prompt += `Generate a comprehensive and highly accurate lesson using your own expert knowledge. Leave "images" empty — ` +
      `there is no source article to pull real image URLs from. `;
  }

  prompt += `You MUST return your response as a valid JSON object with the following exact structure:\n` +
    `{\n` +
    `  "intro": "A personalized 2-3 sentence introduction to the technique.",\n` +
    `  "howItWorks": {\n` +
    `    "overview": "A 1-2 sentence high-level explanation of the mechanics or core theory.",\n` +
    `    "steps": [\n` +
    `      { "title": "Stance / Principle 1", "text": "Detailed explanation..." },\n` +
    `      { "title": "Action / Principle 2", "text": "Detailed explanation..." }\n` +
    `    ] // If the technique is physical/sequential, use chronological steps. If it is conceptual, use logical sub-topics or key principles.\n` +
    `  },\n` +
    `  "images": [\n` +
    `    { "url": "https://...", "caption": "Short caption describing the image" }\n` +
    `  ] // Only real image URLs found in the source article. Empty array if none or no source.\n` +
    `}\n` +
    `Output ONLY the JSON object. Do not include markdown code blocks around the JSON.`;

  return prompt;
}

// "mistakesTips"/"keyTakeaways" — replaces the old "prosCons"/"summaryTable"
// pairing. Pros/cons is a comparison-shopping frame, not a coaching frame,
// and doesn't fit "how do I do this technique" (see domain.ts). Deliberately
// its own call, not folded into the breakdown prompt above — this is a
// distinct concern (coaching advice vs. instructional content), matching
// the same "don't mix unrelated things in one step" principle already
// applied to llm-service.ts/search-service.ts.
function buildCoachingPrompt(hobbyName: string, level: SkillLevel, techniqueName: string, hasSource: boolean): string {
  let prompt = describeModule(hobbyName, level, techniqueName);

  prompt += hasSource
    ? `You will be provided with a raw, scraped web article about this technique. Use it to ground your advice in real practice. ` +
      `CRITICAL RULE: If the article lacks explicit tips, mistakes, or takeaways (or if the text is blocked/empty), YOU MUST use your own expert knowledge to generate them. `
    : `Use your own expert knowledge of this technique. `;

  prompt += `You MUST return your response as a valid JSON object with the following exact structure:\n` +
    `{\n` +
    `  "mistakesTips": {\n` +
    `    "tips": ["An actionable pro tip", "Another actionable pro tip"], // Must contain AT LEAST 2 items. NEVER return an empty array.\n` +
    `    "mistakes": ["A common mistake beginners make", "Another common mistake"] // Must contain AT LEAST 2 items. NEVER return an empty array.\n` +
    `  },\n` +
    `  "keyTakeaways": ["A short, memorable recap point", "Another recap point"] // Must contain AT LEAST 2 items. NEVER return an empty array.\n` +
    `}\n` +
    `Output ONLY the JSON object. Do not include markdown code blocks around the JSON.`;

  return prompt;
}

async function callCondenseModel(systemPrompt: string, userContent: string, schemaName: string): Promise<unknown | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONDENSE_TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[read-article] Groq API Error: ${res.status} ${res.statusText} - ${errText}`);
      return null;
    }

    const data = await res.json();
    devLog(schemaName, data.usage);
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;

    // Groq JSON mode guarantees parseable JSON, but we still defensive-parse
    return JSON.parse(content.trim());
  } catch (err) {
    console.error(`[read-article] ${schemaName} generation failed`, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Generates the instructional breakdown (intro, how-it-works, real images)
// from a raw scraped article.
export async function generateLessonBreakdown(
  rawMarkdown: string,
  opts: { hobbyName: string; level: SkillLevel; techniqueName: string }
): Promise<LessonBreakdown | null> {
  const hasSource = rawMarkdown.trim().length > 0;
  const userContent = hasSource ? rawMarkdown.slice(0, ARTICLE_INPUT_MAX_CHARS) : `Technique: ${opts.techniqueName}`;
  const result = await callCondenseModel(
    buildBreakdownPrompt(opts.hobbyName, opts.level, opts.techniqueName, hasSource),
    userContent,
    "lesson_breakdown"
  );
  return result as LessonBreakdown | null;
}

// Generates coaching content (tips, common mistakes, key takeaways) from
// the same raw scraped article — run in parallel with the breakdown call
// above, not chained, since neither depends on the other's output.
export async function generateLessonCoaching(
  rawMarkdown: string,
  opts: { hobbyName: string; level: SkillLevel; techniqueName: string }
): Promise<LessonCoaching | null> {
  const hasSource = rawMarkdown.trim().length > 0;
  const userContent = hasSource ? rawMarkdown.slice(0, ARTICLE_INPUT_MAX_CHARS) : `Technique: ${opts.techniqueName}`;
  const result = await callCondenseModel(
    buildCoachingPrompt(opts.hobbyName, opts.level, opts.techniqueName, hasSource),
    userContent,
    "lesson_coaching"
  );
  return result as LessonCoaching | null;
}

// Runs both services in parallel and merges them into the full lesson —
// kept as a convenience wrapper so callers that want the whole lesson
// (rather than orchestrating the two calls themselves) have one entrypoint.
// All-or-nothing: a partial lesson (e.g. breakdown succeeded, coaching
// didn't) would leave slides showing content while others silently look
// broken, which the current per-slide "needsAI" loading gate doesn't
// distinguish — treated as a full failure like the original single-call
// version did.
export async function condenseArticle(
  rawMarkdown: string,
  opts: { hobbyName: string; level: SkillLevel; techniqueName: string }
): Promise<LessonContent | null> {
  const [breakdown, coaching] = await Promise.all([
    generateLessonBreakdown(rawMarkdown, opts),
    generateLessonCoaching(rawMarkdown, opts),
  ]);
  if (!breakdown || !coaching) return null;
  return { ...breakdown, ...coaching };
}
