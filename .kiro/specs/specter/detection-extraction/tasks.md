# Implementation Plan: Spec 2 — Detection and Extraction

> Ordered tasks for `requirements.md` and `design.md` in this folder. Each task names the
> requirements it satisfies. Status legend: `[x]` done · `[~]` partly done · `[ ]` not done.

> **Progress:** the core library (Phases 1 to 4) is done and green: 54 core tests and the core
> typecheck pass. Open in those phases: 1.3 (a `vitest.config.ts` instead of per-file pragmas) and
> 2.5 (`pnpm examples`). Nothing in `apps/extension` is wired yet. Next: 3.4 (the `activeTab` spike),
> then Phases 5 and 6. The UI tasks follow the design steering file: dot badge, Detected/Uncertain
> controls, Coverage labels and a toolbar popup.

## Overview

Build rule-based detection and extraction in `packages/core`, then wire it into the extension
(access modes, content script, background state, side panel, popup, Options), then measure it on a
regression corpus.

## Tasks

## Phase 1 — Schemas and test setup

- [x] 1.1 Add `AgreementKind`, `ElementAnchor`, `CookieControl`, `PolicyLink`, `Unreadable`, `DetectionResult`, `CompletenessReason`, `Section` and `ExtractedDocument` to `packages/core/src/schema.ts` (design §2). _NFR-02_
- [x] 1.2 Add schema fixture tests: valid objects parse; labels over 80 characters, offsets out of order and completeness above 1 are rejected (`test/schema-spec2.test.ts`). _NFR-02_
- [x] 1.3 `happy-dom` and `fast-check` are in `packages/core` dev dependencies; `packages/core/vitest.config.ts` runs `test/detect/**` and `test/extract/**` in happy-dom, so test files need no pragma. The corpus run has its own config. _NFR-01_

## Phase 2 — Demo fixtures

- [x] 2.1 Write `examples/streamly/signup.html` and `terms-v1.html` with numbered sections 1 to 8 (design §9). _FR-FIX-01_
- [x] 2.2 Write `terms-v2.html` from v1 with only the two FR-FIX-02 edits; test that diffs the two texts (in `test/extract/extract.test.ts`). _FR-FIX-02_
- [x] 2.3 Write `examples/cookies/` pages: `index.html`, `no-reject.html`, `shadow.html`, `closed-shadow.html`, `late.html`. _FR-FIX-01_
- [x] 2.4 Write `examples/benign/terms.html`. _FR-FIX-01_
- [x] 2.5 `pnpm examples` runs `scripts/serve-examples.mjs`: Node built-ins only, serves `examples/` on http://localhost:5178 and refuses paths outside it. _FR-FIX-01_

## Phase 3 — Detection rules (packages/core)

- [x] 3.1 Shared walker in `src/dom/walk.ts`: open shadow roots, same-origin iframes, sensitive and form-control skipping, closed-shadow and cross-origin-frame recording. _FR-DET-09, FR-PRV-02_
- [x] 3.2 `detect/controls.ts` (label regex tables, `Detected`/`Uncertain` certainty) and `detect/banner.ts` (two-signal rule, control roles, `noRejectControlFound`). _FR-DET-02, 03, 04_
- [x] 3.3 `detect/pageKind.ts`, `detect/forms.ts` (consent checkbox and subscription terms) and `detect/links.ts`. _FR-DET-05, 06, 07, 08_
- [~] 3.4 Resolved by design: the toolbar now opens a popup (design steering 6B), and opening an extension popup grants `activeTab` for that tab, so the side panel it opens can use `executeScript` on it. The per-origin permission request stays as the fallback. Still to confirm by hand in Chrome during 6.4. _FR-ACC-08_
- [x] 3.5 `detectPage(doc, url, opts)` in `detect/index.ts` combining the rules, stripping query and hash, honoring `shouldAnalyze`, and validating with `DetectionResult`. _FR-DET-01, FR-PRV-05_
- [x] 3.6 Tests TEST-DET-01, TEST-DET-02, TEST-DET-03, TEST-PRV-01, TEST-PRV-02 in `test/detect/detect.test.ts`, plus a test that `cookies/late.html` has no banner at parse time and that the Streamly submit button is recorded (FR-DET-14). Green. _§6_
- [x] 3.7 TEST-NOINT-01 runs detection and extraction on every demo page and compares the HTML before and after. Green. _FR-DET-12_
- [x] 3.8 `test/helpers.ts` now builds `examplesDir` with `node:path`, because happy-dom replaces the global `URL`. The only other failure was the 20,000-word test counting words across newlines; fixed. Core tests and typecheck green. _§6, §7 criterion 5_

## Phase 4 — Extraction (packages/core)

