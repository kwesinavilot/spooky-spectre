# Implementation Plan: Spec 2 — Detection and Extraction

> Ordered tasks for `requirements.md` and `design.md` in this folder. Each task names the
> requirements it satisfies. Status legend: `[x]` done · `[~]` partly done · `[ ]` not done.

> **Progress (2026-11-21):** the core library is written: schemas, detection rules, extraction,
> anchors, hashing and completeness (`packages/core/src/{detect,extract,dom}`), the nine demo pages
> under `examples/`, and test files for schemas, detection and extraction. The last recorded test run
> (`verify.log`) failed in two test files with "The URL must be of scheme file" from
> `test/helpers.ts` under happy-dom; the 22 tests that did run passed. Tests that depend on that
> helper are therefore marked `[~]` until task 3.8 gets a green run. Nothing in `apps/extension` is
> wired yet: `content.ts` only mounts the empty overlay host, `messaging.ts` has no Spec 2 messages,
> and `access.ts`, `linkedPolicy.ts`, the popup and the corpus scripts do not exist. Not started:
> Phases 5 to 8. The UI tasks (6.x) follow the design steering file: dot badge, Detected/Uncertain
> controls, Coverage labels and a toolbar popup.

## Overview

Build rule-based detection and extraction in `packages/core`, then wire it into the extension
(access modes, content script, background state, side panel, popup, Options), then measure it on a
regression corpus.

## Tasks

## Phase 1 — Schemas and test setup

- [x] 1.1 Add `AgreementKind`, `ElementAnchor`, `CookieControl`, `PolicyLink`, `Unreadable`, `DetectionResult`, `CompletenessReason`, `Section` and `ExtractedDocument` to `packages/core/src/schema.ts` (design §2). _NFR-02_
- [x] 1.2 Add schema fixture tests: valid objects parse; labels over 80 characters, offsets out of order and completeness above 1 are rejected (`test/schema-spec2.test.ts`). _NFR-02_
- [~] 1.3 `happy-dom` and `fast-check` are in `packages/core` dev dependencies and the detect and extract tests opt in with a `// @vitest-environment happy-dom` pragma. Still to do: add a `vitest.config.ts` that sets the environment for `test/detect/**` and `test/extract/**` so new test files need no pragma (design §11). _NFR-01_

## Phase 2 — Demo fixtures

- [x] 2.1 Write `examples/streamly/signup.html` and `terms-v1.html` with numbered sections 1 to 8 (design §9). _FR-FIX-01_
- [x] 2.2 Write `terms-v2.html` from v1 with only the two FR-FIX-02 edits; test that diffs the two texts (in `test/extract/extract.test.ts`). _FR-FIX-02_
- [x] 2.3 Write `examples/cookies/` pages: `index.html`, `no-reject.html`, `shadow.html`, `closed-shadow.html`, `late.html`. _FR-FIX-01_
- [x] 2.4 Write `examples/benign/terms.html`. _FR-FIX-01_
- [ ] 2.5 Add a root `pnpm examples` script (static server on localhost serving `examples/`, no new runtime dependency in the extension). _FR-FIX-01_

## Phase 3 — Detection rules (packages/core)

