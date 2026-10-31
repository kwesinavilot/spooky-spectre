# Specter — Design

Use the tokens from the master prompt. Fraunces for headings, IBM Plex Sans for body.

Tokens: ink `#0E0B14`, panel `#14101D`, border `#2B2340`, violet `#8B5CF6`, pale violet `#C9B5FF`,
blood `#F0506E`, amber `#F5B84B`, verified green `#7FE0AD`, text `#E9E4F2`, muted `#A79FBA`.

- Effects require an evidence-backed finding id.
- Respect `prefers-reduced-motion` and the Quiet mode.
- Overlay UI lives in Shadow DOM.
- Minimum touch target 44px. Visible focus on every control.
- Text must meet 4.5:1 contrast.
- All controls are real buttons, links and inputs with visible focus rings. No emoji.
- Icons are inline stroke SVG.
