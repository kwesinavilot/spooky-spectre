# Spec 2 — Detection and Extraction (Requirements)

> Scope: rule-based agreement detection (including cookie banners), the opt-in background
> detection flow, per-site access, text extraction with section ids, offsets, DOM anchors, a
> content hash and an honest completeness score, the PDF "not supported yet" state, demo
> fixtures, and the regression corpus. No AI, no clause categories, no on-page highlights.

## 1. Overview

Spec 2 answers two questions for the page in front of the user, using only local rules:

1. **Is there an agreement here, and what kind?** (cookie banner, terms of service, privacy
   policy, subscription or checkout conditions, EULA, signup checkbox next to a terms link)
2. **What exactly does it say?** (clean text split into sections, with offsets that later specs
   use to verify quotes and draw highlights, plus how much of the text Specter could read)

Detection can run in two modes, chosen by the user:

- **Background detection (opt-in):** after the user grants access to all http/https sites,
  Specter checks pages as they load and shows a small indicator on the toolbar icon.
- **Per-site access (default if the user declines):** Specter runs only when the user opens the
  side panel and asks, or on sites the user has enabled one by one.

Extraction always needs an explicit user action. Nothing in this spec sends anything off the
device except an optional, user-triggered fetch of a policy page linked from the current page
(see FR-EXT-08 and the open decision in §8).

## 2. Out of scope

- Splitting sections into clauses and nominating risky clauses by category (Spec 3).
- Any AI call, cost estimate or provider setup (Spec 4, Spec 5).
- Explaining cookie choices in plain language beyond the deterministic control inventory, on-page
  highlights, badges, the floating launcher and visual effects (Spec 6).
- The onboarding screen that asks for background detection (Spec 7). This spec builds the
  permission flow and the Options toggle the onboarding screen will reuse.
- Saving extracted documents (Spec 8) and comparing versions (Spec 9).
- PDF extraction (post-MVP). This spec only shows the "not supported yet" state.

## 3. Glossary

- **Agreement kind:** one of `cookie_banner`, `terms_of_service`, `privacy_policy`,
  `subscription_terms`, `eula`, `consent_checkbox`.
- **Detection result:** the kinds found on a page, the signals that matched, policy links found,
  cookie controls found, and a detection confidence. Contains no page text beyond short labels.
- **Extracted document:** normalized text of one agreement, its sections, offsets, anchors,
  content hash, completeness score and completeness reasons.
- **Completeness:** the share of the agreement's text Specter could read, from 0 to 1, with the
  reasons for anything it could not read.
- **Registrable domain:** the domain a user would recognize as the site (for example
  `streamly.example` for `help.streamly.example`).

## 4. Functional requirements

### 4.1 Access modes and permissions

- **FR-ACC-01** The extension shall not hold any host permission at install.
- **FR-ACC-02** When the user turns on background detection in Options, the extension shall
  request the optional host permissions `http://*/*` and `https://*/*` through
  `chrome.permissions.request` from that user gesture.
- **FR-ACC-03** Before requesting background detection, the extension shall show text stating
  that Chrome will warn Specter can "read and change data on all websites", that detection runs
  on this device using rules only, and that nothing is sent anywhere until the user clicks
  Analyze.
- **FR-ACC-04** When the background detection permission is granted, the extension shall register
  the detection content script for `http://*/*` and `https://*/*` with
  `chrome.scripting.registerContentScripts`.
- **FR-ACC-05** When the background detection permission is removed, by the user in Options or
  in Chrome's settings, the extension shall unregister the detection content script and turn the
  setting off.
- **FR-ACC-06** If the user declines the permission prompt, then the extension shall keep
  per-site mode and shall show that background detection is off.
- **FR-ACC-07** When the user clicks "Enable on this site" in the side panel, the extension shall
  request host permission for that origin only and register the detection content script for it.
