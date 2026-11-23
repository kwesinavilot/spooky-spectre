# Detection and extraction

Spec 2. Core logic in `packages/core/src/{detect,extract,dom}`, extension wiring in
`apps/extension`. **Status:** built and tested by automated tests (77 core tests, 28 extension
tests, the 7-of-10 corpus target). Not yet checked by hand in Chrome (Spec 2 task 6.4).

## How it runs in the extension

```
toolbar icon -> popup (grants activeTab for this tab)
   Open Specter -> side panel, Page tab
      background result for this tab?  yes -> show it
                                       no  -> inject content script (activeTab) and detect now
      Analyze agreement -> content script extracts the chosen document, or the side panel
                           reads a linked policy -> sections and coverage shown in memory

background detection on (opt-in): registered content script runs at document_idle on every
http/https page except excluded and paused sites -> result to the background worker -> dot badge
```

- **Access** (`src/access.ts`): no host access at install. Background detection asks for all
  http/https sites, after the Options explainer. Otherwise sites can be turned on one by one from
  the popup's "Specter on this site" switch, and any page can be checked through the popup's
  `activeTab` grant. The registered script follows the granted permissions, including access
  removed in Chrome's own settings.
- **Content script** (`entrypoints/content.ts`): checks excluded and paused sites before reading
  anything, detects when the browser is idle, watches for late cookie banners for 15 seconds in
  background mode, and answers `get-detection` and `extract`. It imports core through subpaths
  (`@specter/core/detect`, `/extract`, `/privacy`) so the Zod schemas stay out of the page.
- **Validation on receipt:** the background worker and the side panel validate everything the
  content script sends with the Zod schemas (`DetectionResult`, `ExtractedDocument`). The content
  script runs inside the web page, so this is the trust boundary.
- **Tab state** (`src/tabState.ts`): the result per tab in `chrome.storage.session`, cleared on
  navigation and close; a small dot badge in the medium color when an agreement is found.
- **Linked policies** (`src/linkedPolicy.ts`): read during an analysis, automatically when the
  user has turned on "Read linked policies automatically" (Settings or Options), otherwise from the
  "Read the linked policy" button. No cookies are sent; nothing is stored.

## Detection: `detectPage(doc, url, opts?)`

Rules only, no AI, no network. Returns `{ excluded: true }` for an excluded domain without reading
the document. Otherwise a `DetectionResult` plus the live banner element.

| Kind | How it is recognized |
| --- | --- |
| `cookie_banner` | Starts from visible buttons labeled like accept, reject or manage, walks up to a container with cookie or consent wording that is fixed or sticky, a dialog, or short. It must offer accept or reject; outside a fixed container or dialog it needs two kinds of control. Hidden banners (already dismissed) do not count |
| `terms_of_service`, `privacy_policy`, `cookie_policy`, `eula` | Title, main heading, URL path and the share of numbered headings, against a 0.5 threshold. A page can be more than one (for example "Terms & Privacy Policy"). `cookie_policy` matches "Cookie Policy", "Cookies Policy", "Cookie Notice" and similar in the title or heading. A `/cookies` path alone is not enough, because many sites have a cookie settings page there |
| `consent_checkbox` | A checkbox whose label links to terms or privacy |
| `subscription_terms` | A sign-up or payment form with at least two kinds of billing wording near the submit button |

Also recorded: cookie controls with role and certainty (`detected` or `uncertain`), "no reject
control found", the form's submit button (for the moment-of-agreement trigger in Spec 6), policy
links, and consent containers Specter cannot read. The URL is origin and path only.

**Which links count as documents** (`src/detect/links.ts`). A link is offered as a document only when its
own text names one: short (up to six words), not a sentence, not navigation ("Privacy Center home",
"Common privacy settings", "View printable version", "See previous versions"), not a footnote marker such
as `partners[2]`, and not a bare address. The URL path is a fallback only for generic text such as
"Learn more" or "here", and only its last segment counts, so a link under `/privacy/` is not a privacy
policy because of the folder. The same address, or the same kind with the same text, is listed once. Each
kind keeps its first two links and a page keeps at most eight. In the side panel, links back to the
current page (ignoring the query string) are left out.

## Extraction: `extractDocument(doc, opts)`

1. **Root:** `<main>` (widened to include the page's `<h1>` when the title sits outside it), a
   single `<article>`, or the smallest element holding 80% of the paragraph text. When widened or
   guessed, navigation, headers, footers and asides are dropped.
2. **Blocks:** headings, paragraphs, list items and table cells in reading order. Folded sections
   (closed `<details>`, regions behind `aria-expanded="false"`) are read, because they are part of
   the agreement and already in the page. Buttons, labels, form controls, scripts, decorative
   hidden elements and collapsed tables of contents are skipped.
3. **Normalization:** NFC, whitespace collapsed, one newline between blocks.
4. **Sections:** flat; every heading starts one. Numbered headings give ids like `s-4-2`.
5. **Anchors:** CSS path (shadow boundaries as ` >>> `) and a text quote with prefix and suffix.
6. **Hash:** SHA-256 of the normalized text.
7. **Completeness:** "Read more" controls, pagination, closed components and frames from other
   sites may hide text that is not in the page, so they cap the score at 0.9 with a plain reason.

## Side panel and popup

- **Popup:** host, status (Review available, Quiet, Not checked, Paused, Excluded, Unsupported page),
  Open Specter, and the "Specter on this site" switch (pauses the site when background detection is
  on, otherwise turns the site on or off).
- **Page tab:** checking, excluded or unsupported, "needs your OK" with Allow on this site, detected
  (kinds in plain words, one document to choose when there are several, cookie controls with
  Detected or Uncertain and "Specter never clicks them", partial coverage notes), reading with Cancel,
  extracted ("Coverage: complete" or "Partial coverage: N% read", reasons, sections, Try again below
  80%, "Limited · on-device only"), and failure messages. Navigation resets it with "The page
  changed. Run analysis again."
- **Options, Site access:** background detection switch with the plain explainer before Chrome's
  prompt and a "Not now" as easy as "Continue", the linked-policy switch, sites turned on one by
  one with Remove, and paused sites with Resume.

## Demo pages and corpus

`examples/` holds the fictional demo pages (`pnpm examples` serves them on port 5178). `corpus/`
holds 10 saved real pages and their results; see [corpus/README.md](../corpus/README.md). Latest:
7 of 10 pass; the 3 failures are cookie banners that only exist once the site's scripts run.

## Known limits

- English label and keyword patterns only.
- Cookie banners injected by scripts cannot be tested from saved pages; in Chrome they rely on the
  15-second late-banner watch, which still needs a manual check.
- A banner in a closed component or another site's frame is reported as unreadable, not guessed.
- PDFs are detected and reported as not supported; they are never read.
