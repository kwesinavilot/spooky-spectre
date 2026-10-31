/**
 * Canonical design token values. Source of truth for colors and for the
 * text/background pairings that the contrast test enforces (FR-TOK-04 / TEST-TOK-01).
 * `packages/ui` re-exports this object; Tailwind reads it from there.
 */
export const DESIGN_TOKENS = {
  ink: '#0E0B14',
  panel: '#14101D',
  border: '#2B2340',
  violet: '#8B5CF6',
  paleViolet: '#C9B5FF',
  blood: '#F0506E',
  amber: '#F5B84B',
  verified: '#7FE0AD',
  text: '#E9E4F2',
  muted: '#A79FBA',
} as const;

export type TokenName = keyof typeof DESIGN_TOKENS;

/**
 * Realistic text-on-background pairings that MUST meet WCAG AA 4.5:1.
 * Violet is an accent/background color (used with ink text), never body text on panel.
 */
export const TOKEN_PAIRS: { name: string; fg: string; bg: string }[] = [
  { name: 'text on ink', fg: DESIGN_TOKENS.text, bg: DESIGN_TOKENS.ink },
  { name: 'text on panel', fg: DESIGN_TOKENS.text, bg: DESIGN_TOKENS.panel },
  { name: 'muted on ink', fg: DESIGN_TOKENS.muted, bg: DESIGN_TOKENS.ink },
  { name: 'muted on panel', fg: DESIGN_TOKENS.muted, bg: DESIGN_TOKENS.panel },
  { name: 'pale-violet on ink', fg: DESIGN_TOKENS.paleViolet, bg: DESIGN_TOKENS.ink },
  { name: 'pale-violet on panel', fg: DESIGN_TOKENS.paleViolet, bg: DESIGN_TOKENS.panel },
  { name: 'ink on violet', fg: DESIGN_TOKENS.ink, bg: DESIGN_TOKENS.violet },
  { name: 'blood on ink', fg: DESIGN_TOKENS.blood, bg: DESIGN_TOKENS.ink },
  { name: 'blood on panel', fg: DESIGN_TOKENS.blood, bg: DESIGN_TOKENS.panel },
  { name: 'amber on ink', fg: DESIGN_TOKENS.amber, bg: DESIGN_TOKENS.ink },
  { name: 'amber on panel', fg: DESIGN_TOKENS.amber, bg: DESIGN_TOKENS.panel },
  { name: 'verified on ink', fg: DESIGN_TOKENS.verified, bg: DESIGN_TOKENS.ink },
  { name: 'verified on panel', fg: DESIGN_TOKENS.verified, bg: DESIGN_TOKENS.panel },
];