- **FR-ACC-08** When the user clicks "Analyze this page" in per-site mode on a site without host
  permission, the extension shall inject the detection and extraction script into the active tab
  using the access Chrome grants for that click (`activeTab`), and shall fall back to requesting
  that origin's permission if no access is available.
- **FR-ACC-09** The Options "Site access" section shall show the current mode, the list of sites
  enabled one by one, and a way to remove each.

### 4.2 Privacy gates

- **FR-PRV-01** Where a page's host matches the excluded-domains list, the detection script shall
  exit without reading the page, and the side panel shall say "Specter is turned off on this
  site" with a link to Options.
- **FR-PRV-02** The detection and extraction code shall never read the value, placeholder or
  label text of `input`, `textarea` or `select` elements, and shall skip any element matching
  `SENSITIVE_INPUT_SELECTORS` together with its descendants.
- **FR-PRV-03** Background detection shall keep only the detection result for each tab, in
  `chrome.storage.session`, and shall clear it when the tab navigates or closes.
- **FR-PRV-04** Extracted text shall stay in memory in the side panel and shall not be written to
  any storage in this spec.
- **FR-PRV-05** No code in this spec shall log page text, extracted text, or URLs with query
  strings.

### 4.3 Detection (rules only)

- **FR-DET-01** The detection script shall classify the page into zero or more agreement kinds
  using only DOM structure, attributes, visible labels and keyword rules.
- **FR-DET-02** The detection script shall detect cookie banners by combining at least two
  signals among: a fixed or sticky positioned container, a `dialog` role or element, keywords
  such as "cookie", "consent" or "tracking", and buttons whose labels match accept, reject or
  manage patterns.
- **FR-DET-03** When a cookie banner is detected, the detection result shall list each control
  found with its role (`accept_all`, `reject_optional`, `manage`, `other`), its visible label,
  a certainty (`detected` for a real button with a recognized label, otherwise `uncertain`), and
  an anchor to the element.
- **FR-DET-04** When a cookie banner is detected without a reject control, the detection result
  shall record that no reject control was found in the banner, without claiming the site offers
  no way to reject.
- **FR-DET-05** The detection script shall detect `consent_checkbox` when a checkbox's label or
  nearby text links to a terms or privacy page.
- **FR-DET-06** The detection script shall detect `subscription_terms` on pages showing a payment
  or signup form together with renewal, trial, billing or cancellation wording near the submit
  control, without reading any form field values.
- **FR-DET-07** The detection script shall detect `terms_of_service`, `privacy_policy` and `eula`
  pages from the title, main heading, URL path and the share of numbered legal headings.
- **FR-DET-08** The detection script shall collect links to terms, privacy, cookie and
  subscription policy pages, with the link text and absolute URL.
- **FR-DET-09** The detection script shall traverse open shadow roots and same-origin iframes,
  and shall record when a candidate container is in a closed shadow root or a cross-origin frame
  it cannot read.
- **FR-DET-10** While background detection is on, the detection script shall watch for cookie
  banners added after load for up to 15 seconds, debounced, and then stop observing.
- **FR-DET-11** When detection finds at least one agreement kind, the background worker shall show
  a small dot badge in the medium color on the toolbar icon for that tab, and shall clear it when
  nothing is found. The badge shall never show a number or a risk color (design steering §6B).
- **FR-DET-12** The detection script shall not click, focus, hide, move or restyle any site
  element, and shall not add any element to the page other than the existing overlay host.
- **FR-DET-13** Detection shall finish within 50 ms of scripting time on the demo pages and shall
  be scheduled when the browser is idle.
- **FR-DET-14** When a page has subscription terms or a consent checkbox, the detection result
  shall list the form's submit control with its visible label and an anchor, so Spec 6 can watch
  it for the moment-of-agreement trigger (design steering §5.3). Only the label is read.

### 4.4 Extraction

