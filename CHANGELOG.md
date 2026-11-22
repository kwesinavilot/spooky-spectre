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
| 2 | Detection and extraction (incl. opt-in background detection, cookie banners) | MVP | Done (v0.7.0); manual Chrome checks confirmed |
| 3 | Candidate finding and segmentation | MVP | Done in v0.8.0 (`.kiro/specs/specter/candidate-segmentation`), with ranked cap, 15 unit tests and corpus-based keyword coverage |
| 4 | AI provider layer and BYOK | MVP | Done in v0.9.0 (`.kiro/specs/specter/ai-providers`). Live tests passed with a hosted provider. Ollama not yet confirmed |
| 5 | Clause analysis and validation | MVP | Built in core and AI, untested live. Possession moved to Spec 6 |
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

### Changed (onboarding ghosts)
- Ghosts enter from the left, the right, or the bottom of the screen.
- Ghosts vary in size, from small to large, and in path: beeline, zigzag, or a loose wander. Each one crosses once; nothing loops.
- Each step has its own seeded mix, so the layout is stable on re-render and different from one step to the next.
- Mode effects on step 4 are unchanged and separate from the regular waves.
- Typecheck passes for the extension. Not run in Chrome.

## [0.9.0] - 2026-10-31

Spec 4 (AI provider layer and BYOK) complete, with the onboarding, Ask, analysis and side panel work
since v0.8.0. Ollama is not yet confirmed on a user machine (Spec 4 task 12).

### Added (onboarding haunts)
- Regular ghost waves on every onboarding step. Ghosts cross the screen once when the step opens; they do not loop. The wave does not change with the chosen mode.
- Step 4 live effects, played on the onboarding screen itself after a mode is picked, and replayed on each new pick. Quiet: still ghosts and a static outline on the chosen card. Subtle: a shimmer on the chosen card, a ghost that rises beside the headline once. Immersive: a pulse on the chosen card, an edge vignette, and three ghosts drifting across. No sample page.
- Reduced motion shows the Quiet look for the step 4 effects and holds the regular waves still.
- Shared `GhostGlyph` in `@specter/ui`.
- Typecheck passes for the UI package and the extension. Not run in Chrome.

### Changed (analysis runs on Analyze)
- With a model connected, Analyze agreement now runs the analysis at once. Before the click, the Page tab says which provider receives the clause sections. The "Preview before sending" setting is off by default and remains available; turning it on adds a Send step.
- A one-time reset applies the new default to saved profiles, since onboarding had saved the preview as on.
- Onboarding privacy copy: "Analyze only when I press Analyze" replaces the old "Ask before analyzing a page" line.
- Note for spec owners: `design steering` §6C still says the preview is on by default. That line is not changed here.

### Removed
- Cost estimate and its "Price not set" placeholder. The Page preview shows the token count only. The price type file and its tests are gone.

### Changed (AI providers on the Vercel AI SDK, Spec 4)
- Model calls use the Vercel AI SDK. Providers: OpenAI, Anthropic, Google Gemini (id `gemini`, replacing `google`), DeepSeek, Mistral, Grok (xAI), Groq, and Ollama on this computer.
- SDK retries are off, so a rate limit or a rejected key is shown at once with a Retry button.
- Typecheck passes for the AI package and the extension. The AI package tests passed on the SDK migration (16 of 16). Not tested against live providers.
- Google Gemini keys saved under the old `google` id must be reconnected.

### Added (token budget, Spec 4)
- Token budget slider on the AI connectivity screen: 1,000 to 8,000 tokens, default 3,000. It caps the agreement text sent for one analysis or one question. The Page and Ask previews count the same budgeted text.
- Redaction was not built. Decision recorded in `.kiro/specs/specter/ai-providers/requirements.md`.
- Spec 4 written as `.kiro/specs/specter/ai-providers` after the code.

### Changed (Spec 5 scope)
- Possession (the moment-of-agreement effect, its callout and daily caps) is out of Spec 5 and belongs to Spec 6, the on-page overlay.

