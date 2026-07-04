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

export function isPlausibleHobbyName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) return false;
  if (!ALLOWED_CHARACTERS.test(trimmed)) return false;
  
  // Blocks the narrow "same key held down" signature (aaaaaa, 111111) without
  // rejecting real short acronyms (ASMR, CRPGs) or ordinary repeated-letter words.
  if (/(.)\1{4,}/.test(trimmed)) return false;
  
  // Also block 6+ consecutive consonants to catch "asdkjqwe" keyboard mashes
  // while allowing "ASMR" (4) or "CRPGs" (5) and most valid words.
  if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{6,}/.test(trimmed)) return false;
  
  // Also block 4+ consecutive middle-row home keys ("asdf", "qwer")
  if (/(asdf|fdsa|qwer|rewq|zxcv|vcxz|hjkl|lkjh)/i.test(trimmed)) return false;

  return true;
}
