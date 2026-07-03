import type { SkillLevel } from "@/types/domain";

const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Hard input cap on article text forwarded to the model — an unbounded
// scraped article is both a token-cost risk and a prompt-injection surface
// (CLAUDE.md's LLM-call guardrails). ~12k chars ≈ ~3k tokens, plenty for
// the model to find the valuable sections of any real tutorial article.
export const ARTICLE_INPUT_MAX_CHARS = 12_000;

// Below this, the article is already a quick read — condensing it would
// spend a Groq call to save the user nothing.
const SKIP_CONDENSE_BELOW_CHARS = 1_500;

const CONDENSE_TIMEOUT_MS = 12_000;

function devLog(label: string, usage: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[read-article] ${label} usage:`, usage);
  }
}

function buildCondensePrompt(hobbyName: string, level: SkillLevel): string {
  return (
    `You are condensing a scraped web article for someone learning ${hobbyName} at a ${level} level. ` +
    `Keep ONLY the parts of the article that give this specific learner real value — cut intros, filler, ` +
    `product promotion, calls-to-action, comment sections, and anything aimed at a different skill level. ` +
    `Preserve the article's own wording where you keep it; reorganize into short, clearly-headed markdown ` +
    `sections (## headings, bullet lists where the source used them). Keep at most 2 of the original ` +
    `image lines (the ![alt](url) markdown, copied exactly) placed where they support the text. ` +
    `Do NOT invent content that isn't in the article. Aim for roughly 300-600 words. ` +
    `Output only the condensed markdown — no preamble, no "here is the summary".`
  );
}

// Condenses a raw scraped article into the sections that matter for this
// user's hobby and skill level. Returns null on any failure or when the
// article is already short — the caller treats null as "show the raw
// article instead", so this can never make the reading experience worse
// than it was before condensing existed.
export async function condenseArticle(
  rawMarkdown: string,
  opts: { hobbyName: string; level: SkillLevel }
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (rawMarkdown.length < SKIP_CONDENSE_BELOW_CHARS) return null;

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
        messages: [
          { role: "system", content: buildCondensePrompt(opts.hobbyName, opts.level) },
          { role: "user", content: rawMarkdown.slice(0, ARTICLE_INPUT_MAX_CHARS) },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = await res.json();
    devLog("condense", data.usage);
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;
    return content.trim();
  } catch (err) {
    // Timeout (via the abort above), rate limit surfacing as a network
    // error, or malformed response — all expected failure modes of a
    // free-tier LLM API; the raw article is always available as fallback.
    console.error("[read-article] condense failed, falling back to raw article", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