### Added (AI connectivity, Spec 4)
- AI connectivity screen replaces the placeholder: provider, API key (shown as saved, never its value; Replace and Remove), Test connection, access grant for the provider's origin, model picker, "Preview before sending" and "Reuse results this session".
- Test connection now reads the provider's own model list. No model name is hardcoded: the earlier defaults are removed. Analysis and Ask stop with "Choose a model" until one is picked.
- The Page tab preview shows an estimate of the exact prompt size in tokens.
- "Reuse results this session" (off by default) keeps analysis results in memory for the same agreement, model and prompt version. Nothing is stored.
- Spec 3 (candidate finding and segmentation) written as `.kiro/specs/specter/candidate-segmentation`, describing the existing code with open tasks.
- Tested: typecheck only. Not tested against live providers. Model list parsing has no unit tests yet.
- Open: the Vercel AI SDK decision (the code still uses `fetch`); token budget and redaction toggles; a cost figure needs a price set by the user.
- Known limit found while writing Spec 3: candidates are capped in document order, so later sections of long agreements are never sent to the model. Open task 7 in the spec.

### Changed (Spec 2 closed)
- Spec 2 tasks 3.4 (`activeTab` through the popup), 6.4 (Chrome run on the demo pages) and 8.3 (DevTools network check) confirmed by hand in Chrome and ticked in `tasks.md`. No code changed.
- The three corpus pages that fail on script-injected banners remain known limits. The 6.4 Chrome run covers them.

### Added (Ask Specter)
- Ask tab: ask a question about the agreement that was analyzed. Specter picks the sections that match the words of the question (up to eight sections and 12,000 characters), and sends only those when a model is connected.
- Before each question, the panel says how many sections and characters will be sent, and to which provider. A question with no matching words sends nothing.
- Answers cite the sections they rely on. Citations are checked against the sections sent; an answer with no valid citation is shown as "The terms do not say." Each answer marks "Not stated" when the text does not say.
- Errors show a plain reason and a Retry button. The conversation resets when another agreement is analyzed.
- Shared provider setup (`connectionFor`) now serves both analysis and Ask.
- Tested: typecheck only for core, ai and the extension. Not tested against live AI providers, and not run in Chrome. The section retrieval and citation check have no unit tests yet.
- Not built: the "AI connectivity" screen is still a placeholder, so a model can only be connected through onboarding. Citation chips show the section text in the panel; they do not scroll the page.

### Added (findings in the side panel)
- Findings tab: verified findings sorted by impact, filter by impact, source quote, section, "Source verified" chip, "Not stated" lines, Show on page and Dismiss. An empty result says only that nothing was found in what Specter could read.
- Analyze agreement runs the analysis when an AI model is connected and sends it the candidate clause sections. With previewing on (default), a preview lists how many sections will be sent, and nothing leaves the device until Send. Cancel aborts the request.
- Without a model, or when a call fails, the Findings tab shows the on-device screening count and the reason, labelled "Limited · on-device only".
- Show on page highlights the quote on the live page inside the overlay's shadow root. It never clicks or changes page content, and Esc clears it. If the page no longer has the passage, the card keeps its saved quote.
- Navigating to another page clears the findings from the old page.
- Findings are held in memory only and are not saved.
- Tested: typecheck only (`pnpm --filter @specter/extension typecheck`). Not run in Chrome. Not tested against live AI providers. Explain (Ask Specter), the moment-of-agreement effect, Save snapshot and the full Possession rules are not built yet.

### Added (analysis engine)
- Candidate clauses in seven categories, with negations flagged for the model rather than dropped (`@specter/core` classify).
- Deterministic verification: quotes located in their section, offsets checked, amounts and dates in the summary checked against the quote. Failed drafts get one retry, then are dropped and counted (`@specter/core` validate).
- Effect rules: whisper, hand, haunting and possession (`@specter/core` effects).
- Model reply schema, `ModelResponse`, validated on receipt.
- `@specter/ai`: providers for Anthropic, OpenAI, Google and Ollama, the analysis loop with one retry, prompt builder, cost estimate that says "price not set" when unconfigured, and cache key.
- Tests: 92 core tests (including 15 analysis tests) and 16 AI tests, all passing. Typecheck passes for core and AI. Not tested against live AI providers, and not run in Chrome.
- Documented in `docs/analysis.md`.

