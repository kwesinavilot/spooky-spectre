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

All in `@specter/ui` (`packages/ui/src/primitives.tsx` and `components.tsx`), built to design
steering §3. Every interactive part is a real `button`, `input`, `select`, `a` or `label`, has a
44px target and shows the 2px `--ghost` focus ring.

| Component | Notes |
| --- | --- |
| `Button` | Variants `primary` (ghost fill, dark text), `secondary` (lavender border), `quiet` (line border, muted), `danger` (high border, high-text label); `block` for full width |
| `IconButton` | 44x44, line border, muted icon; `label` is required and becomes `aria-label` |
| `Icon` | Inline stroke SVG, stroke 1.8, 20px. Decorative (`aria-hidden`) unless `label` is passed |
| `Chip` | Pill status label: `neutral`, `ghost`, `high` (uses `high-text`), `medium`, `ok` |
| `Card`, `InsetCard`, `SectionCard`, `StatCard` | Card variants `default`, `high`, `medium`, `ok`, `dashed` |
| `TextInput`, `Select`, `SearchField` | Visible label always (search uses a screen-reader-only label); `mono` for keys |
| `Toggle` | `role="switch"` with `aria-checked`, 52x44 hit area, text label beside it |
| `OptionCard` | A real radio in a bordered row |
| `Segmented` | `role="radiogroup"` of radio buttons |
| `SourceQuote` | Quote as text in JetBrains Mono, matched passage in `<mark>`; never HTML |
| `DiffText` | Removed is struck through, added is underlined, with screen-reader prefixes |
| `ProgressStepper` | 6px bar plus steps (done, running, waiting), `aria-live="polite"`, no bar animation under reduced motion |
| `Logo`, `PanelHeader`, `PanelNav` | Ghost glyph plus "Specter"; side panel header with back arrow; 64px bottom nav with the active tab in `--ghost` and a 2px top line |
| `Tabs` | Simple horizontal tabs for full-page surfaces |
| `AppShell` | Full-page layout: logo, page title, Help button, 960px content |

Deviation from the steering: `Segmented` segments are 44px high instead of 40px, so every target
meets the 44px minimum.

Not built yet: `FindingCard` (Spec 6) and `MiniChrome` (onboarding, Spec 7).
