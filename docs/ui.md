# UI and design tokens

The rules are in `.kiro/steering/design.md`. This page records what the code implements.

## Tokens

Defined once in `packages/core/src/tokens.ts` (`DESIGN_TOKENS`), exposed three ways:

| Use | Where | Example |
| --- | --- | --- |
| Tailwind classes | `packages/ui/tailwind.preset.ts` | `bg-surface`, `text-fg`, `text-muted`, `border-line`, `text-high-text` |
| CSS variables | `packages/ui/src/styles/base.css` | `var(--surface)`, `var(--ghost)` |
| TypeScript | `tokens` from `@specter/ui` | `tokens.ghost` |

| Token | Class | Value | Use |
| --- | --- | --- | --- |
| `bg` | `bg` | `#0D101B` | App background |
| `bgDeep` | `bg-deep` | `#080A12` | Behind popups and mock frames |
| `surface` | `surface` | `#191C2B` | Cards, popup, popovers |
| `surface2` | `surface-2` | `#232744` | Selected rows, hover |
| `inset` | `inset` | `#121528` | Inputs, quotes, nested cards |
| `ghost` | `ghost` | `#C7A7FF` | Accent, links, focus ring, primary button |
| `lavender` | `lavender` | `#8B6BC3` | Emphasis borders, toggle track (never small text) |
| `text` | `fg` | `#F4EAFF` | Primary text (`fg` avoids the class `text-text`) |
| `muted` | `muted` | `#BDB8CE` | Secondary text |
| `high` | `high` | `#DC4667` | High-concern borders and dots (never small text) |
| `highText` | `high-text` | `#FF9DB0` | High-concern text |
| `medium` | `medium` | `#E4B15C` | Medium border, dot and text |
| `ok` | `ok` | `#65BDA6` | Verified, connected |
| `line` | `line` | `#2E3252` | Dividers and borders |

Also in the preset: font families `font-display` (Fraunces), `font-sans` (Inter, the default) and
`font-mono` (JetBrains Mono); sizes `text-caption` to `text-h1`; radii `rounded-control` (12),
`rounded-card` (16), `rounded-quote` (10); and `shadow-float`.

## Fonts

Bundled through `@fontsource` (Fraunces 600, Inter 400/500/600, JetBrains Mono 400/500) and imported
by `base.css`. No font is loaded from the network.

## Contrast

`packages/core/test/contrast.test.ts` checks every text color (`text`, `muted`, `ghost`,
`highText`, `medium`, `ok`) on every background (`bg`, `surface`, `surface2`, `inset`) at 4.5:1,
the primary button (`bg` text on `ghost`) at 4.5:1, and the non-text parts (focus ring, lavender
and high borders, dots) at 3:1.

## Components

`packages/ui/src/primitives.tsx` has `Button` (primary, ghost, danger outline), `Link`,
`TextInput`, `SearchField`, `Card`, `SectionCard`, `StatCard`, `Tabs`, `IconButton` and `Icon`,
plus `AppShell` and `ErrorBoundary`. They use the new tokens but not yet the full component specs
in design steering §3 (Chip, Toggle, Segmented, SourceQuote and others are next).