### Added (onboarding)
- Six-step onboarding built from the reference screens in `docs/design/`: Welcome, Privacy promise, Permissions, Effects and privacy defaults, Connect AI (optional), Ready. Skip setup jumps to the last step with defaults; each step saves its choices on Continue; focus moves to each step's heading.
- Permissions step includes the optional background-detection opt-in, with Chrome's warning explained before the prompt and "Not now" beside "Continue to Chrome".
- Privacy defaults: ask before analyzing, detect cookie banners (the content script now honors it), read linked policies automatically, offer to log consent choices, and save only when I choose (always on).
- Connect AI: Anthropic, OpenAI, Google or a local Ollama model. "Test connection" asks Chrome for access to that provider only, checks the key, and saves it only if it works; the key is never shown again, with Replace and Remove.
- Effect level defaults to Subtle. New UI pieces: `Eyebrow`, `MiniChrome`, and icons for shield, clock, lock, ban and puzzle.

### Fixed
- Onboarding claimed that AI runs only on Analyze and that you see what will be sent first. The preview does not exist yet, so the copy now says so, and the "Ask before analyzing" switch is shown as always on and disabled until the preview is built. Permissions text covers the linked-policy read, which is not AI.

### Changed
- Streamly demo now matches the reference screens: $14.99 per month after a 14-day trial, and an "Accept and start trial" button.

## [0.8.0] - 2026-10-31

### Changed (Spec 3 closed)
- The candidate cap keeps the 40 strongest clauses (by keyword hits) rather than the first 40 in document order, so late sections of long agreements can reach the model. Returned in document order.
- Keyword coverage widened from the corpus: liability ("liable"), disputes (governed by, choice of law, jurisdiction, court), account control (delete, automatic change/update), cancellation (withdraw, waive), privacy (disclose, consent, personalize, profile).
- 15 unit tests for candidate finding in `packages/core/test/classify`. Core suite: 107 of 107 passing.
- Abbreviations are still split at punctuation, by decision. Pinned by a test.

## [0.7.0] - 2026-11-21

Spec 2 (Detection and extraction) code complete, plus the move to the design steering UI. Tested:
typecheck in every workspace, repo-wide ESLint, 77 core tests, 28 extension tests, the corpus report
(7 of 10) and the extension build. Not yet checked by hand in Chrome.

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
- Tested: extension typecheck, 7 extension tests, ESLint on `apps` and `packages`, and the build pass; the built manifest has `default_popup` and no host access at install. Not yet checked by hand in Chrome.

### Changed (Spec 2: linked policies, test setup, demo server)
- Decision: reading a linked policy is automatic after a one-time consent (asked in onboarding, changeable in Settings and Options); without it, a "Read the linked policy" button. Recorded in Spec 2 requirements FR-EXT-08 and §8, the privacy steering and `docs/privacy.md`.
- `packages/core/vitest.config.ts` sets happy-dom for the detection and extraction tests; the per-file pragmas are gone.
- `pnpm examples` serves the demo pages on http://localhost:5178 (Node built-ins only).
- Root scripts `corpus:add` and `corpus:report` reserved for the corpus (Phase 7).
- Removed `update-tasks.cjs`, a one-off script that made `pnpm lint` fail. ESLint now knows Node globals in `scripts/`.