- **FR-EXT-01** When the user clicks Analyze, the extension shall extract the detected agreement
  from the page, from an open modal or banner, or from a linked policy page.
- **FR-EXT-02** Extraction shall remove navigation, headers, footers, scripts, styles, hidden
  decoration and form controls, and shall keep headings, paragraphs, list items and table text in
  reading order.
- **FR-EXT-03** Extraction shall normalize text by applying Unicode NFC, collapsing whitespace
  runs to a single space, and separating block elements with a single newline.
- **FR-EXT-04** Extraction shall split the text into sections at headings. Each section shall have
  an id, heading text, heading level, and `startOffset` and `endOffset` into the normalized text.
- **FR-EXT-05** Section ids shall be deterministic. They shall use the heading's own numbering
  when present (for example `s-4-2` for "4.2 Renewal"), otherwise a slug of the heading plus its
  position.
- **FR-EXT-06** Each section shall carry an anchor made of a CSS path to its heading element and a
  text-quote selector (the first 64 characters, plus 32-character prefix and suffix) so later
  specs can find it on the page again.
- **FR-EXT-07** Extraction shall compute `documentHash` as SHA-256 over the normalized text, so
  layout-only and whitespace-only changes produce the same hash and any word change produces a
  different one.
- **FR-EXT-08** When the agreement is a link to another page, the side panel shall offer "Read the
  linked policy", and only after the user clicks it shall the extension fetch that URL, with no
  cookies or credentials sent, and extract it.
- **FR-EXT-09** Extraction shall compute a completeness score from 0 to 1 and a list of reasons
  (FR-CMP-01 to 04).
- **FR-EXT-10** When the page is a PDF, or the agreement link points to a PDF, the side panel shall
  show "PDF agreements are not supported yet" and shall not attempt extraction.
- **FR-EXT-11** If the page changes while extraction runs, then extraction shall restart once and,
  if it changes again, shall report the result with the reason "page changed while reading".
- **FR-EXT-12** Extraction of a 20,000-word document shall complete within 300 ms of scripting
  time on a mid-range laptop.

### 4.5 Completeness

- **FR-CMP-01** The completeness score shall be the extracted character count divided by the sum
  of extracted characters and the estimated characters Specter could not read.
- **FR-CMP-02** Unreadable text shall include collapsed sections (`details` not open,
  `aria-expanded="false"` controlling hidden text), text in closed shadow roots or cross-origin
  frames, and content behind "Read more" or pagination controls when detectable.
- **FR-CMP-03** Where the size of unreadable content cannot be estimated, extraction shall cap
  completeness at 0.9 and list the reason without an estimated size.
- **FR-CMP-04** The side panel shall show coverage as "Coverage: complete" at 1, otherwise
  "Partial coverage" with the percentage read, and every reason in plain words. It shall offer
  "Try again" when the score is below 0.8.

### 4.6 Side panel states

- **FR-UI-01** The side panel shall show the idle state "No agreement detected on this page." when
  detection finds nothing, with "Analyze this page anyway".
- **FR-UI-02** When detection finds an agreement, the side panel shall show "Agreement detected:"
  followed by the kind in plain words, and an "Analyze Agreement" button.
- **FR-UI-03** For a cookie banner, the side panel shall list the controls found by role and
  label, for example "Reject optional: Reject all". It shall not press any of them.
- **FR-UI-04** After extraction, the side panel shall show the document title, section count,
  "Text read: N%", and the list of section headings. Clause findings arrive in later specs.
- **FR-UI-05** The side panel shall show distinct states for: excluded site, no access yet, PDF not
  supported, extraction incomplete, and page changed while reading.

### 4.7 Demo fixtures and corpus

- **FR-FIX-01** The repository shall contain static demo pages under `examples/`: Streamly signup
  with v1 and v2 terms, a cookie-banner page, and a benign terms page, using only fictional
  companies and people.
