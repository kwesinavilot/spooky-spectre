# Detection and extraction

Spec 2. Code in `packages/core/src/detect/`, `packages/core/src/extract/` and
`packages/core/src/dom/`. **Status: core library built and tested** (54 core tests and the core
typecheck pass). The extension wiring and side panel screens (Phases 5 and 6) are not built yet,
so none of this runs in Chrome yet.

## Detection: `detectPage(doc, url, opts?)`

Rules only, no AI, no network. Returns `{ excluded: true }` for an excluded domain without reading
the document. Otherwise returns a validated `DetectionResult` plus the live banner element.

| Kind | How it is recognized |
| --- | --- |
| `cookie_banner` | Starts from buttons whose labels look like accept, reject or manage, walks up to a container with cookie or consent wording that is fixed or sticky, a dialog, or short |
| `terms_of_service`, `privacy_policy`, `eula` | Title, main heading, URL path and the share of numbered headings, scored against a 0.5 threshold |
| `consent_checkbox` | A checkbox whose label links to terms or privacy |
| `subscription_terms` | A sign-up or payment form with at least two kinds of billing wording (trial, renewal, per month, subscription, cancel) near the submit button |

Also recorded:

- **Cookie controls** with a role (`accept_all`, `reject_optional`, `manage`, `other`) and a
  certainty: `detected` for a real button with a recognized label, `uncertain` otherwise. Label
  patterns are one table in `controls.ts`; "Accept necessary only" counts as reject.
- **No reject control found** when a banner has none. Specter does not claim the site offers no
  way to reject.
- **Action controls:** the submit button of sign-up and payment forms, for the moment-of-agreement
  trigger in Spec 6.
- **Policy links** with kind, text, absolute URL and whether they point to a PDF.
- **Unreadable containers:** consent components in closed shadow roots or frames from another site.
- The URL is stored as origin and path only.

Detection walks open shadow roots and same-origin frames, never reads form field values, labels or
sensitive fields, and never changes the page.

## Extraction: `extractDocument(doc, opts)`

1. **Root:** `<main>`, a single `<article>`, or the smallest element holding 80% of the paragraph
   text. When the root is guessed, navigation, headers, footers and asides are dropped.
2. **Blocks:** headings, paragraphs, list items and table cells in reading order. Buttons, labels,
   form controls, scripts and hidden elements are skipped.
3. **Normalization:** NFC, whitespace collapsed, one newline between blocks (`normalizeInline`).
4. **Sections:** flat; every heading starts one. Numbered headings give ids like `s-4-2`; others get
   a slug and occurrence number. Text before the first heading is `s-intro`.
5. **Anchors:** a CSS path (shadow boundaries written as ` >>> `) and a text quote with prefix and
   suffix, so later specs can find the clause on the live page.
6. **Hash:** SHA-256 of the normalized text. Layout and whitespace changes keep the hash; any word
   change alters it.
7. **Completeness:** characters read divided by read plus known skipped characters. Collapsed
   `<details>` and collapsed `aria-expanded` regions are measured. "Read more" controls, pagination,
   closed components and foreign frames cannot be measured, so they cap the score at 0.9. Every
   reason has a plain-language message.

## Demo pages (`examples/`)

| Page | Purpose |
| --- | --- |
| `streamly/signup.html` | Sign-up with trial and renewal wording, a terms checkbox and a "Start free trial" button |
| `streamly/terms-v1.html`, `terms-v2.html` | Numbered terms (renewal at §4.2). v2 differs only by removing "aggregated" and adding "and affiliated companies" in §5 |
| `cookies/index.html` | Fixed banner with Accept all, Reject all, Manage preferences |
| `cookies/no-reject.html` | Banner without a reject button |
| `cookies/shadow.html`, `closed-shadow.html` | Banner in an open and a closed shadow root |
| `cookies/late.html` | Banner added two seconds after load |
| `benign/terms.html` | Short terms with nothing to flag |

All companies and people are fictional.

## Tests

`packages/core/test/detect/`, `test/extract/` and `test/schema-spec2.test.ts`: fixture tests on every
demo page, privacy tests (sensitive values and labels never appear, excluded domains are not read),
a no-interference test (the page HTML is identical after detection and extraction), and property
tests with fast-check for section offsets and hash stability.

## Known limits

- English label and keyword patterns only.
- Without a live window (parsed documents and tests), position is read from inline styles only.
- Banners rendered by third-party scripts may be missing from saved copies of pages.
- PDFs are detected and reported as not supported; they are never read.
