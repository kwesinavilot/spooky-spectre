import type { Config } from 'tailwindcss';
import { tokens } from './src/tokens';

/**
 * Shared Tailwind preset (design steering section 2). Colors, fonts and radii
 * are declared once here; consuming apps add their own `content` globs.
 * Class names follow the token names: bg-bg, bg-surface, text-fg, text-muted,
 * border-line, text-high-text, and so on.
 */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        bg: tokens.bg,
        'bg-deep': tokens.bgDeep,
        surface: tokens.surface,
        'surface-2': tokens.surface2,
        inset: tokens.inset,
        ghost: tokens.ghost,
        lavender: tokens.lavender,
        fg: tokens.text,
        muted: tokens.muted,
        high: tokens.high,
        'high-text': tokens.highText,
        medium: tokens.medium,
        ok: tokens.ok,
        line: tokens.line,
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        caption: ['12px', '1.4'],
        small: ['13px', '1.45'],
        body: ['14px', '1.5'],
        h4: ['14px', '1.3'],
        h3: ['16px', '1.3'],
        h2: ['30px', '1.15'],
        h1: ['44px', '1.08'],
      },
      borderRadius: {
        control: '12px',
        card: '16px',
        quote: '10px',
      },
      boxShadow: {
        float: '0 18px 40px rgba(0,0,0,.45)',
      },
    },
  },
};

export default preset;
