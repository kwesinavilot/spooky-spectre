import type { Config } from 'tailwindcss';
import { tokens } from '../../packages/ui/src/tokens';

const config: Config = {
  content: [
    './entrypoints/**/*.{ts,tsx,html}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
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
  plugins: [],
};

export default config;
