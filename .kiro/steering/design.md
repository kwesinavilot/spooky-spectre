---
inclusion: always
---

# Specter design system and UI behavior

Steering file for building the Specter extension UI. Follow it for every popup, side panel, onboarding, Graveyard, options, utility page and on-page overlay. When this file and a screenshot disagree, ask; do not guess. When this file and `product.md` / `privacy.md` disagree, the privacy and product rules win.

Reference screens live in `docs/design/` (exported from the design canvas). The design is a visual and behavioral reference, not code to copy. Rebuild it in React + Tailwind using the tokens below.

---

## 1. Principles (non-negotiable)

1. **Calm panel, theatrical page.** The side panel, popup and settings are professional and readable. Spooky effects happen only on the page, only for verified findings, and only briefly.
2. **Never obscure the site.** Overlays must not cover or block Accept / Reject / Manage buttons, form inputs or legal text. Overlays never dim the content area; the only darkening allowed is the Immersive edge vignette in section 5, which stays at the screen edges.
3. **Evidence over drama.** Every finding shows its source quote, its location, and an evidence label. No finding is shown as verified unless the deterministic check passed.
4. **Honest wording.** Say "May result in recurring charges", "Worth reviewing", "Requires confirmation". Never say "scam", "illegal", "dangerous", "unsafe" or "trust score".
5. **User in control.** Nothing is analyzed, sent, saved or recorded without an explicit user action. Specter never clicks a site's consent buttons.
6. **Color is never the only signal.** Every colored state also has a text label and, where useful, an icon.
7. **Accessible by default.** WCAG 2.2 AA, full keyboard use, visible focus, reduced-motion respected.

---

## 2. Design tokens

Define these once as CSS variables and map them to the Tailwind theme (`theme.extend.colors`). Do not hard-code hex values in components.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0D101B` | App background |
| `--bg-deep` | `#080A12` | Canvas behind popups, overlay mock frames |
| `--surface` | `#191C2B` | Cards, popup, popovers |
| `--surface-2` | `#232744` | Selected rows, selected segment, hover |
| `--inset` | `#121528` | Inputs, quotes, nested cards |
| `--ghost` | `#C7A7FF` | Primary accent, links, focus ring, active nav, primary button fill |
| `--lavender` | `#8B6BC3` | Borders of emphasis, toggle on-track, dashed borders. **Not for small text** (fails 4.5:1) |
| `--text` | `#F4EAFF` | Primary text |
| `--muted` | `#BDB8CE` | Secondary text |
| `--high` | `#DC4667` | High-concern borders and dots |
| `--high-text` | `#FF9DB0` | High-concern **text** (the base red is too dark for small text) |
| `--medium` | `#E4B15C` | Medium-concern border, dot, text |
| `--ok` | `#65BDA6` | Verified / connected / positive |
| `--line` | `#2E3252` | Dividers and default borders |

Light mode is **deferred**. Ship dark only. Show "Dark · light theme later" in Settings. Do not add a half-working light theme.

### Typography
- Headings and the wordmark: **Fraunces** 600 (Google Fonts).
- UI and body: **Inter** 400 / 500 / 600.
- Quoted source text, hosts, tokens, API keys: **JetBrains Mono** 400 / 500.
- Scale: h1 44/1.08 (onboarding hero only), h2 30/1.15, h3 16/1.3 (600), h4 14/1.3 (600), body 14/1.5, small 13, caption 12. Eyebrow labels: 12px, 600, uppercase, letter-spacing .14em, `--ghost`.
- Side panel never uses h1/h2. Use h3/h4.

### Spacing, radius, elevation
- Spacing scale: 4, 8, 12, 16, 24, 32, 48. Side panel body padding 16, card padding 16, gap between cards 12–14.
- Radius: controls 12, cards 16, nested cards 12, quotes 10, chips full pill, mini-chrome 16.
- Borders: 1px `--line`. Emphasis uses a 1px colored border, not a thick left bar.
- Shadow only on floating things (popover, popup, permission prompt): `0 18px 40px rgba(0,0,0,.45)`.
- Touch/click targets are **at least 44x44px**, including icon buttons and toggles.

