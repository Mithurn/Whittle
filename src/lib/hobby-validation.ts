// Basic sanity bounds — separate from HOBBY_NAME_MAX in schemas.ts, which
// exists for a different reason (the hard input-length cap on anything
// forwarded to the LLM, per CLAUDE.md's LLM-call guardrails). This range
// just rules out a single stray keystroke or an absurdly long paste.
const MIN_LENGTH = 2;
const MAX_LENGTH = 49;

// Unicode-aware on purpose: hobby names are global (diseño, pétanque,
// Kalaripayattu, non-Latin scripts) — \p{L}/\p{N} accept any language's
// letters/digits rather than an English-only a-z allowlist, which would
// silently reject every non-English hobby name.
const ALLOWED_CHARACTERS = /^[\p{L}\p{N}\s\-']+$/u;

// Blocks the narrow "same key held down" signature (aaaaaa, 111111) without
// rejecting real short acronyms (ASMR, CRPGs) or ordinary repeated-letter
// words — a broader consonant-run heuristic would have false-positived on
// exactly those legitimate hobby names.
const REPEATED_CHARACTER_RUN = /(.)\1{4,}/;

export function isPlausibleHobbyName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) return false;
  if (!ALLOWED_CHARACTERS.test(trimmed)) return false;
  if (REPEATED_CHARACTER_RUN.test(trimmed)) return false;
  return true;
}
