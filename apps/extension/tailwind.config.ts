import type { Config } from 'tailwindcss';
import preset from '@specter/ui/tailwind.preset';

/**
 * Extension Tailwind config. The token colors and font stacks come from the
 * shared preset in packages/ui (design section 5); only the content globs
 * are app-specific.
 */
const config: Config = {
  presets: [preset],
  content: [
    './entrypoints/**/*.{ts,tsx,html}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
