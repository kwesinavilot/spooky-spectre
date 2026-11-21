import { defineConfig } from 'vitest/config';

/**
 * DOM tests (detection, extraction) run in happy-dom; everything else in
 * Node. The corpus run has its own config (vitest.corpus.config.ts) so the
 * default test run does not depend on saved real-world pages.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/corpus/**', 'node_modules/**'],
    environmentMatchGlobs: [
      ['test/detect/**', 'happy-dom'],
      ['test/extract/**', 'happy-dom'],
    ],
  },
});