### Icons
Inline SVG, 24px viewBox, stroke `currentColor`, stroke-width 1.8, round caps and joins, no fill, shown at 20px (28px for the logo). Decorative icons get `aria-hidden="true"`. Icon-only buttons get `aria-label`. No emoji anywhere. Use an icon library only if it matches this stroke style (for example Lucide).

The logo is a simple ghost glyph (rounded head, wavy hem, two eye dots) in `--ghost` beside the word "Specter" in Fraunces.

---

## 3. Components

Build these once in `packages/ui`. Names are suggestions.

| Component | Rules |
|---|---|
| **Button** | Min height 44, radius 12, 600 weight. Variants: `primary` (fill `--ghost`, text `--bg`), `secondary` (transparent, 1px `--lavender` border, `--text`), `quiet` (1px `--line`, `--muted`), `danger-outline` (`--high` border, `--high-text`). `block` = full width. Never two primary buttons in one view. |
| **IconButton** | 44x44, radius 12, 1px `--line`, `--muted` icon. Requires `aria-label`. |
| **Chip** | Pill, 12px 600, 1px border, text and border same color. Variants: neutral, `ghost`, `high`, `medium`, `ok`. Always contains text. Chips that are links get a 44px hit area through padding or a wrapper. |
| **Card** | `--surface`, 1px `--line`, radius 16, padding 16. `emphasis` variants swap the border to `--high`, `--medium`, `--ok`. `dashed` variant uses a dashed `--lavender` border for optional or skippable actions. |
| **InsetCard** | `--inset` background, radius 12. Used for "what will be sent" previews and fallback notes. |
| **Toggle** | Real `<button role="switch" aria-checked>`. 52x44 hit area, 44x26 track. Off: transparent track, 1px `--muted` border. On: `--lavender` track, light knob. Always has a visible text label beside it. |
| **Input / Select** | Min height 44, `--inset` fill, 1px `--line`, radius 12. Always a visible `<label>` (or a screen-reader-only label for search). Keys use `type="password"` and Mono. |
| **OptionCard (radio)** | Real radio inside a bordered row. Selected: 1px `--ghost` border plus inset ring. Used for Effects choice, document choice. |
| **Segmented** | Three equal segments, 40px high. Selected: `--surface-2` fill and `--ghost` inset ring. Used for Immersive / Subtle / Quiet. |
| **SourceQuote** | `--inset`, 1px `--line`, radius 10, 13px. The matched passage is wrapped in `<mark>` styled `rgba(199,167,255,.22)` with a 1px `rgba(199,167,255,.55)` ring. Content is always inserted as **text, never HTML**. |
| **DiffText** | Removed: `rgba(220,70,103,.2)` background plus strikethrough. Added: `rgba(101,189,166,.2)` background plus underline. (Shape, not just color.) |
| **ProgressStepper** | Linear 6px bar plus a list of steps. Step states: done (check, `--ok`), running (dashed circle, `--ghost`, bold), waiting (empty circle, `--muted`). |
| **FindingCard** | See section 5. |
| **PanelHeader / PanelNav** | Header 14px padding, bottom 1px line. Bottom nav is 4 equal tabs, 64px high: Page, Findings, Ask, History. Active tab: `--ghost` text and a 2px inset top line. |
| **MiniChrome** | Fake browser bar (3 dots plus mono URL) used only in onboarding and demo imagery, never in the real UI. |

### Voice
Short sentences. Plain words. Say what is true and what is not known. Examples to reuse:
- "Nothing has been read or sent yet."
- "Not stated: when your trial starts, so no charge date is calculated."
- "Specter never clicks these for you."
- "Partial coverage: Section 11 could not be read."

---

## 4. Severity, evidence and coverage (three independent dimensions)

Never merge these into one score. Show them as separate chips.

