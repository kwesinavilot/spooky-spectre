# Spec 6 — Side Panel and Spectral Vision Overlay (Requirements)

> Scope: what the user sees. The side panel (Contract Exorcist), and the on-page overlay (Spectral
> Vision): highlights, margin marker, popover, the three effect levels, the Possession moment, the
> spectral pointer, and the settings the user changes. Governed by `design.md` steering sections 5, 6C
> and 6D. The rules in those sections win over any shortcut here.

## 1. Requirements

### R1 Highlights on the page (built)

- R1.1 "Show on page" highlights the verified quote on the live page. The page is not changed apart from
  the overlay.
- R1.2 If the page no longer has the passage, the card says so and keeps the saved quote.
- R1.3 Esc clears the highlight.

### R2 Margin marker and popover (open)

- R2.1 A 26px ghost marker sits beside each highlighted clause. It is keyboard focusable.
- R2.2 Activating the marker opens a popover (320px): impact chip, evidence chip, title, one sentence,
  "Open in Specter" (primary) and "Dismiss".
- R2.3 The popover never covers the site's accept button. If space is tight, it moves to the other side or
  below.
- R2.4 Everything overlay-related lives in a Shadow DOM, and extracted text is never inserted as HTML.

### R3 Effect levels on the page (partly built)

- R3.1 The level from settings (`immersive`, `subtle`, `quiet`) decides how each effect is drawn.
- R3.2 `prefers-reduced-motion` forces Quiet unless the user has turned "Respect system reduced motion"
  off.
- R3.3 Quiet keeps ghosts still. No effect moves the page layout.
- R3.4 Whisper, haunting and hand follow the table in `design.md` §5.2.

### R4 Possession (open)

- R4.1 Possession fires only when all four hold: impact is High, evidence is verified, confidence is 0.85 or
  more, and a moment of agreement happens. A moment of agreement is the pointer entering 120px of a
  detected action control, that control receiving focus, or "Show on page" for that finding.
- R4.2 Caps: once per finding per page load; once per site per day; three times per day across all sites.
  Counters are kept locally and reset daily.
- R4.3 Past the cap, the same finding gets haunting instead.
- R4.4 The callout sits beside the control, never over it. It states the verified consequence with its
  section, and has "Why am I seeing this?", which opens the finding and its quote.
- R4.5 Specter never prevents the click, never calls `preventDefault`, and never delays the site.
- R4.6 Immersive adds an edge vignette (outer 12%, opacity up to 0.55, fading in over 400 ms, held while the
  callout is open for at most 8 s) and up to three ghosts drifting once across part of the viewport, never
  over a protected control.
- R4.7 Esc dismisses the callout, vignette, ghosts and any sound.

### R5 Spectral pointer (open)

- R5.1 When "Show on page" targets a clause off screen, a ghost travels to it in at most 400 ms and fades
  after 1 s. Under Quiet, the glyph appears at the clause with no travel.

### R6 Side panel screens (partly built)

- R6.1 Analyzing: stepper with counts, Cancel always visible, partial coverage banner as soon as known, and an
  "excerpts being sent" block (open: the excerpts themselves, not only the count).
- R6.2 Settings drill-in: effect level (Segmented), respect system reduced motion, excluded domains (add and
  remove), "This site" toggle, and the link to Options (built).
- R6.3 Data: size used, Export JSON and Delete all with a confirm dialog naming what will be deleted. These
  depend on Spec 8 for stored data.

### R7 Resurrection (deferred to Spec 9)

- R7.1 Revisiting a saved agreement whose text changed raises the old clause beside the new one. Needs
  saved versions (Spec 8) and the comparison (Spec 9).

## 2. Acceptance

- Typecheck passes for the extension.
- The Possession caps and the four trigger conditions are covered by unit tests on pure functions.
- Each effect level is checked by hand in Chrome on the Streamly demo, with reduced motion both on and off.
