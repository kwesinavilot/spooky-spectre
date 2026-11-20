import type { Config } from 'tailwindcss';
import { tokens } from './src/tokens';

/**
 * Shared Tailwind preset (design section 5). The token colors and the two
 * font stacks are declared once here; consuming apps add their own
 * `content` globs on top of this preset.
 */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        'specter-ink': tokens.ink,
        'specter-panel': tokens.panel,
        'specter-line': tokens.border,
        'specter-violet': tokens.violet,
        'specter-pale-violet': tokens.paleViolet,
        'specter-blood': tokens.blood,
        'specter-amber': tokens.amber,
        'specter-verified': tokens.verified,
        'specter-text': tokens.text,
        'specter-muted': tokens.muted,
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
      },
    },
  },
};

export default preset;
