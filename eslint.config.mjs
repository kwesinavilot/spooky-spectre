import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Local rule: no emoji as affordances in source (FR-A11Y-04).
 * Range-based so common symbols like © and ® are not flagged.
 */
const noEmoji = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: { emoji: 'Emoji are not allowed in source code.' },
  },
  create(context) {
    const re = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u
    const check = (node, value) => {
      if (typeof value === 'string' && re.test(value)) {
        context.report({ node, messageId: 'emoji' })
      }
    }
    return {
      Literal(node) {
        check(node, node.value)
      },
      TemplateElement(node) {
        check(node, node.value.raw)
      },
      JSXText(node) {
        check(node, node.value)
      },
    }
  },
}

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/.wxt/**',
      '**/coverage/**',
      '**/*.config.{js,mjs,ts}',
      'eslint.config.mjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@specter/ai', message: 'packages/core must not depend on other specter packages.' },
            { name: '@specter/ui', message: 'packages/core must not depend on other specter packages.' },
            { name: '@specter/help', message: 'packages/core must not depend on other specter packages.' },
            { name: '@specter/extension', message: 'packages/core must not depend on other specter packages.' },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ai/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@specter/ui', message: 'packages/ai may only depend on packages/core.' },
            { name: '@specter/help', message: 'packages/ai may only depend on packages/core.' },
            { name: '@specter/extension', message: 'packages/ai may only depend on packages/core.' },
          ],
        },
      ],
      'no-console': 'error',
    },
  },
  {
    files: ['packages/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@specter/ai', message: 'packages/ui may only depend on packages/core.' },
            { name: '@specter/help', message: 'packages/ui may only depend on packages/core.' },
            { name: '@specter/extension', message: 'packages/ui may only depend on packages/core.' },
          ],
        },
      ],
    },
  },
  {
    files: ['**/secrets.ts'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    plugins: { specter: { rules: { 'no-emoji': noEmoji } } },
    rules: { 'specter/no-emoji': 'error' },
  },
)
