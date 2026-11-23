# Spec 2 — Detection and Extraction (Design)

> Companion to `requirements.md` and `tasks.md`. Builds on the Spec 1 foundation: the runtime
> registered content script with its empty Shadow DOM host, the typed message bus, the settings
> store and the `shouldAnalyze` gate.

## 1. Where the code lives

| Piece | Location | Runs in |
| --- | --- | --- |
| Schemas: `AgreementKind`, `DetectionResult`, `CookieControl`, `PolicyLink`, `Section`, `SectionAnchor`, `ExtractedDocument`, `CompletenessReason` | `packages/core/src/schema.ts` | everywhere |
| Detection rules (`detect(doc, url)`) | `packages/core/src/detect/` | content script, tests |
| Extraction (`extract(root, opts)`) | `packages/core/src/extract/` | content script, side panel, tests, corpus runner |
| Normalization, section ids, hashing | `packages/core/src/extract/normalize.ts`, `sections.ts`, `hash.ts` | everywhere |
| Content script entry | `apps/extension/entrypoints/content.ts` | page (isolated world) |
| Access modes and script registration | `apps/extension/src/access.ts` | background, Options, side panel |
| Tab state and badge | `apps/extension/entrypoints/background.ts` | service worker |
| Side panel states | `apps/extension/entrypoints/sidepanel/` | side panel |
| Linked policy fetch | `apps/extension/src/linkedPolicy.ts` | side panel |
| Demo pages | `examples/streamly/`, `examples/cookies/`, `examples/benign/` | static files |
| Corpus and runner | `corpus/`, `scripts/corpus.ts` | Node with happy-dom |

Core functions take a `Document` or `Element` and return plain objects. They never call `chrome.*`,
so the same code runs in the page, in the side panel on a `DOMParser` document, and in Vitest with
happy-dom (NFR-01). The service worker never parses HTML; it has no DOM.

## 2. Data models (added to `packages/core/src/schema.ts`)

```ts
export const AgreementKind = z.enum([
  'cookie_banner', 'terms_of_service', 'privacy_policy', 'cookie_policy',
  'subscription_terms', 'eula', 'consent_checkbox',
])

export const ElementAnchor = z.object({
  cssPath: z.string(),                 // from the document root, shadow hosts joined with ' >>> '
  quote: z.object({ exact: z.string(), prefix: z.string(), suffix: z.string() }),
})

export const CookieControl = z.object({
  role: z.enum(['accept_all', 'reject_optional', 'manage', 'other']),
  label: z.string().max(80),
  anchor: ElementAnchor,
})

export const PolicyLink = z.object({
  kind: z.enum(['terms', 'privacy', 'cookies', 'subscription', 'other']),
  text: z.string().max(120),
  url: z.string().url(),
  isPdf: z.boolean(),
})

export const Unreadable = z.object({
  where: z.enum(['closed_shadow_root', 'cross_origin_frame']),
  note: z.string(),
})

export const DetectionResult = z.object({
  url: z.string(),                     // origin + path only, no query or hash
  kinds: z.array(AgreementKind),
  signals: z.array(z.string()),        // rule ids that fired, e.g. 'banner.fixed+keyword'
  cookieControls: z.array(CookieControl),
  noRejectControlFound: z.boolean(),
  links: z.array(PolicyLink),
  unreadable: z.array(Unreadable),
  isPdf: z.boolean(),
  confidence: z.number().min(0).max(1),
  detectedAt: z.string().datetime(),
})

export const CompletenessReason = z.object({
  code: z.enum([
    'collapsed_section', 'read_more', 'pagination', 'closed_shadow_root',
    'cross_origin_frame', 'may_not_have_loaded', 'page_changed',
  ]),
  message: z.string(),                 // plain words shown to the user
  estimatedChars: z.number().int().nonnegative().optional(),
})

export const Section = z.object({
  id: z.string(),
  heading: z.string(),
  level: z.number().int().min(1).max(6),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  anchor: ElementAnchor,
})

export const ExtractedDocument = z.object({
  url: z.string(),
  title: z.string(),
  kind: AgreementKind,
  source: z.enum(['page', 'modal', 'linked']),
  text: z.string(),
  sections: z.array(Section),
  documentHash: z.string(),
  completeness: z.number().min(0).max(1),
  completenessReasons: z.array(CompletenessReason),
  extractedAt: z.string().datetime(),
})
```

