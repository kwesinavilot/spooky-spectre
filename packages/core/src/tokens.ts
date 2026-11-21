/**
 * Canonical design token values (design steering section 2). Source of truth
 * for colors and for the pairings the contrast test enforces. `packages/ui`
 * re-exports this object; the Tailwind preset and the CSS variables read it.
 */
export const DESIGN_TOKENS = {
  bg: '#0D101B',
  bgDeep: '#080A12',
  surface: '#191C2B',
  surface2: '#232744',
  inset: '#121528',
  /** Primary accent, links, focus ring, primary button fill. */
  ghost: '#C7A7FF',
  /** Emphasis borders and the toggle track. Not for small text. */
  lavender: '#8B6BC3',
  text: '#F4EAFF',
  muted: '#BDB8CE',
  /** High-concern borders and dots. Not for small text; use highText. */
  high: '#DC4667',
  highText: '#FF9DB0',
  medium: '#E4B15C',
  ok: '#65BDA6',
  line: '#2E3252',
} as const;

export type TokenName = keyof typeof DESIGN_TOKENS;

const T = DESIGN_TOKENS;
const BACKGROUNDS = { bg: T.bg, surface: T.surface, surface2: T.surface2, inset: T.inset } as const;

/** Text colors that must reach 4.5:1 on every background they are used on. */
const TEXT_COLORS = {
  text: T.text,
  muted: T.muted,
  ghost: T.ghost,
  highText: T.highText,
  medium: T.medium,
  ok: T.ok,
} as const;

export const TOKEN_PAIRS: { name: string; fg: string; bg: string }[] = [
  ...Object.entries(TEXT_COLORS).flatMap(([fgName, fg]) =>
    Object.entries(BACKGROUNDS).map(([bgName, bg]) => ({ name: `${fgName} on ${bgName}`, fg, bg })),
  ),
  // Primary button: --bg text on --ghost fill.
  { name: 'bg on ghost (primary button)', fg: T.bg, bg: T.ghost },
];

/** Non-text UI parts (borders, focus ring, toggle track, dots) need 3:1 (WCAG 1.4.11). */
export const UI_COMPONENT_PAIRS: { name: string; fg: string; bg: string }[] = [
  { name: 'ghost focus ring on bg', fg: T.ghost, bg: T.bg },
  { name: 'ghost focus ring on surface', fg: T.ghost, bg: T.surface },
  { name: 'lavender border on bg', fg: T.lavender, bg: T.bg },
  { name: 'lavender border on surface', fg: T.lavender, bg: T.surface },
  { name: 'high border on bg', fg: T.high, bg: T.bg },
  { name: 'high border on surface', fg: T.high, bg: T.surface },
  { name: 'medium dot on bg', fg: T.medium, bg: T.bg },
  { name: 'ok dot on surface', fg: T.ok, bg: T.surface },
];