- **FR-FIX-02** Streamly v2 shall differ from v1 by removing the word "aggregated" in the privacy
  section and adding "and affiliated companies", with no other text change.
- **FR-COR-01** The repository shall contain at least 10 saved real pages under `corpus/` (terms,
  privacy and cookie-banner pages), each with a manifest entry giving the source URL, capture date,
  expected kinds, and two to five phrases that must appear in the extracted text.
- **FR-COR-02** A corpus runner shall report, for each page, detected kinds, section count,
  completeness and whether every expected phrase was found, plus totals.
- **FR-COR-03** The README shall state the latest corpus totals as measured, including failures.

## 5. Non-functional requirements

- **NFR-01** Detection and extraction logic shall live in `packages/core` and operate on a
  standard `Document`, with no `chrome.*` calls, so it runs in the content script, the side panel
  and tests alike.
- **NFR-02** All detection results and extracted documents shall be validated with Zod schemas
  defined in `packages/core`.
- **NFR-03** The detection content script bundle shall stay under 60 KB minified.
- **NFR-04** Background detection shall add no network requests.

## 6. Test requirements

- **TEST-DET-01 (fixture)** Each demo page is detected as its expected kinds; the benign page has
  no cookie banner and no subscription terms.
- **TEST-DET-02 (fixture)** The cookie-banner page lists accept, reject and manage controls with
  correct roles; a variant without a reject button records "no reject control found".
- **TEST-DET-03 (fixture)** A page with a banner inside an open shadow root is detected; a closed
  shadow root is recorded as unreadable.
- **TEST-PRV-01 (fixture)** A page with a password field, a card number field and an
  `autocomplete="cc-number"` field filled with known values never contains those values or their
  labels in any detection result or extracted text.
- **TEST-PRV-02** `shouldAnalyze` returning false stops detection before any DOM read.
- **TEST-EXT-01 (property)** For every extracted section, `text.slice(startOffset, endOffset)`
  starts with the section heading, sections do not overlap, and offsets cover the text in order.
- **TEST-EXT-02 (property)** Random whitespace, wrapper elements and CSS class changes leave
  `documentHash` unchanged; changing any single word changes it.
- **TEST-EXT-03 (fixture)** Streamly v1 and v2 produce different hashes and identical section ids.
- **TEST-EXT-04 (fixture)** Section ids follow the heading numbering on Streamly ("4.2" → `s-4-2`).
- **TEST-CMP-01 (fixture)** A page with a closed `details` element and a "Read more" collapse
  scores below 1 and lists both reasons; a fully visible page scores 1.
- **TEST-NOINT-01** Running detection and extraction on each demo page leaves the page's DOM
  identical apart from the overlay host.
- **TEST-COR-01** The corpus runner meets FR-COR-02 and the totals meet the acceptance target.

## 7. Acceptance criteria

1. On the corpus, detection and extraction succeed on at least 7 of 10 pages. Success means the
   expected kinds are detected, every expected phrase is found, and completeness is at least 0.8.
   On every other page completeness is below 0.8 and at least one reason explains why.
2. Background detection is off until the user grants it, shows the Chrome warning text first, and
   can be turned off again; removing the permission in Chrome turns it off in Specter.
3. Per-site mode works with no host permission granted, via the side panel.
4. The toolbar badge appears on the demo pages with background detection on and not on the benign
   page.
5. All TEST-* above pass, and typecheck, lint and build are green.
6. No test or manual check shows a request other than the user-triggered linked-policy fetch.

## 8. Open decision

The definition of done in the master prompt says "no network requests except to the user's chosen
AI provider". Reading a linked policy (FR-EXT-08) means fetching a page from the site the user is
on, or from where its link points. This spec proposes allowing that fetch only when the user clicks
"Read the linked policy", with credentials omitted. If you prefer a stricter rule, the alternative is
to open the linked page in a tab and extract it there, which needs no fetch but takes the user away
from the signup page.