`Evidence.sectionId` (Spec 1) refers to `Section.id`. `AgreementRecord.extractedText`,
`documentHash` and `completeness` (Spec 1) are filled from `ExtractedDocument` when the user saves in
Spec 8. Labels and link text are capped in length so a detection result can never carry a page's
body text (FR-PRV-03).

## 3. Access modes

```
               +-------------------------------+
 install ----> | per-site mode (no host perms) |
               +-------------------------------+
                 |  Options: "Turn on background detection"
                 |  -> explainer with the Chrome warning text (FR-ACC-03)
                 |  -> chrome.permissions.request({origins: http/https})
                 v
     granted --> registerContentScripts(id 'specter-detect', matches http/https,
                 runAt document_idle, allFrames true) ; settings.backgroundDetection = true
     declined -> stay in per-site mode, show "Background detection is off"
```

- `access.ts` exposes `enableBackground()`, `disableBackground()`, `enableSite(origin)`,
  `disableSite(origin)`, `syncRegistrations()`.
- `syncRegistrations()` runs on worker start and on `chrome.permissions.onRemoved` and
  `onAdded`. It reads `chrome.permissions.getAll()` and makes the registered scripts match: one
  registration for all sites if `http://*/*` and `https://*/*` are granted, otherwise one
  registration per enabled origin. This makes FR-ACC-05 hold even when the user revokes access
  in Chrome's own settings.
- Excluded domains are passed as `excludeMatches` on every registration, and the script checks
  `shouldAnalyze` again on start (FR-PRV-01). Two layers, because `excludeMatches` cannot express
  "this domain and all its subdomains" for every entry the user may add.
