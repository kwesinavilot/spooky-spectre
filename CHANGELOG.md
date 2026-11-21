# Changelog

All notable changes to **Specter** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Specter is a Chrome MV3 extension that detects agreements on web pages, highlights
risky clauses with verified evidence, explains them in plain language, and remembers
what changed. Tagline: *See what haunts your digital life.*

Spec roadmap:

| Spec | Title | Status |
| --- | --- | --- |
| 1 | Foundation | Code complete, build verification pending |
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

## [0.5.0] - 2026-10-31

### Fixed
- Dependency incompatibility: `@vitejs/plugin-react@6` imports `vite/internal`, which WXT's pinned Vite 5 does not export. Added a pnpm override pinning `@vitejs/plugin-react` to `4.3.4`, unblocking `wxt prepare` and `wxt build`.
- `wxt.config.ts` no longer passes the `vite` option as an object (WXT 0.21 requires it as a hook function, which caused `userConfig.vite is not a function`). The `@` alias was dropped; entrypoints import `src/` via relative paths.
- `packages/ui` `ErrorBoundary` now uses `override` modifiers on `state`, `componentDidCatch` and `render` (required by `noImplicitOverride`), restoring a clean `tsc` pass.

### Verified
- 18/18 `packages/core` unit tests (Zod schema fixtures, WCAG contrast pairs).
- 1/1 `apps/extension` Dexie round-trip test (`AgreementRecord` write/read on fake-indexeddb).
- `tsc --noEmit` green for `core`, `ai`, `help` (ui fix pending final re-run).

### Notes
- Extension production build (`wxt build`) still needs a final green run after the fixes above; tracked in Spec 1 Phase J.

## [0.4.0] - 2026-10-31

### Added
- `apps/extension` WXT app (scaffolded from the official `wxt init` react template, renamed `@specter/extension`):
  - Manifest V3 with permissions `activeTab`, `storage`, `sidePanel`, `scripting`, `alarms`, `notifications`; host access only via `optional_host_permissions`, never granted by default.
  - `background` service worker: opens the side panel on toolbar click (`setPanelBehavior`), opens onboarding on install.
  - `content` script with `registration: 'manual'` (injects on demand only) mounting an invisible Shadow DOM overlay host — nothing renders on a page until a finding exists.
  - Surface shells: side panel (idle state + Findings/Evidence/Ask Specter tabs), Graveyard (search, stat cards, empty state), Options (seven placeholder sections incl. excluded domains from `@specter/core`), Onboarding (welcome headline), Help Center (searchable article catalog).
  - Data layer: Dexie schema (`agreements`, `versions`, `settings`, `dismissedTips`), Zustand stores (`settings`, `sidepanel`), typed message bus (`ping`/`pong`/`get-status`), `chrome.storage.local`-only secrets helper, tab navigation helper.
  - Styling: Tailwind v3 via PostCSS, tokens exposed as `specter-*` utilities and `--specter-*` CSS variables, Fraunces + IBM Plex Sans bundled locally via `@fontsource` (no remote fonts).

## [0.3.0] - 2026-10-31

### Added
- `packages/ui`: design token re-export from core, primitives (`Button`, `Link`, `TextInput`, `SearchField`, `Card`, `SectionCard`, `StatCard`, `Tabs`, `IconButton`, `Icon` with inline stroke SVG and accessible names), `AppShell` with the "?" help affordance, `ErrorBoundary` with a calm fallback. All controls are 44px targets with visible focus rings.
- `packages/ai`: provider abstraction (`Provider`, `AnalysisRequest`, `ConnectionTest` statuses including `ollama_not_running`). No network code yet — real providers arrive in Spec 4, so switching providers will need no caller changes.
- `packages/help`: catalog of all 26 Help Center articles across Getting started, How-tos, Guides, and Trust and safety (bodies arrive in Spec 12).

## [0.2.0] - 2026-10-31

### Added
- pnpm monorepo: `pnpm-workspace.yaml`, root scripts (`dev`, `build`, `typecheck`, `lint`, `test`), strict `tsconfig.base.json` (with `noImplicitOverride`, `noUnusedLocals/Parameters` and `@specter/*` path mapping), ESLint flat config (package-boundary `no-restricted-imports`, no-emoji rule, `no-console` in `packages/ai` and `secrets.ts`), Prettier, `.nvmrc` (Node 20), reproducible lockfile.
- `packages/core` (pure logic, unit tested):
  - Zod-first data models: `Concern`, `Category`, `Effect`, `Evidence` (with `startOffset <= endOffset` refinement), `ClauseFinding` (confidence bounded 0..1), `Consent` (`evidenceType` limited to `observed_click` / `user_confirmed`), `AgreementRecord`. Types are inferred from the schemas.
  - Canonical design tokens + the WCAG AA text/background pairings that must pass 4.5:1 (violet is an accent/background color used with ink text, never body text on panel).
  - `contrast.ts`: WCAG relative-luminance and contrast-ratio helpers.
  - `privacy.ts`: default excluded domains (banking, health, email), sensitive input selectors (password, card, `cc-*`), `shouldAnalyze(host)` gate.
- Tests: 13 contrast-pair assertions and 5 schema fixture assertions (TEST-SCHEMA-01..03, TEST-TOK-01).

## [0.1.0] - 2026-10-31

### Added
- `.kiro/steering/` governance: `product.md`, `tech.md`, `structure.md`, `design.md`, `privacy.md` — always-included rules for tone (never legal advice), stack, package boundaries, tokens/a11y, and privacy defaults.
- Foundation spec at `.kiro/specs/specter/foundation/`: EARS-format requirements (FR-MONO/WXT/TOK/SCHEMA/DB/SURF/PRIV/A11Y), design (architecture, Zod-first models, Dexie schema, surface shells), and ordered tasks (Phases A–J with acceptance gates).
- `.kiro/hooks/` automation: Vitest on `packages/core` save, typecheck+ESLint on extension/UI save, evidence-validation tests on AI prompt change, extraction on corpus file add, and a pre-commit scan that blocks API keys, disallowed remote URLs, or document-text logging in staged extension code.
- This changelog.

---

## Versioning plan

- `0.x.y` — pre-1.0 development; each completed spec increments the minor line.
- `1.0.0` — first release candidate meeting the definition of done: end-to-end demo on Streamly plus 7/10 real corpus pages, every finding verified, onboarding under three minutes, no network beyond the chosen AI provider, keyboard/reduced-motion checks, README covering architecture, privacy, limits, and the spec/steering/hook workflow.
