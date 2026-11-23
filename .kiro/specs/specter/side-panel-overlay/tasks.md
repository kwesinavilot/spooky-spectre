# Spec 6 — Side Panel and Spectral Vision Overlay (Tasks)

Status: **closed at the user's request (v0.12.0)** with tasks 17, 18 and 19 carried forward (see the end of this
file). `[x]` is built and checked in the repository; the overlay has not been checked in Chrome.

## Built

- [x] 1 Side panel shell: Page, Findings, Ask and History tabs; Settings and AI drill-ins. _§6C_
- [x] 2 Page tab: detected, extracted and failed states; Analyze agreement; preview; limited-mode labelling.
- [x] 3 Findings tab: verified cards sorted by impact, filters, source quote, section, "Source verified",
  "Not stated", Show on page, Dismiss. _R1, §4 of the steering_
- [x] 4 Show on page: `pageHighlight.ts` highlights the quote in the page's shadow root, scrolls to it, clears
  on Esc, and reports "not available" when the passage is gone. _R1_
- [x] 5 Effects drawn on the highlight: whisper (outline), haunting and hand (pulse), possession level
  colour. Motion is off under reduced motion. _R3 (partly)_
- [x] 6 Ask tab, AI connectivity screen and Settings toggle. _R6.2 (partly)_

## Open, in build order

- [x] 7 Margin marker: ghost glyph beside each highlight, focusable, opens the popover. Built and typechecked; not yet checked in Chrome. _R2.1_
- [x] 8 Popover (Shadow DOM, 320px): impact and evidence chips, title, sentence, "Open in Specter", "Dismiss". Built.
  Placement beside the marker, flipped to the left when there is no room; it does not yet check for accept
  controls. _R2.2, R2.3, R2.4_
- [x] 9 Effect levels honoured on the page: Immersive, Subtle, Quiet from settings, read on each marker or
  "Show on page" request (not through a nonce; the content script reads `chrome.storage` directly). Reduced
  motion forces Quiet. Built and typechecked; not yet checked in Chrome. _R3.1–R3.3_
- [x] 10 Possession rules: `apps/extension/src/possession.ts` (`meetsTrigger`, `decideEffect`), 18 unit tests passing.
  Not yet connected to the page: no moment of agreement is detected. _R4.1_
- [x] 11 Caps: once per finding per load, once per site per day, three per day, daily reset (`countersForDay`).
  Pure functions with unit tests passing. Storage wiring not yet done. _R4.2, R4.3_
- [x] 12 Callout beside the control with "Why am I seeing this?". Esc dismisses. No `preventDefault`. Built in
  `possessionOverlay.ts` and typechecked; not yet checked in Chrome. _R4.4, R4.5, R4.7_
- [x] 13 Immersive vignette and drifting ghosts, once each, never over a protected control. Built; placement
  against protected controls is not yet verified in Chrome. _R4.6_
- [x] 14 Spectral pointer for off-screen targets. Built in `pageHighlight.ts` (`focusMark`); not yet checked in Chrome. _R5.1_
- [x] 15 Analyzing screen: show the excerpts being sent (not only the count) and keep Cancel visible. Built in
  `PageTab.tsx` (`ExcerptList`); not yet checked in Chrome. _R6.1_
- [x] 16 Settings: haunting level Segmented, respect reduced motion switch, excluded domains editor, "This site".
  Built in `App.tsx` (`SettingsBody`) on the chrome.storage preferences the page reads. Options still shows
  only the built-in list. Not yet checked in Chrome. _R6.2_
- [ ] 17 Data section: size used, Export JSON, Delete all with confirm. **Blocked by Spec 8.** _R6.3_
- [ ] 18 Resurrection. **Blocked by Spec 8 and Spec 9.** _R7_
- [ ] 19 Chrome check on the Streamly demo for each effect level, reduced motion on and off. Recorded here by the
  user. **Still to do by the user.**

## Notes

- Tasks 10 to 12 are the core of Possession. Build and test them before the visuals in task 13.
- The rules in `.kiro/steering/design.md` §5.3 are the spec for Possession. Where this file is shorter, the
  steering wins.

## Closed (v0.12.0)

Spec 6 is closed in the roadmap at the user's request. It is closed with three tasks open, not done:

- Task 17 (Data section: size used, Export JSON, Delete all) moves to Spec 8, which creates the saved data.
- Task 18 (Resurrection) moves to Specs 8 and 9, which create saved versions and their comparison.
- Task 19 (Chrome check on the Streamly demo, each effect level, reduced motion on and off) is a manual check
  by the user. Until it is recorded, markers, the popover, the Possession callout, the vignette, the drifting
  ghosts and the effect levels are built and typechecked, not seen working in a browser.
