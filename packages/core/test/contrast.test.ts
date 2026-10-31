import { describe, it, expect } from 'vitest';
import { contrastRatio, meetsWcagAa } from '../src/contrast';
import { TOKEN_PAIRS } from '../src/tokens';

describe('token contrast meets WCAG AA 4.5:1 (TEST-TOK-01)', () => {
  for (const pair of TOKEN_PAIRS) {
    it(`${pair.name}`, () => {
      const ratio = contrastRatio(pair.fg, pair.bg);
      expect(meetsWcagAa(ratio), `ratio was ${ratio.toFixed(2)}`).toBe(true);
    });
  }
});
