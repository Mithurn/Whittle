import { NextRequest, NextResponse } from "next/server";
import { condenseArticle } from "@/lib/services/article-service";
import type { SkillLevel } from "@/types/domain";

const JINA_READER_ENDPOINT = "https://r.jina.ai/";
const FETCH_TIMEOUT_MS = 8000;

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1"]);

// Basic guard, not a full SSRF filter (no DNS-resolution check) — but this
// route fetches an arbitrary caller-given URL server-side, so blocking the
// cheap/obvious private-network literals is a real, not hypothetical,
// hardening step for a route shaped exactly like an open proxy otherwise.
function isPrivateOrLoopback(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (/^127\./.test(lower)) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  return false;
}

const JINA_MARKDOWN_MARKER = "Markdown Content:";

// r.jina.ai's response always leads with its own "Title:/URL Source:/
// Published Time:" metadata block before the real article text — we
// already show our own resource.title/sourceName in the UI, so this is
// pure noise that was otherwise rendering as visible plain-text lines
// above the actual article. Falls back to the raw text unchanged if the
// marker isn't found, rather than risk truncating real content on a
// format jina hasn't used yet.
function stripJinaMetadataHeader(raw: string): string {
  const markerIndex = raw.indexOf(JINA_MARKDOWN_MARKER);
  if (markerIndex === -1) return raw;
  return raw.slice(markerIndex + JINA_MARKDOWN_MARKER.length).trim();
}

const VALID_SKILL_LEVELS = new Set<string>(["beginner", "intermediate", "advanced"]);

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url parameter" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid url parameter" }, { status: 400 });
  }
  if (isPrivateOrLoopback(parsed.hostname)) {
    return NextResponse.json({ error: "Invalid url parameter" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  let rawContent = "";
  try {
    const res = await fetch(`${JINA_READER_ENDPOINT}${parsed.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });
    if (res.ok) {
      const text = stripJinaMetadataHeader(await res.text());
      if (text.trim()) {
        const BLOCK_SIGNALS = [
          "blocked by network security",
          "checking if you are human",
          "enable javascript and cookies",
          "access to this page has been denied",
          "please verify you are a human",
          "captcha",
        ];
        const lowerContent = text.toLowerCase();
        if (!BLOCK_SIGNALS.some((signal) => lowerContent.includes(signal))) {
          rawContent = text;
        } else {
          console.warn("[read-article] Source blocked Jina (Bot Protection). Falling back to AI knowledge base.");
        }
      }
    } else {
       console.warn(`[read-article] Jina returned ${res.status}. Falling back to AI knowledge base.`);
    }
  } catch (err) {
    console.warn("[read-article] Jina fetch failed or timed out. Falling back to AI knowledge base.", err);
  } finally {
    clearTimeout(timeout);
  }

  // Generate the structured JSON lesson. If rawContent is empty, the article-service
  // uses the AI's internal knowledge base to generate the lesson.
  const hobbyName = req.nextUrl.searchParams.get("hobbyName");
  const rawLevel = req.nextUrl.searchParams.get("level");
  const techniqueName = req.nextUrl.searchParams.get("techniqueName");
  const level = rawLevel && VALID_SKILL_LEVELS.has(rawLevel) ? (rawLevel as SkillLevel) : undefined;

  if (!hobbyName || !level || !techniqueName) {
    return NextResponse.json({ error: "Missing lesson generation context params" }, { status: 400 });
  }

  const lesson = await condenseArticle(rawContent, { hobbyName, level, techniqueName });
  if (!lesson) {
    return NextResponse.json({ error: "Failed to generate structured lesson" }, { status: 500 });
  }
  
  return NextResponse.json(lesson);
}
