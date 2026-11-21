# Changelog

All notable changes to **Specter** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Specter is a Chrome MV3 extension that detects agreements on web pages, highlights
risky clauses with verified evidence, explains them in plain language, and remembers
what changed. Positioning: *The things you agree to online shouldn't come back to haunt you.*

Spec roadmap:

| Spec | Title | Scope | Status |
| --- | --- | --- | --- |
| 1 | Foundation | MVP | Done (v0.6.0) |
| 2 | Detection and extraction (incl. opt-in background detection, cookie banners) | MVP | Not started |
| 3 | Candidate finding and segmentation | MVP | Not started |
| 4 | AI provider layer and BYOK | MVP | Not started |
| 5 | Clause analysis and validation | MVP | Not started |
| 6 | Side panel (Contract Exorcist) and Spectral Vision overlay | MVP | Not started |
| 7 | Onboarding and tutorial | MVP | Not started |
| 8 | Graveyard, saving and consent search | MVP | Not started |
| 9 | Version comparison (Haunting Timeline) | MVP | Not started |
| 10 | Ask Specter | MVP | Not started |
| 11 | Reminders | Later | Deferred |
| 12 | Help Center and coach marks | MVP | Not started |
| 13 | Accessibility, polish and performance | MVP | Not started |

Later, outside the MVP: automatic monitoring of saved policies, subscription reminders, scam and
phishing investigation, multi-browser support, cloud sync and accounts.

---

## [Unreleased]

### Added
- Spec 2 (Detection and extraction) at `.kiro/specs/specter/detection-extraction/`: EARS requirements for access modes and opt-in background detection, privacy gates, rule-based detection (cookie banners with control roles, terms, privacy, subscription terms, EULA, signup checkboxes), extraction with section ids, offsets, anchors, SHA-256 hash and completeness, side panel states, demo fixtures and the 10-page corpus. Design and ordered tasks included. Documents only; no code yet.
- One open decision recorded in the spec: whether Specter may fetch a linked policy page when the user clicks "Read the linked policy".
- Spec 2 core code (tested: 54 core tests and the core typecheck pass): Zod schemas for detection and extraction; rule-based detection of cookie banners (control roles, Detected/Uncertain certainty, no-reject note), terms, privacy and license pages, sign-up checkboxes, subscription wording, policy links, submit controls and unreadable consent containers; extraction with flat numbered sections, anchors, SHA-256 hash and completeness reasons; demo pages under `examples/` (Streamly signup and terms v1/v2, five cookie banner variants, a benign page); fixture and property tests.

### Changed
- Design steering motion rules rewritten: scares are rare and earned. Ghosts appear in every mode (drifting in Immersive, rising in Subtle, still in Quiet and reduced motion). Possession returns with an edge-only vignette, slow red pulses, three drifting ghosts and a callout, triggered only for a verified high-impact finding at the moment of agreement, at most once per site per day and three times a day. No flashing, nothing blocks the site, Esc dismisses everything, sound is opt-in.
- Product steering gains the scare principles (moment of agreement, Resurrection on revisit, rationing, warn never block) and the three-minute demo arc.
- New workflow steering (`.kiro/steering/workflow.md`): every unit of work updates `docs/`, its spec tasks and this changelog, and gets its own commit and push. Untested work is committed and labeled untested.

### Fixed
- Core DOM tests could not load because happy-dom replaces the global `URL`; `test/helpers.ts` now builds the examples path with `node:path`. The 20,000-word budget test counted words across newlines; it now splits on all whitespace. Added a test that `cookies/late.html` has no banner at parse time. Tested: 54 of 54 core tests pass, core typecheck passes.

### Changed (UI: design tokens and fonts)
- Moved to the design steering tokens: `bg`, `bg-deep`, `surface`, `surface-2`, `inset`, `ghost`, `lavender`, `text` (class `fg`), `muted`, `high`, `high-text`, `medium`, `ok`, `line`, as Tailwind classes and CSS variables. The old `specter-*` classes are gone; every existing screen was renamed mechanically.
- Fonts: Inter and JetBrains Mono replace IBM Plex Sans; Fraunces stays for headings. All bundled locally.
- Tailwind preset adds the steering type scale, radii (control 12, card 16, quote 10) and the floating shadow.
- The danger button is now an outline (`high` border, `high-text` label), because dark text on `high` fails contrast.
- Contrast tests now cover every text color on every background at 4.5:1 and borders, focus ring and dots at 3:1.
- New docs page `docs/ui.md`.

