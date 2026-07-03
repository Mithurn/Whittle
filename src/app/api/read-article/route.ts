import { NextRequest, NextResponse } from "next/server";

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
  try {
    const res = await fetch(`${JINA_READER_ENDPOINT}${parsed.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Could not fetch article" }, { status: 502 });
    }
    const content = stripJinaMetadataHeader(await res.text());
    if (!content.trim()) {
      return NextResponse.json({ error: "Article was empty" }, { status: 502 });
    }
    return NextResponse.json({ content });
  } catch (err) {
    // Timeout (via the abort above), network failure, or a source blocking
    // the fetch (paywall, robots.txt) — r.jina.ai is a free, no-SLA
    // third-party service, so this is expected, normal behavior to handle,
    // not an edge case. The caller (TechniqueModal) falls back to opening
    // the real URL directly on any non-200 response.
    console.error("[read-article] failed", err);
    return NextResponse.json({ error: "Could not fetch article" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
