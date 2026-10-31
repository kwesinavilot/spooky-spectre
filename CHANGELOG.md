# Changelog

All notable changes to **Specter** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Specter is a Chrome MV3 extension that detects agreements on web pages, highlights risky
clauses with verified evidence, explains them in plain language, and remembers what changed.
Tagline: *See what haunts your digital life.*

Spec roadmap:

| Spec | Title | Status |
| --- | --- | --- |
| 1 | Foundation | In progress |
| 2 | Detection and extraction | Not started |
| 3 | Candidate finding and segmentation | Not started |
| 4 | AI provider layer and BYOK | Not started |
| 5 | Clause analysis and validation | Not started |
| 6 | Side panel and overlay | Not started |
| 7 | Onboarding and tutorial | Not started |
| 8 | Graveyard and saving | Not started |
| 9 | Haunting Timeline | Not started |
| 10 | Ask Specter | Not started |
| 11 | Reminders | Not started |
| 12 | Help Center and coach marks | Not started |
| 13 | Accessibility, polish and performance | Not started |

---

## [Unreleased]

### Added — Foundation setup (Spec 1, documentation phase)
- Created `.kiro/steering/` governance files: `product.md`, `tech.md`, `structure.md`, `design.md`, `privacy.md`.
- Created the Foundation spec at `.kiro/specs/specter/foundation/`:
  - `requirements.md` — EARS-format requirements (FR-MONO, FR-WXT, FR-TOK, FR-SCHEMA, FR-DB, FR-SURF, FR-PRIV, FR-A11Y), fixture/property-based test requirements, and acceptance criteria.
  - `design.md` — architecture, package boundaries, WXT config, design tokens, Zod-first data models, Dexie schema, surface shells, messaging, privacy defaults.
  - `tasks.md` — ordered implementation tasks (Phases A–J) with acceptance gates.
- Created `.kiro/hooks/` automation:
  - `vitest-core-on-save` — run Vitest for `packages/core` on save.
  - `typecheck-lint-ui-on-save` — typecheck + ESLint on `apps/extension` / `packages/ui` save.
  - `evidence-validation-on-prompt-change` — run fabricated-quote evidence tests when AI prompts change.
  - `extraction-on-corpus-add` — run extraction and print completeness when a corpus file is added.
  - `pre-commit-secret-scan` — block commits containing API keys, disallowed remote URLs, or document-text logging.

### Notes
- Documentation and governance only in this entry; no code has been written yet.
- The AI analysis pipeline is explicitly out of scope for Spec 1 and is not implemented.

---

## Versioning plan

- `0.x.y` — pre-1.0 development; each completed spec increments the minor (`y`) placeholder within the `0.x` line once code lands.
- `1.0.0` — first release candidate meeting the Part 9 definition of done.