| Dimension | Values | Chip |
|---|---|---|
| Impact | High / Medium / Low / Unknown | `High impact` (high), `Medium impact` (medium), `Low impact` (neutral), `Impact unknown` (neutral) |
| Evidence | verified / partial / unverified | `Source verified` (ok), `Partial evidence` (medium), `Unverified` (neutral, shown only inside a collapsed "Unsupported" group) |
| Coverage | complete / partial / unknown | Header text: `Coverage: complete`, `Partial coverage`, `Coverage unknown`. Partial and unknown use a medium banner card. |

Rules:
- A finding without a passing quote check is **not shown as a finding**. It is dropped or listed under "Could not be verified".
- Unknown impact is never dramatized: neutral chip, no icon color.
- Rule-only results (no AI) carry a `Limited · on-device only` chip.
- If a date or price is not in the source, the UI says "Not stated". It never computes a renewal date.

### Finding card anatomy (side panel, 400px)
1. Row: category icon + category label (left), impact chip (right).
2. Title (h3, one line, plain language).
3. One or two sentences of consequence (muted).
4. SourceQuote with the `<mark>`.
5. Row: source location (`§4.2 Subscription and renewal`) and evidence chip.
6. Optional "Not stated" or uncertainty line (caption, muted).
7. Actions: **Show on page** (primary), **Explain** (secondary), overflow menu (Save, Dismiss, Report issue).
Collapsed state: one row with icon, title and impact chip. Tapping expands in place (no navigation).

Order findings by impact (High, Medium, Low, Unknown), then by document order.

---

## 5. Motion and effects

### 5.1 The rule: scares are rare and earned

Specter is a product people use every day, so the scare has to mean something. A big effect appears only when something consequential is verified and the user is about to act on it. Everything else stays quiet. A scare on a guess destroys trust, so effects follow the same rule as findings: evidence or silence.

**Ghosts are part of every mode.** Their form changes with the effect level; they are never removed entirely.

| Level | Ghost form |
|---|---|
| Immersive | Up to three ghosts drift once across the viewport during Possession; the ghost glyph marks every finding |
| Subtle (default) | One ghost glyph rises beside the clause (600 ms) and stays as the margin marker |
| Quiet, or reduced motion | The static ghost glyph marks each finding; no movement |

The effect level setting (`immersive | subtle | quiet`) is stored in settings. **`prefers-reduced-motion: reduce` forces Quiet motion** unless the user turns off "Respect system reduced motion" (on by default). Quiet still shows ghosts, outlines and static color; it removes movement only.

### 5.2 Effects

| Effect | When | Immersive | Subtle (default) | Quiet |
|---|---|---|---|---|
| **Whisper** (purple edge shimmer around the clause) | Informational finding revealed | 600 ms, once | 600 ms, once | static outline |
| **Haunting** (soft pulse ring around the clause) | High or Medium finding, "Show on page" | 2.4 s, 2 pulses, then a static 2px `--ghost` outline | 1 pulse | static outline |
| **Spectral pointer** (ghost glyph guiding to an off-screen clause) | "Show on page" when the clause is off-screen | travels ≤ 400 ms, fades after 1 s | travels ≤ 400 ms, fades after 1 s | glyph appears at the clause, no travel |
| **Possession** (see 5.3) | Possession trigger | edge vignette, `--high` clause outline with 2 slow pulses, three drifting ghosts, callout beside the control | `--high` outline with 1 pulse, one rising ghost, callout | static `--high` outline, static ghost, callout |
| **Resurrection** (old clause rises beside the new one) | Opening a comparison, or revisiting a saved agreement whose text changed | old column rises and fades in over 500 ms with one ghost | 150 ms crossfade | instant |

### 5.3 Possession: trigger, frequency and limits

**Trigger.** All four must be true:
1. Impact is High.
2. Evidence is `Source verified` (the deterministic quote check passed).
3. Confidence is at least 0.85.
4. A moment of agreement: the pointer enters a 120px zone around the detected submit, "Start trial" or Accept control; that control receives keyboard focus; or the user presses "Show on page" for that finding.