### Added (Spec 2 Phase 5: access modes and tab state)
- Typed messages for detection, tab state and extraction, with request ids (`src/messaging.ts`).
- Access modes (`src/access.ts`): background detection for all http/https sites (opt-in), sites enabled one by one, and the registered detection script kept in line with granted permissions on install, startup, permission changes (including access revoked in Chrome's settings) and prefs changes. Excluded and paused domains are kept out with `excludeMatches`.
- `src/prefs.ts`: excluded domains, paused domains and the linked-policy consent in `chrome.storage.local`, readable by the content script.
- Background worker keeps per-tab detection results in `chrome.storage.session`, clears them on navigation and close, and shows a small dot badge in the medium color (never a number).
- Tested: 23 extension tests (new: access, tab state, manifest permissions) with a mocked `chrome`, extension typecheck and ESLint pass. Not yet checked in Chrome.

### Added (Spec 2 Phase 6: side panel, popup, Options)
- Side panel Page tab: checks the page on open, then shows excluded, unsupported, "needs your OK" (Allow on this site), detected (agreement kinds in plain words, a document choice when there are several, cookie controls marked Detected or Uncertain with "Specter never clicks them", a note when no reject button was found), reading (progress stepper, Cancel), extracted ("Coverage: complete" or "Partial coverage: N% read", reasons, sections, Try again below 80%, "Limited · on-device only") and plain failure messages. Navigation resets it with "The page changed. Run analysis again."
- Popup: Review available, Quiet, Not checked, Paused, Excluded and Unsupported states, and the "Specter on this site" switch.
- Options "Site access": background detection switch with a plain explainer of Chrome's warning before the prompt and "Not now" beside "Continue", the "Read linked policies automatically" switch (also in side panel Settings), sites turned on one by one with Remove, and paused sites with Resume.
- New tests: document choice and default selection, coverage wording.
- Tested: extension typecheck, 28 extension tests, repo-wide ESLint and the build pass. Not yet checked by hand in Chrome.

### Added (Spec 2 Phase 5: content script, Analyze path, linked policies)
- Content script: checks excluded and paused sites before reading anything, detects when the browser is idle, watches for late cookie banners for 15 seconds in background mode, and answers detection and extraction requests (retrying once if the page changes mid-read). It never changes the page apart from the empty overlay host. Bundle: 25 KB (was 81 KB with Zod inside).
- Analyze path: the side panel injects the content script using the popup's `activeTab` grant, or asks for one site's access from an "Allow on this site" click. Stale replies are ignored.
- Linked policies: read without cookies, HTML only, never stored; automatic after the one-time consent, a button otherwise.
- Background worker validates each detection report with the Zod schema before storing it.
- Tested: extension typecheck, 28 extension tests, repo-wide ESLint and the build pass. Not yet checked by hand in Chrome.

### Added (Spec 2 Phase 7: corpus) and Changed (core rules)
- Corpus of 10 saved public pages (`corpus/`): GitHub, Mozilla, Automattic and Dropbox terms; Firefox, DuckDuckGo and Signal privacy; GOV.UK, the Guardian and legislation.gov.uk home pages for cookie banners. `pnpm corpus:add` captures pages, `pnpm corpus:report` scores them and writes `corpus/report.json`. Result: 7 of 10. The 3 failures are cookie banners injected by scripts, which saved copies cannot contain.
- Detection: a page can be more than one kind (Signal's "Terms & Privacy Policy"); a banner must offer accept or reject and, outside a fixed container or dialog, two kinds of control, which removes false positives from footer "Cookie settings" links; banners that are hidden (already dismissed) are ignored.
- Extraction: folded sections (closed `details`, `aria-expanded="false"` regions) are read, because they are part of the agreement and already in the page; collapsed tables of contents are not counted as missing; when the page title is outside `<main>`, the root widens to include it. Spec 2 FR-CMP-02 and FR-DET-02 updated.
- `detectPage` and `extractDocument` no longer validate their own output. Results are validated with the Zod schemas where they are received (background worker, side panel), and the core tests check the schemas on every demo page. New `@specter/core/detect` and `@specter/core/extract` subpaths keep Zod out of the content script.
- The corpus hook now runs `pnpm.cmd corpus:report`.
- Tested: 77 core tests, the corpus report (7 of 10) and the core typecheck pass.

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
