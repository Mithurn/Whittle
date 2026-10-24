# Quality report: Whittle

Branch: `chore/repo-quality-pass`. No behavior or public API changes.

## Baseline vs. final

| | Baseline | Final |
|---|---|---|
| Tests | 39 files / 281 passed | 42 files / 296 passed |
| Coverage (stmts / branches / funcs / lines) | 84.41 / 79.02 / 81.26 / 85.44 | 87.04 / 81.80 / 84.02 / 88.34 |
| Lint | 0 errors, 4 warnings | 0 errors, 3 warnings |
| Typecheck (`tsc --noEmit`) | 1 error | clean |
| Build | not run at baseline | passes |
| `npm audit` | 15 vulns (1 critical, 10 high, 4 moderate) | 10 (6 high, 4 moderate), all dev tooling |

## Changes by phase

**Phase 1:** `docs/ARCHITECTURE.md`.

**Phase 2:** new tests for `Mascot`, `ThemeToggle`, `ThemeProvider`; `PodcastMode` tests extended (Apple/SoundCloud embeds, delayed loader hide); `@vitest/coverage-v8` and a `test:coverage` script added.

**Phase 3:** removed an unused `eslint-disable` directive; fixed the `beforeEach` typecheck error in `technique/[id]/page.test.tsx`. No dead code or unused dependencies found (depcheck clean).

**Phase 4:** secrets/unsafe-pattern scan found nothing (no hardcoded keys, no `dangerouslySetInnerHTML`/`eval`). Upgraded `next` and `eslint-config-next` 16.2.9 to 16.4.3 (clears the critical advisory) and `zod` to 4.6.6 (high). Build, lint, typecheck and tests verified after.

**Phase 5:** README (test count, scripts, contributing section), `.github/workflows/ci.yml` (lint, typecheck, test, build).

## Bugs found

None fixed or open beyond the typecheck error above.

## Needs human review / skipped

- Remaining 10 audit findings are dev-only (vite, vitest, browserslist, js-yaml, brace-expansion...). `npm audit fix` and `npm i` for vitest crash with an npm internal error (`edgesOut`), even from a clean install, so they were not applied. Retry with a newer npm.
- Major upgrades available, not applied: react/react-dom 19.3, motion 14, lottie-react 3, `@vitejs/plugin-react` 6, eslint 10, `@testing-library/jest-dom` 7, `@types/node` 26.
- Prettier was not added: the repo has no formatter and adopting one would reformat nearly every file. Decide on style first.
- `/api/read-article` blocks only literal private/loopback hostnames (documented in code as not a full SSRF filter). The fetch goes through r.jina.ai, so the exposure is limited, but IPv6 literals and DNS-based bypasses are not covered.
- Four `<img>` lint warnings (`next/image`) left, since switching changes rendering.
- Lowest coverage: `app/page.tsx`, `layout.tsx` (0%), `AnimatedList` (35%), `NotesDrawer` (64%).

## Next steps

Add Prettier with a one-time format commit; add tests for `AnimatedList` and `NotesDrawer`; schedule dependency updates (Dependabot); retry audit fixes with a newer npm.