- [x] 3.1 Shared walker in `src/dom/walk.ts`: open shadow roots, same-origin iframes, sensitive and form-control skipping, closed-shadow and cross-origin-frame recording. _FR-DET-09, FR-PRV-02_
- [x] 3.2 `detect/controls.ts` (label regex tables, `Detected`/`Uncertain` certainty) and `detect/banner.ts` (two-signal rule, control roles, `noRejectControlFound`). _FR-DET-02, 03, 04_
- [x] 3.3 `detect/pageKind.ts`, `detect/forms.ts` (consent checkbox and subscription terms) and `detect/links.ts`. _FR-DET-05, 06, 07, 08_
- [ ] 3.4 **Spike, do first in the extension:** check whether opening the side panel from the toolbar icon grants `activeTab`, and record the result in a note at the end of this file (design.md is not edited here). _FR-ACC-08_
- [x] 3.5 `detectPage(doc, url, opts)` in `detect/index.ts` combining the rules, stripping query and hash, honoring `shouldAnalyze`, and validating with `DetectionResult`. _FR-DET-01, FR-PRV-05_
- [~] 3.6 Tests TEST-DET-01, TEST-DET-02, TEST-DET-03, TEST-PRV-01, TEST-PRV-02 are written in `test/detect/detect.test.ts`; not yet green (see 3.8). Also add a test that `cookies/late.html` is not detected at parse time, so the late-banner observer in 5.3 has a reason to exist. _§6_
- [~] 3.7 TEST-NOINT-01 for detection on every demo page is written; not yet green (see 3.8). _FR-DET-12_
- [ ] 3.8 Fix `test/helpers.ts` so `examplesDir` resolves under happy-dom (build it from `process.cwd()` or `path.resolve` instead of `new URL(..., import.meta.url)`), then run `pnpm.cmd --filter @specter/core test` and fix any failures it exposes. _§6, §7 criterion 5_

## Phase 4 — Extraction (packages/core)

- [x] 4.1 `normalizeInline()` in `src/dom/text.ts`, exported from the package for reuse by Spec 5. _FR-EXT-03_
- [x] 4.2 Root selection (`chooseRoot`) and block walking (`extract/blocks.ts`). _FR-EXT-01, 02_
- [x] 4.3 `extract/sections.ts`: splitting, numbered and slug ids, duplicate suffixes, offsets. _FR-EXT-04, 05_
- [x] 4.4 `dom/anchors.ts`: CSS path with shadow boundaries and text-quote selector. _FR-EXT-06_
- [x] 4.5 `extract/hash.ts` (SHA-256 hex). _FR-EXT-07_
- [x] 4.6 Completeness counting, plain-word reasons and the 0.9 cap (`scoreCompleteness`, `REASON_MESSAGES`). _FR-EXT-09, FR-CMP-01 to 03_
- [x] 4.7 `extractDocument(doc, opts)` returning a validated `ExtractedDocument`. _FR-EXT-01_
- [~] 4.8 TEST-EXT-01 and TEST-EXT-02 (property), TEST-EXT-03, TEST-EXT-04 and TEST-CMP-01 are written; not yet green (see 3.8). Still missing: TEST-NOINT-01 for extraction (serialize each demo page before and after `extractDocument` and compare), and a test that sensitive field values never reach extracted text. _§6, FR-PRV-02_
- [~] 4.9 Budget tests exist for extraction (20,000 words) and detection (demo pages) with loose ceilings; confirm they pass in 3.8. _FR-EXT-12, FR-DET-13_

## Phase 5 — Extension wiring

- [ ] 5.1 Extend `SpecterMessage` in `apps/extension/src/messaging.ts` with the design §6 messages (`detected`, `get-tab-state`, `tab-state`, `extract`, `extracted`, `extract-failed`) and add `TabState`. Include `tabId` and `requestId` on extract messages so stale responses are ignored. _FR-UI-*_
- [ ] 5.2 Write `apps/extension/src/access.ts`: `enableBackground`, `disableBackground`, `enableSite`, `disableSite`, `syncRegistrations`, using `chrome.scripting.registerContentScripts` and `excludeMatches` from the excluded-domains list. `enableBackground` must be called from a user gesture. _FR-ACC-02, 04, 05, 07_
- [ ] 5.3 Update `content.ts`: `shouldAnalyze` gate before any DOM read, `requestIdleCallback` detection via `detectPage`, late-banner `MutationObserver` (debounced 500 ms, stops after 15 s, background mode only), and `extract` handling with the fingerprint retry and `page_changed` reason. Keep the existing empty Shadow DOM host; add nothing else to the page. _FR-PRV-01, FR-DET-10, FR-DET-12, FR-EXT-11_
- [ ] 5.4 Update `background.ts`: tab state in `chrome.storage.session`, cleanup on `tabs.onUpdated` (new URL) and `tabs.onRemoved`, the dot badge in the medium color (never a number), and `syncRegistrations` on start and on `permissions.onAdded` and `onRemoved`. _FR-DET-11, FR-PRV-03, FR-ACC-05_
- [ ] 5.5 Write `apps/extension/src/linkedPolicy.ts`: click-only fetch with `credentials: 'omit'`, HTML content-type check, PDF state, `DOMParser` with a `<base href>`, then `extractDocument`. The response is never stored and nothing is logged. _FR-EXT-08, FR-EXT-10, FR-PRV-04, FR-PRV-05_
- [ ] 5.6 Per-site Analyze path: `chrome.scripting.executeScript` on the active tab, falling back to a per-origin permission request from the button click as decided in 3.4. _FR-ACC-08_
- [ ] 5.7 Add extension unit tests (Vitest, mocked `chrome.*`) for `syncRegistrations` (granted, revoked, per-site), tab-state cleanup on navigation, and the manifest check that `host_permissions` is absent and `http://*/*`, `https://*/*` appear only under `optional_host_permissions`. _FR-ACC-01, 04, 05, FR-PRV-03_

