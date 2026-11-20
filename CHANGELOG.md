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

---

## [0.1.0] - 2026-11-20

First pre-release: foundation spec (Spec 1) implemented on a fresh repository. Nothing was
shipped before, so this is a feature-scale minor bump from the `0.0.0` placeholder.

### Added
- pnpm workspace with root tooling: ESLint (flat config), Prettier, TypeScript base config,
  `.nvmrc`, `.gitignore`, `.prettierignore`, and test scripts.
- `packages/core`: Zod schemas, design tokens, contrast utilities, privacy helpers, plus
  Vitest unit tests for schema and contrast.
- `packages/ai`: provider type definitions and package shell.
- `packages/ui`: `AppShell`, `ErrorBoundary`, UI primitives with inline stroke SVG icons,
  base styles and tokens.
- `packages/help`: help content index module.
- `apps/extension` (WXT, MV3, React 18, Tailwind): entrypoints for background, content,
  sidepanel, options, onboarding, graveyard, and help; Dexie database setup; message bus;
  settings and sidepanel Zustand stores; secrets handling via `chrome.storage.local`;
  extension icons; manifest config.
- Governance and spec documentation under `.kiro/` (steering files, Foundation spec
  requirements/design/tasks, save-time hooks, pre-commit secret scan).

---

## Versioning plan

- `0.x.y` — pre-1.0 development; each completed spec increments the minor (`y`) placeholder within the `0.x` line once code lands.
- `1.0.0` — first release candidate meeting the Part 9 definition of done.
