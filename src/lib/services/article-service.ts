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

function buildCondensePrompt(hobbyName: string, level: SkillLevel, techniqueName: string, hasSource: boolean): string {
  let prompt = `You are creating a structured learning module for someone learning ${hobbyName} at a ${level} level. ` +
    `The module is specifically about the technique: "${techniqueName}". `;

  if (hasSource) {
    prompt += `You will be provided with a raw, scraped web article. Use this article to synthesize the lesson. ` +
      `Extract any relevant images from the article and include them as markdown \`![alt](url)\` where appropriate. `;
  } else {
    prompt += `Generate a comprehensive and highly accurate lesson using your own expert knowledge. `;
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
    `  "prosCons": {\n` +
    `    "advantages": ["Point 1", "Point 2"],\n` +
    `    "disadvantages": ["Point 1", "Point 2"]\n` +
    `  },\n` +
    `  "summaryTable": {\n` +
    `    "headers": ["Column 1", "Column 2", "Column 3"],\n` +
    `    "rows": [["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"]]\n` +
    `  }\n` +
    `}\n` +
    `Output ONLY the JSON object. Do not include markdown code blocks around the JSON.`;
    
  return prompt;
}

// Generates a structured JSON lesson from a raw scraped article.
export async function condenseArticle(
  rawMarkdown: string,
  opts: { hobbyName: string; level: SkillLevel; techniqueName: string }
): Promise<LessonContent | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  // We no longer skip short articles because we need the strict JSON structure even if the source is short.

  const hasSource = rawMarkdown.trim().length > 0;

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
          { role: "system", content: buildCondensePrompt(opts.hobbyName, opts.level, opts.techniqueName, hasSource) },
          { role: "user", content: hasSource ? rawMarkdown.slice(0, ARTICLE_INPUT_MAX_CHARS) : `Technique: ${opts.techniqueName}` },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = await res.json();
    devLog("condense", data.usage);
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;
    
    // Groq JSON mode guarantees parseable JSON, but we still defensive-parse
    const parsed = JSON.parse(content.trim());
    return parsed as LessonContent;
  } catch (err) {
    console.error("[read-article] JSON lesson generation failed", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
