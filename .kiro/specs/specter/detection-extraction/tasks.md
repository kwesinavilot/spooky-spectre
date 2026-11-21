# Implementation Plan: Spec 2 — Detection and Extraction

> Ordered tasks for `requirements.md` and `design.md` in this folder. Each task names the
> requirements it satisfies. Status legend: `[x]` done · `[~]` partly done · `[ ]` not done.

## Phase 1 — Schemas and test setup

- [ ] 1.1 Add `AgreementKind`, `ElementAnchor`, `CookieControl`, `PolicyLink`, `Unreadable`, `DetectionResult`, `CompletenessReason`, `Section` and `ExtractedDocument` to `packages/core/src/schema.ts` (design §2). _NFR-02_
- [ ] 1.2 Add schema fixture tests: valid objects parse; labels over 80 characters, offsets out of order and completeness above 1 are rejected. _NFR-02_
- [ ] 1.3 Add `happy-dom` and `fast-check` to `packages/core`; configure Vitest to use `happy-dom` for `test/detect/**` and `test/extract/**`. _NFR-01_

## Phase 2 — Demo fixtures

- [ ] 2.1 Write `examples/streamly/signup.html` and `terms-v1.html` with numbered sections 1 to 8 (design §9). _FR-FIX-01_
- [ ] 2.2 Write `terms-v2.html` from v1 with only the two FR-FIX-02 edits; add a test that diffs the two texts and finds exactly those edits. _FR-FIX-02_
- [ ] 2.3 Write `examples/cookies/` pages: `index.html`, `no-reject.html`, `shadow.html`, `closed-shadow.html`, `late.html`. _FR-FIX-01_
- [ ] 2.4 Write `examples/benign/terms.html`. _FR-FIX-01_
- [ ] 2.5 Add `pnpm examples` serving `examples/` on localhost. _FR-FIX-01_

## Phase 3 — Detection rules (packages/core)

- [ ] 3.1 Write the shared walker `walk.ts`: open shadow roots, same-origin iframes, sensitive and form-control skipping, unreadable recording. _FR-DET-09, FR-PRV-02_
- [ ] 3.2 Write `controls.ts` (label regex tables) and `banner.ts` (two-signal rule, control roles, `noRejectControlFound`). _FR-DET-02, 03, 04_
- [ ] 3.3 Write `pageKind.ts`, `checkbox.ts`, `subscription.ts`, `links.ts`. _FR-DET-05, 06, 07, 08_
- [ ] 3.4 **Spike, do first in the extension:** check whether opening the side panel from the toolbar icon grants `activeTab`, and record the result in design §3. _FR-ACC-08_
- [ ] 3.5 Write `detect(doc, url)` combining the rules, stripping query and hash from the URL, and validating with `DetectionResult`. _FR-DET-01_
- [ ] 3.6 Tests TEST-DET-01, TEST-DET-02, TEST-DET-03, TEST-PRV-01, TEST-PRV-02. _§6_
- [ ] 3.7 Test TEST-NOINT-01 for detection on every demo page. _FR-DET-12_

## Phase 4 — Extraction (packages/core)

- [ ] 4.1 Write `normalize.ts` and export `normalize()` for reuse by Spec 5. _FR-EXT-03_
- [ ] 4.2 Write root selection and block walking. _FR-EXT-01, 02_
- [ ] 4.3 Write `sections.ts`: splitting, numbered and slug ids, duplicate suffixes, offsets. _FR-EXT-04, 05_
- [ ] 4.4 Write anchors: CSS path with shadow boundaries and text-quote selector. _FR-EXT-06_
- [ ] 4.5 Write `hash.ts` (SHA-256 hex). _FR-EXT-07_
- [ ] 4.6 Write completeness counting, reasons in plain words, and the 0.9 cap. _FR-EXT-09, FR-CMP-01 to 03_
- [ ] 4.7 Write `extract(root, opts)` returning a validated `ExtractedDocument`. _FR-EXT-01_
- [ ] 4.8 Tests TEST-EXT-01 and TEST-EXT-02 (property), TEST-EXT-03, TEST-EXT-04, TEST-CMP-01, and TEST-NOINT-01 for extraction. _§6_
- [ ] 4.9 Benchmark test: a generated 20,000-word document extracts within the FR-EXT-12 budget, and detection on demo pages within FR-DET-13. _FR-EXT-12, FR-DET-13_