- [x] 4.1 `normalizeInline()` in `src/dom/text.ts`, exported from the package for reuse by Spec 5. _FR-EXT-03_
- [x] 4.2 Root selection (`chooseRoot`) and block walking (`extract/blocks.ts`). _FR-EXT-01, 02_
- [x] 4.3 `extract/sections.ts`: splitting, numbered and slug ids, duplicate suffixes, offsets. _FR-EXT-04, 05_
- [x] 4.4 `dom/anchors.ts`: CSS path with shadow boundaries and text-quote selector. _FR-EXT-06_
- [x] 4.5 `extract/hash.ts` (SHA-256 hex). _FR-EXT-07_
- [x] 4.6 Completeness counting, plain-word reasons and the 0.9 cap (`scoreCompleteness`, `REASON_MESSAGES`). _FR-EXT-09, FR-CMP-01 to 03_
- [x] 4.7 `extractDocument(doc, opts)` returning a validated `ExtractedDocument`. _FR-EXT-01_
- [x] 4.8 TEST-EXT-01 and TEST-EXT-02 (property), TEST-EXT-03, TEST-EXT-04 and TEST-CMP-01 in `test/extract/extract.test.ts`. Extraction no-interference and sensitive values in extracted text are covered by TEST-NOINT-01 and TEST-PRV-01 in the detect test file. Green. _§6, FR-PRV-02_
- [x] 4.9 Budget tests pass with loose ceilings for the test DOM: 20,000 words extracted in about 115 ms; detection on every demo page under 250 ms. The real budgets (FR-EXT-12, FR-DET-13) are checked in Chrome in 8.x. _FR-EXT-12, FR-DET-13_

## Phase 5 — Extension wiring

- [x] 5.1 `SpecterMessage` in `src/messaging.ts` has the design §6 messages plus `get-detection`/`detection` and `tab-state-changed`, and `TabState`. Extract messages carry a `requestId` (the tab id is the message target, so it is not repeated in the body). `sendToTab` added. _FR-UI-*_
- [x] 5.2 `src/access.ts`: `enableBackground`, `disableBackground`, `enableSite`, `disableSite`, `listEnabledSites`, `hasBackgroundAccess`, `hasSiteAccess`, `syncRegistrations`, with `excludeMatches` built from excluded and paused domains. Those lists live in `chrome.storage.local` (`src/prefs.ts`) because content scripts cannot read the extension's IndexedDB. One registration per tab's top frame (`allFrames: false`); the top frame walks same-origin frames itself. _FR-ACC-02, 04, 05, 07_
- [ ] 5.3 Update `content.ts`: `shouldAnalyze` gate before any DOM read, `requestIdleCallback` detection via `detectPage`, late-banner `MutationObserver` (debounced 500 ms, stops after 15 s, background mode only), and `extract` handling with the fingerprint retry and `page_changed` reason. Keep the existing empty Shadow DOM host; add nothing else to the page. _FR-PRV-01, FR-DET-10, FR-DET-12, FR-EXT-11_
- [x] 5.4 `background.ts` with `src/backgroundHandlers.ts` and `src/tabState.ts`: tab state in `chrome.storage.session`, cleared when the tab moves to a different page (same page with a new query string keeps it) and when it closes; the dot badge in the medium color, never a number; `syncRegistrations` on install, startup, permission changes and prefs changes. _FR-DET-11, FR-PRV-03, FR-ACC-05_
- [ ] 5.5 Write `apps/extension/src/linkedPolicy.ts`: fetch automatically during Analyze when the "Read linked policies automatically" consent is on (button otherwise; requirements §8), with `credentials: 'omit'`, HTML content-type check, PDF state, `DOMParser` with a `<base href>`, then `extractDocument`. The response is never stored and nothing is logged. _FR-EXT-08, FR-EXT-10, FR-PRV-04, FR-PRV-05_
- [ ] 5.6 Per-site Analyze path: `chrome.scripting.executeScript` on the active tab, falling back to a per-origin permission request from the button click as decided in 3.4. _FR-ACC-08_
- [x] 5.7 Extension tests with a mocked `chrome` (`test/chromeMock.ts`): `access.test.ts` (none, all sites, revoked outside Specter, turned off, per site, excluded and paused domains), `tabState.test.ts` (stored without the query string, dot badge, top frame only, cleared on navigation and close) and `manifest.test.ts` (no `host_permissions`, http/https only as optional, MVP permissions only). 23 extension tests green. _FR-ACC-01, 04, 05, FR-PRV-03_

## Phase 6 — Side panel, popup and Options