## Phase 6 — Side panel, popup and Options

- [ ] 6.1 Extend `useSidePanel` with the design §7 states and add an in-memory Zustand store for the extracted document (no persistence). Add a state-machine unit test for the transitions and for invalidating work on navigation. _FR-PRV-04_
- [ ] 6.2 Build the side panel states: excluded, no access, idle, detected (cookie controls as `Detected`/`Uncertain`, "Specter never clicks them", linked-policy buttons), PDF, reading with Cancel, extracted ("Coverage: complete" or "Partial coverage" with percent, reasons, section headings, Try again below 80%). Use design-system tokens and components, 44 px targets, `aria-live="polite"` for progress and `role="alert"` for errors. _FR-UI-01 to 05, FR-CMP-04, FR-DET-03, 04_
- [ ] 6.3 Build the Options "Site access" section: background detection switch with the Chrome warning explainer shown before the prompt (declining as easy as accepting), the per-site list with Remove, and the current state read from `chrome.permissions.contains`. _FR-ACC-03, 06, 09_
- [ ] 6.4 Manual check in Chrome on the demo pages (served by `pnpm examples`): badge on, badge off on the benign page, all side panel states reachable, revoking access in Chrome turns background detection off. _§7 criteria 2 to 4_
- [ ] 6.5 Add the toolbar popup (design steering §6B): host and status chip for Agreement detected, Nothing found, Paused, Excluded and Unsupported page, "Open Specter" opening the side panel, and the "Specter on this site" toggle. It reads the same tab state as the side panel. _FR-DET-11, FR-PRV-01, FR-UI-05_

## Phase 7 — Corpus

- [ ] 7.1 Write `scripts/corpus.ts` and the root `corpus:add` and `corpus:report` scripts (design §10): load each saved page in happy-dom, run `detectPage` and `extractDocument`, print a table and totals, write `corpus/report.json`, exit non-zero below the target. _FR-COR-02_
- [ ] 7.2 Update the `extraction-on-corpus-add` hook to run `pnpm corpus:report`. _FR-COR-02_
- [ ] 7.3 Capture at least 10 real pages (4 terms, 3 privacy, 3 cookie-banner) and fill in their manifest entries. Needs the user to pick or approve the sites. _FR-COR-01_
- [ ] 7.4 Run the report, fix rule gaps that are general (not page-specific hacks), and record the totals in the README, failures included. _FR-COR-03, §7 criterion 1_

## Phase 8 — Verification and release

- [ ] 8.1 Typecheck, lint, test and build are green (`pnpm.cmd` on this Windows setup). _§7 criterion 5_
- [ ] 8.2 Check that the content script bundle is under 60 KB minified. _NFR-03_
- [ ] 8.3 Check that no request is made during detection, and only the clicked linked-policy request during extraction (DevTools network panel on the demo pages). _NFR-04, §7 criterion 6_
- [ ] 8.4 Update the CHANGELOG (including the Spec 2 status row), bump versions to 0.7.0, commit and push.

## Notes

- Tasks 3.4 and 3.8 come first: 3.4 decides the per-site access path, 3.8 unblocks every test.
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