- The per-site "Analyze this page" path calls `chrome.scripting.executeScript` on the active tab.
  The side panel opens from the toolbar icon via `openPanelOnActionClick`. **Risk:** Chrome may not
  grant `activeTab` when the panel opens through that behavior. Task 3.4 checks this first. If it
  isn't granted, the button calls `chrome.permissions.request({origins: [origin + '/*']})` from its
  own click, which is a valid user gesture in an extension page.

## 4. Content script flow

```
start
  -> shouldAnalyze(location.hostname)? no -> send {type:'detected', excluded:true}; stop
  -> requestIdleCallback(detect)
       detect(document, location) -> DetectionResult
       send {type:'detected', result}
  -> if background mode: MutationObserver on body (childList, subtree)
       debounce 500 ms, re-run banner rules only, stop after 15 s (FR-DET-10)
  -> on message {type:'extract', target}: extract(...) -> {type:'extracted', doc}
```

Rule outline (`packages/core/src/detect/`):

- **banner.ts:** candidates are elements that are `position: fixed|sticky`, have `role="dialog"`
  or `aria-modal`, or are `<dialog>` elements, and contain cookie or consent keywords. A candidate
  needs two signals (FR-DET-02). Buttons and links inside are classified by label regexes in
  `controls.ts` (accept: "accept( all)?", "allow( all)?", "agree", "got it", "ok"; reject:
  "reject", "decline", "refuse", "necessary only", "only essential"; manage: "manage",
  "preferences", "settings", "customi[sz]e", "options"). English only for the MVP, and the regex
  table is a single exported object so other languages are a data change.
- **pageKind.ts:** scores title, `h1`, URL path (`/terms`, `/tos`, `/legal`, `/privacy`, `/eula`,
  `/cookie`) and the share of headings shaped like "1.", "4.2" or "Section 3". Threshold scores
  are constants with tests.
- **checkbox.ts:** `input[type=checkbox]` whose `label` or nearest text block contains a link
  classified as terms or privacy. Only the label's link text is read, never the input state.
- **subscription.ts:** a `form` containing a submit control, plus renewal, trial, billing or
  cancellation keywords within the form or its nearest following sibling block. Field values are
  never read.
- **links.ts:** anchors whose text or path matches policy patterns, made absolute, with
  `isPdf` from the path ending or a `type="application/pdf"` attribute.
- **walk.ts:** a single tree walker shared by all rules. It enters open shadow roots and
  same-origin iframes, skips `SENSITIVE_INPUT_SELECTORS` subtrees and all form control contents,
  and records closed shadow hosts (detected as custom elements with no `shadowRoot` but rendered
  size) and cross-origin frames as `unreadable`.

Detection never writes to the DOM. TEST-NOINT-01 serializes the page before and after and compares.

## 5. Extraction

`extract(root, { kind, source, url })`:

1. **Choose the root.** For a banner, the banner element. For a page, the `main` element, else
   `article`, else the element holding the most paragraph text after dropping `nav`, `header`,
   `footer`, `aside` and elements with `role` navigation, banner or contentinfo.
2. **Walk** with the shared walker in reading order. Keep text from headings, `p`, `li`, `td`,
   `th`, `dd`, `dt` and `blockquote`. Skip `script`, `style`, `noscript`, `template`, hidden elements
   (`hidden`, `aria-hidden="true"`, `display:none` when computed style is available) and form
   controls.
3. **Normalize** (FR-EXT-03): NFC, collapse whitespace, one `\n` between blocks, trim. A shared
   `normalize()` is also exported for later quote validation in Spec 5, so both sides use the same
   rules.
4. **Sections** (FR-EXT-04, FR-EXT-05): sections are flat. Each heading of any level starts a
   section that runs to the next heading, so sections never overlap (TEST-EXT-01). The heading
   level is kept so later specs can rebuild the outline. Text before the first heading becomes
   section `s-intro`.
   Ids: a leading number pattern `^(\d+(?:\.\d+)*)` gives `s-4-2`; otherwise
   `s-<slug>-<n>` where `n` is the position among headings with the same slug. Duplicate ids get
   `-2`, `-3` suffixes.
5. **Anchors** (FR-EXT-06): CSS path built from tag names and `:nth-of-type`, preferring an `id`
   when unique. Shadow boundaries are joined with ` >>> `. The text quote comes from the normalized
   section text.
6. **Hash** (FR-EXT-07): `crypto.subtle.digest('SHA-256', utf8(text))`, hex encoded. Available in
   pages, extension pages, workers and Node 20.
7. **Completeness** (FR-CMP-*): the walker counts characters it skipped for each reason when it can
   (closed `details` text is in the DOM, collapsed `aria-expanded` regions usually are too). For
   things it can't measure (closed shadow roots, cross-origin frames, pagination), it adds the
   reason without a count and applies the 0.9 cap. Score = read / (read + skipped), then the cap.

**Page changed while reading (FR-EXT-11):** the content script takes a cheap fingerprint (child count
and text length of the chosen root) before and after extraction. If they differ it retries once, then
returns with the `page_changed` reason.

**Linked policy (FR-EXT-08):** `linkedPolicy.ts` runs in the side panel after the user clicks. It
calls `fetch(url, { credentials: 'omit', redirect: 'follow' })`, rejects non-HTML content types (PDF
goes to the not-supported state), parses with `DOMParser`, sets a `<base href>` so relative links
resolve, and calls the same `extract`. The fetch needs host permission for that URL's origin. In
background mode it is already granted; in per-site mode the click requests it first. The response is
never stored. This is the only network request in Spec 2; see the open decision in requirements §8.

## 6. Messages and tab state

Added to `SpecterMessage` in `apps/extension/src/messaging.ts`:

```ts
| { type: 'detected'; result?: DetectionResult; excluded?: boolean }
| { type: 'get-tab-state'; tabId: number }
| { type: 'tab-state'; state: TabState }
| { type: 'extract'; target: 'page' | 'banner' }
| { type: 'extracted'; doc: ExtractedDocument }
| { type: 'extract-failed'; reason: 'excluded' | 'pdf' | 'no_access' | 'error' }
```

The background worker stores `TabState = { result?: DetectionResult; excluded: boolean }` in
`chrome.storage.session` under `tab:<id>`, because the service worker can be stopped at any time.
It removes the entry on `tabs.onRemoved` and on `tabs.onUpdated` with a new URL (FR-PRV-03), and
sets the badge with `chrome.action.setBadgeText({ tabId, text: ' ' })` and the medium token as
the background, which Chrome draws as a small dot. It never shows a number or a risk color
(design steering §6B). An empty text clears it.

The side panel asks for the active tab's state on open and on `tabs.onActivated`, and talks to the
content script with `chrome.tabs.sendMessage`. Extracted documents travel only from the content
script to the side panel and stay in a Zustand store in memory (FR-PRV-04).

## 7. Side panel states

```
excluded --> "Specter is turned off on this site" [Open Options]
no access --> "Specter needs your OK to read this page" [Analyze this page] [Enable on this site]
idle --> "No agreement detected on this page." [Analyze this page anyway]
detected --> "Agreement detected: Cookie banner" + controls list + [Analyze Agreement]
             links found -> [Read the linked policy] per link
pdf --> "PDF agreements are not supported yet."
reading --> stepper: Extracting (Finding clauses / Reading with AI / Verifying arrive later)
extracted --> title, sections count, "Text read: N%", reasons, headings list, [Try again] if < 80%
```

The existing `useSidePanel` status union grows to cover these. Cookie control lines use plain words,
for example "Reject optional: Reject all", and FR-DET-04 shows as "Specter did not find a reject
button in this banner. The site may offer one under Manage." Kind names map to plain words in one
table: "Cookie banner", "Terms of service", "Privacy policy", "Subscription terms", "Software
license", "Sign-up agreement".

## 8. Options: Site access

Replaces the placeholder section with:

- A switch "Background detection" with the explainer text from FR-ACC-03 shown before the Chrome
  prompt, and the current state read from `chrome.permissions.contains`.
- The list of sites enabled one by one, each with a Remove button.
- The excluded-domains list stays read-only here; editing it is Spec 7 and Options polish.

The onboarding screen in Spec 7 reuses the same `enableBackground()` call and explainer component.

## 9. Demo fixtures

Plain static HTML with inline CSS, no scripts except where a test needs dynamic insertion:

- `examples/streamly/signup.html`: signup form, trial and renewal wording near the submit button, a
  terms checkbox linking to `terms-v1.html`.
- `examples/streamly/terms-v1.html` and `terms-v2.html`: numbered sections (1 to 8) covering
  auto-renewal at a quoted price, cancellation deadline, refunds, advertising and data sharing,
  content rights, arbitration, account suspension and liability. v2 differs only as FR-FIX-02 says.
- `examples/cookies/index.html`: a fixed banner with Accept all, Reject all and Manage preferences;
  `no-reject.html` variant; `shadow.html` with the banner in an open shadow root and
  `closed-shadow.html` with a closed one; `late.html` inserting the banner after two seconds.
- `examples/benign/terms.html`: short plain terms with no renewal, sharing or arbitration wording.

Tests load these files into happy-dom. Manual and later Playwright checks serve them with
`pnpm examples` (a static server on localhost). Fictional names only: "Streamly", a ".example"
domain, no real people.

## 10. Corpus and runner

```
corpus/
  manifest.json      [{ file, sourceUrl, capturedAt, expectedKinds, mustContain: [..] }]
  pages/*.html       saved with scripts stripped
scripts/corpus.ts    loads each page in happy-dom, runs detect + extract, prints a table and
                     totals, writes corpus/report.json, exits non-zero below the target
```

- `pnpm corpus:add <url> <name>` fetches a public page once, strips `<script>` tags, saves it and
  appends a manifest stub for a person to fill in expected kinds and phrases.
- `pnpm corpus:report` runs the runner. The Spec 1 hook `extraction-on-corpus-add` is updated to call
  it instead of the placeholder script path.
- Pages are saved for regression testing only. The manifest records the source and capture date,
  and the README notes that the copies belong to their owners. Cookie banners that load from
  third-party scripts often won't appear in a saved copy; those entries are expected to report low
  completeness or a missing banner, and they count against the total honestly.

Target mix: 4 terms pages, 3 privacy policies, 3 cookie-banner pages, from different site builders
and consent tools.

## 11. Testing setup

- Add `happy-dom` to `packages/core` dev dependencies and set the Vitest environment to `happy-dom`
  for `test/detect/**` and `test/extract/**`.
- Property tests use `fast-check`: generate wrapper and whitespace mutations of the Streamly terms
  for TEST-EXT-02, and random heading trees for TEST-EXT-01.
- `getComputedStyle` in happy-dom handles inline styles only, so position rules also read inline
  styles and a small `isFixedLike()` helper. Real pages are covered by the corpus and by manual
  checks in Chrome.

## 12. Risks and decisions

| Risk | Decision |
| --- | --- |
| `activeTab` not granted when the panel opens from the toolbar | Verify first (task 3.4); fall back to a per-origin permission request from the button click |
| Banners rendered late or inside consent-tool iframes | 15 s observer in background mode; cross-origin frames recorded as unreadable and lower completeness |
| Saved corpus pages lose script-rendered banners | Count them honestly; report in README |
| Keyword rules are English only | Regex tables are data, so adding languages needs no code change |
| Fetching linked policies is a network request | Only on click, credentials omitted, response not stored; pending your decision (requirements §8) |
| Service worker restarts lose state | Tab state lives in `chrome.storage.session` |