## Phase 5 — Extension wiring

- [ ] 5.1 Extend `SpecterMessage` with the design §6 messages. _FR-UI-*_
- [ ] 5.2 Write `access.ts`: `enableBackground`, `disableBackground`, `enableSite`, `disableSite`, `syncRegistrations`, with `excludeMatches` from the excluded-domains list. _FR-ACC-02, 04, 05, 07_
- [ ] 5.3 Update `content.ts`: `shouldAnalyze` gate, idle detection, late-banner observer in background mode, and `extract` handling with the page-changed retry. _FR-PRV-01, FR-DET-10, FR-EXT-11_
- [ ] 5.4 Update `background.ts`: tab state in `chrome.storage.session`, cleanup on navigation and close, badge, and `syncRegistrations` on start and on permission changes. _FR-DET-11, FR-PRV-03, FR-ACC-05_
- [ ] 5.5 Write `linkedPolicy.ts`: click-only fetch with credentials omitted, HTML check, PDF state, `DOMParser` and `extract`. _FR-EXT-08, FR-EXT-10_
- [ ] 5.6 Per-site Analyze path: `executeScript` on the active tab, falling back as task 3.4 decides. _FR-ACC-08_

## Phase 6 — Side panel and Options

- [ ] 6.1 Extend `useSidePanel` with the design §7 states, and add a store for the in-memory extracted document. _FR-PRV-04_
- [ ] 6.2 Build the side panel states: excluded, no access, idle, detected (with cookie controls and linked-policy buttons), PDF, reading, extracted (with "Text read: N%", reasons and Try again). _FR-UI-01 to 05, FR-CMP-04, FR-DET-03, 04_
- [ ] 6.3 Build the Options "Site access" section: background detection switch with the explainer before the Chrome prompt, and the per-site list with Remove. _FR-ACC-03, 06, 09_
- [ ] 6.4 Manual check in Chrome on the demo pages (served by `pnpm examples`): badge on, badge off on the benign page, all side panel states reachable, revoking access in Chrome turns background detection off. _§7 criteria 2 to 4_

## Phase 7 — Corpus

- [ ] 7.1 Write `scripts/corpus.ts` and the `corpus:add` and `corpus:report` scripts. _FR-COR-02_
- [ ] 7.2 Update the `extraction-on-corpus-add` hook to run `pnpm corpus:report`. _FR-COR-02_
- [ ] 7.3 Capture at least 10 real pages (4 terms, 3 privacy, 3 cookie-banner) and fill in their manifest entries. Needs the user to pick or approve the sites. _FR-COR-01_
- [ ] 7.4 Run the report, fix rule gaps that are general (not page-specific hacks), and record the totals in the README, failures included. _FR-COR-03, §7 criterion 1_

## Phase 8 — Verification and release

- [ ] 8.1 Typecheck, lint, test and build are green. _§7 criterion 5_
- [ ] 8.2 Check that the content script bundle is under 60 KB minified. _NFR-03_
- [ ] 8.3 Check that no request is made during detection, and only the clicked linked-policy request during extraction (DevTools network panel on the demo pages). _NFR-04, §7 criterion 6_
- [ ] 8.4 Update the CHANGELOG, bump versions to 0.7.0, commit and push.

## Dependency order

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "2.1", "2.3", "2.4", "3.4"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.5", "3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.2", "4.5"] },
    { "id": 3, "tasks": ["3.5", "4.3", "4.4", "4.6"] },
    { "id": 4, "tasks": ["3.6", "3.7", "4.7", "5.1", "5.2"] },
    { "id": 5, "tasks": ["4.8", "4.9", "5.3", "5.4", "5.5", "5.6", "7.1"] },
    { "id": 6, "tasks": ["6.1", "6.3", "7.2", "7.3"] },
    { "id": 7, "tasks": ["6.2", "7.4"] },
    { "id": 8, "tasks": ["6.4", "8.1", "8.2", "8.3"] },
    { "id": 9, "tasks": ["8.4"] }
  ]
}
```