**Frequency.** At most once per finding per page load, once per site per day, and three times per day across all sites. After that, the same finding shows Haunting instead. The counters live in local settings and reset daily.

**The callout.** A popover beside the control (never over it) states the verified consequence with its section, for example: "Before you press this: renews at GHS 120 per month (§4.2). Cancel at least 24 hours before renewal." It includes **Why am I seeing this?**, which opens the finding and its quote. Specter never prevents the click, never calls `preventDefault`, and never delays the site.

**Immersive vignette.** A radial darkening limited to the outer 12% of the viewport, with opacity up to 0.55. It fades in over 400 ms, holds while the callout is open (8 s at most), then fades out. If the clause, the callout or a protected control (consent buttons, submit buttons, form fields) is inside the edge band on one side, that side gets no vignette.

**Drifting ghosts.** Up to three, Immersive only, once per Possession. Each drifts across part of the viewport in 4 to 6 s with soft opacity changes, then is removed. They never pass over protected controls or the callout, and they never loop.

**Sound.** Off by default. If the user turns it on (Immersive only), one soft tone of at most 1 s plays at the start of Possession. Never on page load.

### 5.4 Hard limits (every level)

- **No flashing.** No element changes brightness or color more than once per second (pulses are ≤ 1 Hz); this stays well inside WCAG 2.3.1's three-flashes-per-second limit.
- No jump scares: nothing appears suddenly at full size or full opacity, and nothing appears on page load.
- No looping animation. Animations last at most 3 s, except ghost drift (6 s, once) and the vignette hold (while the callout is open, 8 s at most).
- All effects are `pointer-events: none`, except Specter's own ghost markers and callouts. Effects never move page layout.
- **Esc dismisses everything at once**: callout, vignette, ghosts and sound.
- Highlights and ghost markers stay visible with zero animation.

### UI transitions (inside the extension)
- Side panel tab switch (Page / Findings / Ask / History): content swaps with a 120 ms opacity fade. No slide. Keep scroll position per tab.
- Drill-in screens (Analyzing, Settings, AI connectivity) replace the body with a header that has a **back arrow**. Entering: 160 ms fade. Back returns to the previous tab with its state intact.
- Stepper progress: bar width animates 200 ms. Under Quiet or reduced motion, jump without animation.
- Expand / collapse of finding cards: 150 ms height; instant under Quiet.
- Toggles and segmented controls change instantly (<= 100 ms).
- Never animate the whole side panel width.

---

## 6. Surfaces and screens

Every screen below exists as a reference image. File names are suggestions for `docs/design/`.

### A. Onboarding (full-page extension tab, 960 wide reference, centered, max 960)
Layout: top bar (logo, "Step N of 6", progress dots, Skip setup link), two-column body (copy left, illustration or controls right), footer (Back, Continue). Footer buttons are fixed at the bottom.

| # | Screen | Purpose | Primary action |
|---|---|---|---|
| 1 | Welcome | Value in one line plus a preview finding | Get started; secondary "Try the demo page" |
| 2 | Privacy promise | Three promises and "stays on device vs leaves only if you analyze" | Continue |
| 3 | Permissions | Explain minimal permissions and the later per-site prompt | Continue |
| 4 | Effects and privacy defaults | Choose Immersive / Subtle (recommended) / Quiet; set four privacy toggles | Continue |
| 5 | Connect AI (optional) | Provider, key, Test connection, "what gets sent" preview; **Skip for now** | Continue / Skip |
| 6 | Ready | Summary of choices, open demo, pin to toolbar hint | Open the Streamly demo |

Behavior:
- Skip setup is available on steps 1–5 and jumps to step 6. Skipping never blocks the extension. Defaults when skipped: Subtle, ask every time, cookie detection on, consent logging off, AI not connected.
- Back preserves entered values. Continue persists settings for that step immediately (do not wait for the end).
- Step 5: "Test connection" shows a spinner state, then `Connected` (ok chip) or an error chip with a plain reason. Continue is enabled either way. The key is never shown again after leaving the field.
- Step 6 summary reflects the real choices made (not hard-coded).
- Onboarding opens on first install only. It can be reopened from Help.

