import { describe, it, expect } from 'vitest';
import { contrastRatio, meetsWcagAa } from '../src/contrast';
import { TOKEN_PAIRS, UI_COMPONENT_PAIRS } from '../src/tokens';

describe('text tokens meet WCAG AA 4.5:1 (TEST-TOK-01)', () => {
  for (const pair of TOKEN_PAIRS) {
    it(pair.name, () => {
      const ratio = contrastRatio(pair.fg, pair.bg);
      expect(meetsWcagAa(ratio), `ratio was ${ratio.toFixed(2)}`).toBe(true);
    });
  }
});

describe('UI component tokens meet 3:1 (WCAG 1.4.11)', () => {
  for (const pair of UI_COMPONENT_PAIRS) {
    it(pair.name, () => {
      const ratio = contrastRatio(pair.fg, pair.bg);
      expect(ratio, `ratio was ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(3);
    });
  }
});