### Added (UI: component set)
- Components from design steering §3 in `@specter/ui`: `Button` (primary, secondary, quiet, danger; block), `IconButton`, `Chip`, `Card` variants and `InsetCard`, labeled `TextInput` and `Select`, `SearchField`, `Toggle` (switch), `OptionCard` (radio), `Segmented`, `SourceQuote`, `DiffText`, `ProgressStepper`, `Logo`, `PanelHeader` and `PanelNav`. Icons now use stroke 1.8 and are decorative unless labeled; new icons for back, check, settings, key, user, page, list, chat, history and external.
- `AppShell` shows the logo, page title and an icon Help button on a 960px layout.
- Existing screens updated to the new button variants; the Options provider field now has a visible label.
- Segmented segments are 44px instead of the steering's 40px so every target meets 44px.
- Tested: typecheck in all workspaces, ESLint on `apps` and `packages`, and the extension build pass. Root `pnpm lint` still fails, only on `update-tasks.cjs` (a committed one-off script, not part of this change).

### Added (UI: popup and side panel shell)
- Toolbar popup: logo, Settings, the current host in mono, a status chip (Not checked, Excluded, Unsupported page), "Open Specter" (opens the side panel for that tab), and Graveyard and Help links. Opening the popup grants `activeTab`, which settles Spec 2 task 3.4 by design.
- Side panel rebuilt as the four-tab shell: header with AI connectivity and Settings buttons, Page, Findings and Ask tabs, History opening the Graveyard, and Settings and AI drill-ins with a back arrow that returns to the same tab. The Page tab shows excluded, unsupported and idle states; Analyze stays disabled until Spec 2 Phase 5.
- `describePage()` classifies the active tab (supported, excluded, unsupported with a reason) for both surfaces.
- The background worker no longer opens the side panel directly from the toolbar.
- New tests: `test/pageInfo.test.ts` and `test/sidepanel.test.ts` (navigation and back behavior).

### Added (docs)
- `docs/` folder with an index, architecture, detection and extraction, effects and scares, privacy model, and development pages, describing what exists today and marking what is unverified or planned.

## [0.6.0] - 2026-10-31

### Changed
- Product direction adopted from the product vision: Specter's three jobs are seeing the invisible, explaining the consequences, and remembering the agreement. New positioning line: "The things you agree to online shouldn't come back to haunt you." Feature names Spectral Vision (highlights), Contract Exorcist (findings report) and the panel subtitle "Your digital sixth sense" are now in `.kiro/steering/product.md`.
- Background detection is now an opt-in. During onboarding (or later in Options) the user can grant access to all http/https sites so Specter detects agreements locally while they browse and shows a small indicator. Users who decline keep per-site access. AI analysis still requires an explicit click. Recorded in `tech.md` and `privacy.md`, including the plain-language Chrome warning the onboarding step must show.
- MVP scope fixed: extension and side panel, cookie banner detection, terms and privacy extraction, cited AI explanations, Spectral Vision highlights, local snapshots, version comparison. Reminders (Spec 11), automatic monitoring, scam investigation, multi-browser support and cloud sync moved to Later.
- Added product scenarios A to D (cookie banners, free trials, terms and policies, checkout pages) and consent search over saved records to the product steering.
- Manifest permissions reduced to `activeTab`, `storage`, `sidePanel`, `scripting`. `alarms` and `notifications` return when reminders are built. FR-WXT-02 and FR-WXT-03 updated to match.
- Tech steering now says React 19, matching the installed version.
- FR-SURF-05: the Onboarding Begin button stays enabled and opens the Graveyard until Spec 7 replaces the screen.

### Verified
- Spec 1 (Foundation) closed. Typecheck, lint, 19 unit tests and `wxt build` pass. The built manifest has version 0.6.0, only `activeTab`, `storage`, `sidePanel` and `scripting`, and http/https host access as optional only.
- The unpacked build loads in Chrome; the side panel, Graveyard, Options, Onboarding and Help Center all open without console errors.
- Accepted as-is: the Help catalog stays in TypeScript until Spec 12 adds markdown bodies, and `no-console` is enforced by ESLint config without a separate rule test.

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