### B. Toolbar popup (360 wide)
- Header: logo, Settings icon button (opens side panel Settings).
- Body: host (mono) plus status chip; title and one-line explanation; primary **Open Specter**; "Specter on this site" toggle.
- Footer: "Last scan: <time> · On-device" plus links to Graveyard and Help.
- States: **Agreement detected** (medium chip "Review available"), **Nothing found** (neutral "Quiet"; secondary button "Choose text to analyze"), **Paused on this site** (toggle off, chip "Paused"), **Excluded site** (chip "Excluded", no actions except re-enable), **Unsupported page** (chrome pages, PDFs: explain limits).
- Open Specter opens the side panel for the current tab and closes the popup.
- The toolbar **badge** is a small dot (medium color) when an agreement or cookie choices are detected. It never shows a number or a risk color.

### C. Side panel (400 wide, full height)
Layout: header, scrolling body, bottom nav (Page, Findings, Ask, History). Header icon buttons (AI connection key icon, Profile icon) open drill-in screens.

**Page (Home)**
- Status card: host, state chip, document choice (radio list if more than one linked document), primary **Analyze agreement**, cost note ("On-device scan is free. AI analysis sends selected excerpts to your provider, about N tokens (estimate).").
- Multiple documents: the user must choose one. Never combine documents silently. Default selection is the Terms document only if one is clearly primary; otherwise no default and the button is disabled.
- Cookie card (shown only if a banner is detected): lists detected controls with `Detected` (ok) or `Uncertain` (medium). Caption: "Use the site's own buttons to choose. Specter never clicks them." Uncertain controls are labeled uncertain, never presented as a reliable button.
- Recently saved: up to 2 snapshots with Compare / Open.

**Analyzing**
- Stepper: Extract text, Screen likely clauses, Interpret with AI, Check every quote against the source. Counts shown on the right ("32 sections", "4 of 6").
- Cancel analysis (quiet button) is always visible and aborts the request.
- Partial-coverage banner appears as soon as extraction reports it.
- "Sent to your provider" InsetCard shows the exact excerpts leaving the device.
- If AI is not connected or fails, the stepper skips "Interpret with AI", and results show the `Limited · on-device only` chip.
- On success, navigate to **Findings** automatically and focus its heading for screen readers.

**Findings**
- Header: document title, count and coverage line, **Save snapshot** button.
- Filter chips: All / High / Medium / Low with counts (single select, not required to use).
- List of FindingCards (section 4).
- **Show on page**: sends `HIGHLIGHT_REQUESTED`, scrolls the live page to the clause, plays the effect per level. If the live DOM can no longer be matched (page changed or navigated), show an inline notice "Live highlighting isn't available. Showing the saved passage." and open the quote in a snapshot view instead. Never pretend to highlight.
- **Explain** switches to Ask with a pre-filled question about that finding.
- Empty state (no findings): "No clauses of concern were found in what Specter could read." plus coverage line. Never say the agreement is safe.

**Ask**
- Header: "Ask Specter" plus the document name and an AI status chip.
- Conversation: user bubble right (`--surface-2`, `--lavender` border), answer card left (`--surface`).
- Answers end with citation chips (`§4.1 Free trial`) that jump to the source, and a medium "Not stated" chip when the document is silent.
- Suggested questions are quiet buttons shown when the thread is empty or after an answer.
- Footer note: "Answers use only the excerpts of this agreement."
- If AI is not connected: replace the input with a card "Connect an AI model to ask questions" and a button to AI connectivity.
- Answer states: sending (typing indicator), answered, insufficient evidence ("The terms do not say."), error with Retry.

**History (shortcut)**
- Opens the full-page Graveyard in a new tab. The side panel keeps its state.

