# Spec 6 — Side Panel and Spectral Vision Overlay (Tasks)

Status: **open**. Spec 6 is not complete. `[x]` is built and checked by the user or in the repository.

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

- [ ] 7 Margin marker: 26px ghost glyph beside each highlight, focusable, opens the popover. _R2.1_
- [ ] 8 Popover (Shadow DOM, 320px): impact and evidence chips, title, sentence, "Open in Specter", "Dismiss". Placed
  so it never covers an accept control. _R2.2, R2.3, R2.4_
- [ ] 9 Effect levels honoured on the page: Immersive, Subtle, Quiet from settings, read through the service
  worker with a nonce; reduced motion forces Quiet. _R3.1–R3.3_
- [ ] 10 Possession trigger: detect action controls (`DetectionResult.actionControls`) and the pointer zone, focus
  and "Show on page" triggers. Pure function `shouldPossess(finding, moment, counters, now)` with unit tests. _R4.1_
- [ ] 11 Caps: counters in `chrome.storage.local` (per finding per load in memory; per site per day; total per
  day), reset daily. Pure function with unit tests. _R4.2, R4.3_
- [ ] 12 Callout beside the control with "Why am I seeing this?". Esc dismisses. No `preventDefault`. _R4.4, R4.5, R4.7_
- [ ] 13 Immersive vignette and drifting ghosts, once each, never over a protected control. _R4.6_
- [ ] 14 Spectral pointer for off-screen targets. _R5.1_
- [ ] 15 Analyzing screen: show the excerpts being sent (not only the count) and keep Cancel visible. _R6.1_
- [ ] 16 Settings: haunting level Segmented, respect reduced motion switch, excluded domains editor, "This site".
  _R6.2_
- [ ] 17 Data section: size used, Export JSON, Delete all with confirm. Waits for Spec 8. _R6.3_
- [ ] 18 Resurrection. Waits for Spec 8 and Spec 9. _R7_
- [ ] 19 Chrome check on the Streamly demo for each effect level, reduced motion on and off. Recorded here by the
  user.

## Notes

- Tasks 10 to 12 are the core of Possession. Build and test them before the visuals in task 13.
- The rules in `.kiro/steering/design.md` §5.3 are the spec for Possession. Where this file is shorter, the
  steering wins.