- [ ] 6.1 Extend `useSidePanel` with the design §7 states and add an in-memory Zustand store for the extracted document (no persistence). Add a state-machine unit test for the transitions and for invalidating work on navigation. _FR-PRV-04_
- [ ] 6.2 Build the side panel states: excluded, no access, idle, detected (cookie controls as `Detected`/`Uncertain`, "Specter never clicks them", linked-policy buttons), PDF, reading with Cancel, extracted ("Coverage: complete" or "Partial coverage" with percent, reasons, section headings, Try again below 80%). Use design-system tokens and components, 44 px targets, `aria-live="polite"` for progress and `role="alert"` for errors. _FR-UI-01 to 05, FR-CMP-04, FR-DET-03, 04_
- [ ] 6.3 Build the Options "Site access" section: background detection switch with the Chrome warning explainer shown before the prompt (declining as easy as accepting), the per-site list with Remove, and the current state read from `chrome.permissions.contains`. _FR-ACC-03, 06, 09_
- [ ] 6.4 Manual check in Chrome on the demo pages (served by `pnpm examples`): badge on, badge off on the benign page, all side panel states reachable, revoking access in Chrome turns background detection off. _§7 criteria 2 to 4_
- [~] 6.5 Toolbar popup built (design steering §6B): host, status chip (Not checked, Excluded, Unsupported page), "Open Specter" opening the side panel, Settings, Graveyard and Help. Still to add once Phase 5 exists: Agreement detected, Nothing found and Paused states from the shared tab state, and the "Specter on this site" toggle. _FR-DET-11, FR-PRV-01, FR-UI-05_

## Phase 7 — Corpus

- [x] 7.1 `scripts/corpus-add.mjs` (`pnpm corpus:add <url> <name>` or `--sources`) and the corpus runner as a Vitest file with its own config (`packages/core/test/corpus/corpus.test.ts`, `vitest.corpus.config.ts`, `pnpm corpus:report`): loads each saved page in happy-dom with resource loading off, runs `detectPage` and `extractDocument`, prints a table, writes `corpus/report.json`, fails below 7 of 10. A Vitest file instead of `scripts/corpus.ts` because core uses extensionless TypeScript imports that plain Node cannot load. _FR-COR-02_
- [x] 7.2 The `extraction-on-corpus-add` hook runs `pnpm.cmd corpus:report` when a page is added to `corpus/pages/`. _FR-COR-02_
- [x] 7.3 10 pages in `corpus/` (4 terms, 3 privacy including Signal's combined page, 3 cookie-banner home pages), listed in `sources.json` with manifest phrases copied from each saved page. Chosen by Specter on the user's instruction; ico.org.uk refused the request and was replaced by legislation.gov.uk. _FR-COR-01_
- [x] 7.4 Result 7 of 10. General rule fixes from the corpus: multiple page kinds per page; root widened when the `<h1>` is outside `<main>`; folded sections read (FR-CMP-02 changed); collapsed tables of contents not counted; hidden banners ignored; a banner must offer accept or reject (FR-DET-02 refined). The 3 failures are script-injected banners, recorded in `corpus/README.md` and the README. _FR-COR-03, §7 criterion 1_

## Phase 8 — Verification and release

- [ ] 8.1 Typecheck, lint, test and build are green (`pnpm.cmd` on this Windows setup). _§7 criterion 5_
- [ ] 8.2 Check that the content script bundle is under 60 KB minified. _NFR-03_
- [ ] 8.3 Check that no request is made during detection, and only the clicked linked-policy request during extraction (DevTools network panel on the demo pages). _NFR-04, §7 criterion 6_
- [ ] 8.4 Update the CHANGELOG (including the Spec 2 status row), bump versions to 0.7.0, commit and push.

## Notes

- Task 3.4 comes first among the open tasks: it decides the per-site access path.
- Before the Phase 6 screens, the UI moves to the design steering file: tokens and fonts first
  (done, see `docs/ui.md`), then the component set (Chip, Toggle, Segmented, SourceQuote and the
  others in design §3), then the popup and the four-tab side panel shell.
- Privacy gates apply to every task: no page text in logs, no sensitive field reads, no storage of extracted text.

## Task Dependency Graph

Only tasks that are not fully done appear below.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.3", "2.5", "3.4", "3.8"] },
    { "id": 1, "tasks": ["3.6", "3.7", "4.8", "4.9", "5.1", "5.2"] },
    { "id": 2, "tasks": ["5.3", "5.4", "5.5", "5.6", "7.1"] },
    { "id": 3, "tasks": ["5.7", "6.1", "6.3", "7.2", "7.3"] },
    { "id": 4, "tasks": ["6.2", "6.5", "7.4"] },
    { "id": 5, "tasks": ["6.4", "8.1", "8.2", "8.3"] },
    { "id": 6, "tasks": ["8.4"] }
  ]
}
```