**Settings and profile (drill-in)**
- Local profile card ("No account. Everything stays on this device." with a Private chip). No sign-in UI anywhere in the MVP.
- Appearance: effects segmented control, respect-reduced-motion toggle, theme (read-only text).
- Privacy: analyze-only-when-I-ask, offer-to-log-consent-choices, excluded sites (Manage opens a list with add / remove).
- This site: enable toggle for the current domain.
- Your data: size used, **Export JSON**, **Delete all** (danger outline; requires a confirm dialog that names what will be deleted and has Cancel as the default focus).
- Footer links: What's new, Privacy, Help, version.

**AI connectivity (drill-in)**
- Status card: Connected (ok) / Not connected (neutral) / Error (high) with last test time and latency.
- Provider select, Model select, API key field with Replace, **Test connection**, **Remove key**.
- Permission and cost: provider origin and Granted / Needed chip (a "Grant access" button requests the optional host permission), preview-before-sending toggle (default on), redact-personal-fields toggle (default on), cache toggle (default off), token budget slider.
- Fallback note: "No model or offline? Specter falls back to on-device scanning and labels results as limited."
- Never display the stored key. After saving, show masked text only. Never put the key in the DOM of a content script, logs or telemetry.

### D. On-page overlay (content script, Shadow DOM)
- Highlight: `rgba(199,167,255,.2)` background plus 2px `--ghost` outline, radius 4, on the exact clause range. On light pages the same colors still need to pass: keep the outline, which carries contrast.
- Margin marker: 26px circle with the ghost glyph, left of the clause. Keyboard focusable. It is the anchor for the popover.
- Popover (320 wide, `--surface`): impact chip, evidence chip, title, one sentence, buttons **Open in Specter** (primary) and **Dismiss**. It never covers the site's Accept button. If space is tight, place it on the opposite side or below.
- All overlay UI is isolated in a Shadow DOM so the page cannot restyle or spoof it. Do not use `innerHTML` with extracted text.
- Esc dismisses the popover. Dismiss removes the highlight for this page load.
- Respect the effect level (section 5). Quiet shows the outline and the static ghost marker with no motion.
- Possession callouts and drifting ghosts follow section 5.3. They are placed after measuring the protected controls and never overlap them.

### E. Graveyard (full-page tab, 1280 reference)
- Left nav (232): Agreements, Consent history, Changes, Reminders (disabled, "Later" chip), Settings. Footer line: storage used.
- **Changes** (designed): title, search field, Export JSON, version chips (A to B), summary chips (changed / added / removed), a note that a changed policy is not a new consent, then paired Version A / Version B cards per changed section (DiffText), then an optional **Explain changes** card.
- **Explain changes** needs AI. It shows what will be sent first and cites both old and new passages.
- **Agreements** (not yet designed): searchable table or list by domain, title, kind and capture date. Row actions: Open, Compare (choose a second version), Recheck, Delete. Follow the Card and Chip patterns.
- **Consent history** (not yet designed): a ledger separate from documents. Columns: date, domain, choice (accepted / rejected / customized / unknown), provenance chip (`Observed click` or `User confirmed`), linked version if any. Never mark an entry as proof; caption: "A record is a note, not legal proof." Adding an entry is a form with explicit choice and optional note, saved as `user_confirmed`.
- **Recheck**: manual only. Extracts the current page, creates a new version, then opens Changes. Identical hash shows "No changes in the text."

