import { defineConfig } from 'vitest/config';

/** Corpus run (pnpm corpus:report): real saved pages, kept out of the default test run. */
export default defineConfig({
  test: {
    include: ['test/corpus/**/*.test.ts'],
    environment: 'happy-dom',
    // Saved pages reference stylesheets, images and frames on their sites; never fetch them.
    environmentOptions: {
      happyDOM: {
        settings: {
          disableJavaScriptFileLoading: true,
          disableJavaScriptEvaluation: true,
          disableCSSFileLoading: true,
          disableIframePageLoading: true,
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
    testTimeout: 120_000,
  },
});