### F. Utility pages (full-page tab, 960 wide)
Top bar: logo and nav (Help, Terms, Privacy, Disclaimer, What's new), current page underlined in `--ghost`.
- **Help**: search, three quick-start cards, FAQ as `<details>` accordion, contact card. Include entries for cookie banners in frames, partial coverage, key storage and the Quiet mode.
- **Terms** and **Privacy**: two-column layout with a sticky table of contents (left) and prose (max 640 wide). They are drafts with placeholders such as `[YOUR COMPANY NAME]`. Do not ship placeholders; replace them or block release.
- **Disclaimer**: four principle cards, a legend of the labels, and a professional-advice line.
- **What's new**: latest release card (emphasis border), "Coming later" card marked "Not promised". Do not fetch release notes from a server; bundle them in the extension.
- Every utility page is reachable from the side panel Settings footer and from the Help page nav. The disclaimer is also linked from the Findings footer.

---

## 7. Flows

Each flow lists the user action, what Specter does, and what the UI shows. Build and test each as an E2E scenario on the demo site.

### Flow 1: First run
Install, then the onboarding tab opens. Steps 1 to 6, then Open demo (opens the Streamly demo in a new tab with the side panel available) or Finish (closes the tab). Skipping at any point lands on step 6 with defaults.

### Flow 2: Detect, analyze, verify
1. User opens a signup page. Content script detects terms links and/or a banner **on-device**. The badge shows a dot. No network call.
2. User opens the popup or side panel. Page tab shows "Agreement detected".
3. User chooses a document, presses **Analyze agreement**. If AI will be used and "preview before sending" is on, show the excerpts and require **Send** to continue.
4. Analyzing screen shows progress. Cancel aborts.
5. Findings appear; the panel navigates to Findings.
6. User presses **Show on page**. The page scrolls and the highlight plays. Popover appears. The user can press **Open in Specter** to focus the finding card.
7. Save snapshot (optional): confirms, shows a toast "Saved to Graveyard" with a **View** action. Nothing is stored before this step except the ephemeral analysis cache.

### Flow 3: Cookie banner
1. Banner detected on-device; badge dot.
2. Side panel Page tab shows the cookie card with detected controls (some may be `Uncertain`).
3. User picks using the **site's own buttons**.
4. If "Offer to log consent choices" is on and a click on a known control is unambiguously observed, show a non-blocking prompt: "Save this choice? Accepted all cookies on example.com" with **Save** and **Not now**. It saves as `observed_click`. Otherwise offer **Record my choice** (manual) which saves as `user_confirmed`. Never infer consent from a closed banner or navigation.

### Flow 4: Ask
1. User opens Ask, types or taps a suggested question.
2. Specter retrieves relevant sections and sends only those. UI shows a typing state.
3. Answer with citation chips. Tapping a chip runs "Show on page" for that section (or opens the snapshot view if the page changed).
4. If the text does not say, the answer says so and shows the `Not stated` chip.

### Flow 5: Save, recheck, compare
1. Save snapshot on Findings. Later, on the same page, press **Recheck** (in Page tab, shown when a saved version exists).
2. Specter extracts and hashes. If identical: "No changes in the text." If different: show a **Changed version** state with a primary **Compare versions** button that opens the Graveyard Changes view for the pair.
3. Optional **Explain changes** (AI). A policy edit is never shown as a new consent.

### Flow 6: Connect or change AI
Side panel header key icon opens AI connectivity. Enter key, Test connection, grant provider access when asked, Back returns to where the user was. If AI is later unavailable (offline, quota, bad key), the next analysis falls back to on-device scanning, shows a banner "AI unavailable. Showing on-device results." and offers **Retry with AI**.

### Flow 7: Pause, exclude, delete
Popup or Settings toggle pauses the current domain. Excluded sites are never scanned or extracted. **Delete all** requires a confirm dialog; deleting a single record uses an inline confirm. Export JSON downloads immediately and shows a toast.

---

## 8. Side panel state model

Implement as an explicit state machine per tab. Each state has one clear primary action and one plain explanation.

`idle` → `agreement_detected` → `ready_to_analyze` → `extracting` → `analyzing` → `validating` → `findings`

Branches and terminal states: `partial_results` (findings plus a coverage banner), `no_findings`, `unsupported_page` (PDF, internal browser pages, inaccessible frames; explain the limit), `error` (plain reason plus Retry), `offline_no_model` (on-device results labeled limited), `saved` (snapshot stored), `changed_version` (saved version differs from the current page).

Rules:
- Cancel is available in `extracting`, `analyzing` and `validating`.
- Any navigation or SPA route change invalidates in-flight work and stale anchors. Return to `idle` or `agreement_detected` and tell the user why in one line ("The page changed. Run analysis again.").
- Messages carry `tabId`, `documentId` (if available), `url` and `requestId`. Ignore any response that does not match the current request.

---

## 9. Accessibility checklist

- Every interactive element is a real `<button>`, `<a href>`, `<input>` + `<label>`, `<select>`, `<details>`. No clickable `div` or `span`.
- Focus ring: 2px `--ghost`, 2px offset, always visible (never `outline: none`).
- Tab order follows visual order. Drill-in screens move focus to the screen heading. Closing a dialog returns focus to its trigger.
- Contrast: text 4.5:1 (3:1 for 24px and larger), UI components 3:1. Do not use `--lavender` for small text; do not use `--high` for small text (use `--high-text`).
- Live regions: analysis progress and results use `aria-live="polite"`. Errors use `role="alert"`.
- Overlay popover has `role="dialog"` with an accessible name, and the highlighted text keeps its normal reading order.
- Toggles expose state with `aria-checked`. Chips that act as statuses are plain text, not buttons.
- Target size 44x44 minimum. Support zoom to 200% in the side panel without horizontal scroll.
- Motion rules in section 5 apply to every animated element.

---

## 10. Security and privacy rules for the UI

- Render all extracted text and all AI output as **text** (React escapes by default). Never `dangerouslySetInnerHTML` with page or model content.
- Never show, log or put the API key in the page DOM or content-script scope.
- Show "what will be sent" before any AI call when the preview setting is on (default on). Redact personal fields where possible and say what was redacted.
- No analytics or telemetry containing agreement text, keys or user identifiers.
- Do not read passwords, payment fields, medical records or private messages.
- Content script UI lives in a Shadow DOM and never trusts messages from page scripts.

---

## 11. Content rules (copy)

- Use "agreement", "terms", "clause", "finding". Avoid "risk score", "trust", "safe", "scam", "illegal".
- Severity chips read "High impact", "Medium impact", "Low impact".
- Always pair a number or date from the document with its section reference. If it is absent: "Not stated".
- Always end AI-facing screens with a pointer to the disclaimer: "Informational assistance, not legal advice."
- Buttons are verbs: "Analyze agreement", "Show on page", "Save snapshot", "Test connection", "Delete all".
- Destructive confirmation names the action and the amount ("Delete all 14 saved agreements and 6 consent records?").

---

## 12. Implementation notes

- Stack: React + Vite + Tailwind, shared components in `packages/ui`, tokens in `packages/ui/tokens.css` and mapped into `tailwind.config`.
- Surfaces: `popup`, `sidepanel`, `options` (onboarding and utility pages can be routes inside it), `graveyard`, and `content` (overlay, Shadow DOM). The overlay must not import the side panel's global CSS.
- Fonts: bundle them locally in the extension (no runtime Google Fonts request, to respect MV3 CSP and privacy). Fall back to system UI and Georgia.
- Routing: side panel uses an internal stack (tab + optional drill-in). The back arrow pops the stack. Do not use browser history inside the side panel.
- Settings are the single source of truth for effect level, privacy toggles and AI status. Read them through a typed store; the overlay receives only the effect level and a nonce via the service worker.
- Build order: tokens and base components, popup, side panel shell and nav, Page tab, Findings and FindingCard, overlay highlight and popover, Analyzing, Ask, Settings and AI connectivity, Graveyard Changes, onboarding, utility pages, then the undesigned Graveyard screens.

## 13. Definition of done for any UI task

- Matches the reference image for layout, spacing and tokens, or the deviation is explained.
- All states in section 8 relevant to the screen are implemented (loading, empty, error, partial).
- Keyboard-only walkthrough works. Focus is visible. No clickable non-interactive elements.
- Contrast and 44px targets verified. Reduced motion verified (Quiet mode shows no animation).
- Copy follows section 11. No banned words.
- No untrusted text is rendered as HTML. No secrets in DOM, logs or telemetry.
- Unit test for any logic (severity ordering, state machine transitions) and an E2E scenario for each flow touched.