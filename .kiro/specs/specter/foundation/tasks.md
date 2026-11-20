# Implementation Plan: Spec 1 — Foundation

> Ordered implementation tasks for the Foundation spec. Check off each as it completes. Run the verification command at the bottom before marking the spec done.
>
> Status legend: `[x]` done · `[~]` partially done · `[ ]` not done

## Overview

This plan implements the Specter foundation: a pnpm monorepo, WXT-based Chrome MV3 extension shell, shared Zod schemas and types in `packages/core`, a Dexie local database, design tokens and UI primitives, and the empty-but-navigable shells of every surface. No AI pipeline, detection, or analysis logic is included — those arrive in later specs. The plan is organized into Phase A–J, followed by acceptance gates and a dependency graph for the remaining tasks.

## Tasks

### Phase A — Monorepo scaffold

- [x] 1.1 Create `pnpm-workspace.yaml` listing `apps/*` and `packages/*`.
  - Exists; lists `apps/*` and `packages/*`.
- [x] 1.2 Create root `package.json` with `packageManager` pinned, script aliases (`dev`,`build`,`typecheck`,`lint`,`test`), and dev dependencies for shared tooling (TypeScript, ESLint, Prettier, Vitest, Playwright).
  - `packageManager: pnpm@9.12.2`; scripts include `dev`,`build`,`typecheck`,`lint`,`test`,`format`; devDeps for TS, ESLint, Prettier, Vitest present. Playwright not yet installed — deferred to Spec 6/13.
- [x] 1.3 Create root `tsconfig.base.json` (strict, `noUnusedLocals`, `noUnusedParameters`, `composite`, paths for `@specter/*`).
  - Exists with all required flags and `@specter/*` path aliases.
- [x] 1.4 Create root `.nvmrc` (Node 20 LTS) and `.gitignore` (`node_modules`, `.output`, `dist`, coverage).
  - Both exist.
- [x] 1.5 Create ESLint flat config with `no-restricted-imports` enforcing package boundaries and a no-emoji rule; create `.prettierrc`.
  - `eslint.config.mjs` has `no-restricted-imports` for package boundaries, a custom `no-emoji` rule, and `no-console: error` for `packages/ai/**` and `**/secrets.ts`. `.prettierrc.json` exists.
- [x] 1.6 Create `CHANGELOG.md` at repo root initialized with an `Unreleased` section and version `0.0.0`.
  - Exists; now carries a `0.1.0` entry covering the foundation.

### Phase B — packages/core

- [x] 2.1 Create `packages/core/package.json` (name `@specter/core`, type module, `vitest` scripts) and `tsconfig.json` extending base.
  - Both exist; `@specter/core`, type module, vitest scripts.
- [x] 2.2 Create `packages/core/src/schema.ts` with Zod schemas and inferred types per design §6 (Concern, Category, Evidence, ClauseFinding, Consent, AgreementRecord).
  - All schemas + inferred types present: Concern, Category, Effect, Evidence, ClauseFinding, ConsentAction, EvidenceType, Consent, AgreementRecord. Matches design §6.
- [x] 2.3 Create `packages/core/src/index.ts` re-exporting all schemas and types.
  - Re-exports schema, tokens, privacy, contrast.
- [x] 2.4 Create `packages/core/src/privacy.ts` exporting `DEFAULT_EXCLUDED_DOMAINS`, `SENSITIVE_INPUT_SELECTORS`, `shouldAnalyze(host)`.
  - All three exported. `DEFAULT_EXCLUDED_DOMAINS` covers banking/health/email.
- [x] 2.5 Create `packages/core/src/contrast.ts` exporting `contrastRatio(fg, bg)` and `meetsWcagAa(ratio)`.
  - Both exported. Also `tokens.ts` with `DESIGN_TOKENS` and `TOKEN_PAIRS`.
- [x] 2.6 Create `packages/core/test/schema.test.ts` covering TEST-SCHEMA-01..03 (valid fixtures parse; invalid confidence, evidenceType, offset order rejected).
  - Covers TEST-SCHEMA-01..03.
- [x] 2.7 Create `packages/core/test/contrast.test.ts` covering TEST-TOK-01 for all declared token pairs.
  - Covers TEST-TOK-01 for all `TOKEN_PAIRS`.
- [x] 2.8 Run `pnpm --filter @specter/core test` and confirm green.
  - All 18 core tests (schema + contrast) pass via `pnpm -r run test`.

### Phase C — packages/ai (stub)

- [x] 3.1 Create `packages/ai/package.json` (`@specter/ai`) and `tsconfig.json`.
  - Both exist.
- [x] 3.2 Create `packages/ai/src/types.ts` defining a `Provider` interface (id, label, capabilities) and re-exporting schema types from `@specter/core`. No network code.
  - `Provider` interface (id, label, `supportsStructuredOutput`); also `AnalysisRequest`, `AnalysisResult`, `ConnectionStatus`, `PROVIDER_IDS`. Re-exports from `@specter/core`. No network code.
- [x] 3.3 Create `packages/ai/src/index.ts` exporting the interface. Document that implementations arrive in Spec 4.
  - Exports interface; documents Spec 4 for implementations.

### Phase D — packages/ui

- [~] 4.1 Create `packages/ui/package.json` (`@specter/ui`) and `tsconfig.json`; add React 18, Tailwind, clsx.
  - Both exist with React, Tailwind, clsx. **Deviation:** React is v19, not v18 — works but violates the tech rule. **Remaining:** align to React 18 if strict compliance is required.
- [x] 4.2 Create `packages/ui/src/tokens.ts` exporting the typed token object (design §5).
  - Re-exports `DESIGN_TOKENS` from `@specter/core`.
- [x] 4.3 Create `packages/ui/tailwind.preset.ts` extending Tailwind theme with token colors and the two fonts.
  - `packages/ui/tailwind.preset.ts` created (token colors + font stacks); exported as `@specter/ui/tailwind.preset`. `apps/extension/tailwind.config.ts` consumes it via `presets` and only declares `content` globs.
- [x] 4.4 Create `packages/ui/src/styles/base.css` with `:root` CSS custom properties for all tokens and `@font-face` for Fraunces and IBM Plex Sans (local `@fontsource` files).
  - `:root` custom properties plus `@fontsource` imports (local @font-face rules over bundled woff2) now live in `base.css`; the extension `styles.css` imports only the base sheet. Verified in the built bundle (all fonts under `assets/*.woff2`).
- [x] 4.5 Create primitives: `Button`, `Link`, `TextInput`, `SearchField`, `Card`, `Tabs`, `StatCard`, `SectionCard`, `IconButton`, `Icon` (inline stroke SVG with accessible name).
  - All primitives in `primitives.tsx`; `Icon` is inline stroke SVG with accessible name.
- [x] 4.6 Create `AppShell` layout component (header, "?" link affordance, focus-visible ring base, 44px targets).
  - `AppShell.tsx` — header, "?" help button via `onHelp` callback, focus-visible ring, 44px targets.
- [x] 4.7 Create `ErrorBoundary` calm fallback component.
  - `ErrorBoundary.tsx` — calm "Something went wrong" fallback + "Try again" button.

### Phase E — packages/help (stubs)

- [~] 5.1 Create `packages/help/package.json` (`@specter/help`) with a markdown loader.
  - `packages/help/package.json` (`@specter/help`) exists. **Missing:** no markdown loader — uses a TS catalog approach instead. **Remaining:** add a markdown loader if markdown sourcing is still desired.
- [~] 5.2 Create stub markdown files with front-matter (`title`, `category`, `description`) for each Part 5 article; bodies are TODO placeholders.
  - **Different approach.** No markdown stub files; instead `packages/help/src/index.ts` has a TS catalog (`HELP_ARTICLES` array with slug/title/category/description for all Part 5 articles, plus `HELP_CATEGORIES`). Functional. **Remaining:** if markdown files with front-matter are still required, create them; otherwise update the task/design to accept the TS catalog.

### Phase F — apps/extension: WXT setup

- [x] 6.1 Create `apps/extension/package.json` (`@specter/extension`) with WXT, wxt-react, dexie, zustand, zod.
  - Exists with WXT, `@wxt-dev/module-react`, dexie, zustand, zod; Vite pinned to `^6.3.4` with `@vitejs/plugin-react` `^5.0.0` (WXT 0.21 requires Vite 6).
- [x] 6.2 Create `apps/extension/wxt.config.ts` per design §4 (MV3, permissions, optional_host_permissions, entrypoints, no remote).
  - `optional_host_permissions` scoped to `http://*/*`, `https://*/*`; each grant is per site at runtime via `chrome.permissions`. Built manifest verified to contain no `<all_urls>` (FR-WXT-03).
- [x] 6.3 Create `apps/extension/tsconfig.json` extending base with JSX and WXT types.
  - Exists; extends base with JSX and WXT types.
- [x] 6.4 Create `apps/extension/entrypoints/background.ts` service worker with a `get-status` ping handler.
  - `ping`/`get-status` handlers registered in `background.ts` via the typed message bus, alongside the side-panel behavior and install handlers.
- [x] 6.5 Create `apps/extension/entrypoints/content.ts` that mounts a single Shadow DOM root and registers a message listener (renders nothing visible).
  - Mounts Shadow DOM root (`registration: 'runtime'`, `pointer-events:none`, renders nothing visible). Spec 2 will register the script per site on demand.

### Phase G — apps/extension: data layer

- [x] 7.1 Create `apps/extension/src/db/database.ts` Dexie schema per design §7.
  - `agreements`, `versions`, `settings`, `dismissedTips` stores with correct indexes.
- [x] 7.2 Create `apps/extension/src/store/settings.ts` Zustand store hydrated from Dexie `settings` (hauntingLevel, reduceMotion, excludedDomains, providerId, onboardingComplete).
  - Store hydrates from the Dexie `settings` table on surface mount (via `mount.tsx`) and persists on change; `prefers-reduced-motion` honoured when nothing is saved (FR-TOK-06). Cross-surface live sync is deferred.
- [x] 7.3 Create `apps/extension/src/store/sidepanel.ts` Zustand store with `status` states `idle | detected | analyzing | results`.
  - `status: idle|detected|analyzing|results` and `activeTab: findings|evidence|ask`.
- [x] 7.4 Create `apps/extension/src/secrets.ts` helper (get/set/clear in `chrome.storage.local` only).
  - get/set/clear in `chrome.storage.local` only; no logging.
- [x] 7.5 Create `apps/extension/src/messaging.ts` typed message bus (ping/pong, get-status only).
  - Typed bus with ping/pong/get-status/status; `sendMessage` and `onMessage` helpers.

### Phase H — apps/extension: surface shells

- [x] 8.1 Create `apps/extension/entrypoints/sidepanel/` (html + `SidePanel.tsx`) per design §9 idle state + placeholder tabs.
  - `sidepanel/App.tsx` — idle state "No agreement detected on this page." + "Analyze this page anyway" button. Tabs: Findings, Evidence, Ask Specter.
- [x] 8.2 Create `apps/extension/entrypoints/graveyard/` (html + `Graveyard.tsx`) shell.
  - `graveyard/App.tsx` — search field, 3 StatCards, empty records list.
- [x] 8.3 Create `apps/extension/entrypoints/options/` (html + `Options.tsx`) shell with seven placeholder sections.
  - `options/App.tsx` — 7 SectionCards (AI provider, Haunting level, Site access, Excluded domains, Data export, Delete all, Replay onboarding).
- [~] 8.4 Create `apps/extension/entrypoints/onboarding/` (html + `Onboarding.tsx`) welcome placeholder.
  - `onboarding/App.tsx` — headline "See what haunts your digital life." **Minor discrepancy:** "Begin" button is enabled (navigates to graveyard); FR-SURF-05 says disabled until foundation present. **Remaining:** disable "Begin" until the foundation check passes, or update the requirement.
- [x] 8.5 Create `apps/extension/entrypoints/help/` (html + `HelpCenter.tsx`) shell with category headings.
  - `help/App.tsx` — search input + category headings from `HELP_CATEGORIES`.
- [x] 8.6 Create a shared `nav.ts` helper to open extension tabs via `chrome.tabs.create`.
  - `nav.ts` with `openTab(page)` and `focusOrCreateTab(page)`; `pages.ts` with `SpecterPage` type.

### Phase I — Privacy & a11y wiring

- [x] 9.1 Wire `DEFAULT_EXCLUDED_DOMAINS` into the Options shell display (read-only list).
  - Shown as a read-only list in Options.
- [~] 9.2 Add an ESLint rule + test that forbids `console.*` in `packages/ai` and any `secrets.ts`.
  - ESLint config has `no-console: error` for `packages/ai/**` and `**/secrets.ts`. **Missing:** no separate test asserting the rule fires. **Remaining:** add a lint-rule test or accept config-only enforcement.
- [x] 9.3 Verify all primitives expose 44px targets and visible focus rings.
  - All primitives enforce `min-h-[44px]` and `focusRing` classes.

### Phase J — Verification

- [x] 10.1 Run `pnpm typecheck` and fix all errors until exit zero.
  - `pnpm -r run typecheck` exits zero across all workspaces (after fixing the `content.ts` registration typing and the side panel tab callback).
- [x] 10.2 Run `pnpm lint` until clean.
  - `pnpm -w run lint` exits zero (after adding `argsIgnorePattern: '^_'` to the ESLint config).
- [x] 10.3 Run `pnpm test` (core schema + contrast tests) until green.
  - 19 tests pass: 18 core (schema + contrast) + 1 extension Dexie round-trip.
- [x] 10.4 Run `pnpm build` and confirm `.output/` is produced.
  - `pnpm build` produces `.output/chrome-mv3` (all 5 HTML surfaces, background, content script, fonts bundled locally; built with Vite 6.4.6).
- [ ] 10.5 Load `.output/chrome-mv3` unpacked in Chrome; open side panel; confirm no console errors.
  - **Not done.** Manual Chrome verification not performed. **Remaining:** load unpacked, open side panel, confirm clean console.
- [ ] 10.6 Open each extension tab (Graveyard, Options, Onboarding, Help); confirm each renders its shell.
  - **Not done.** **Remaining:** open each tab and confirm shells render.
- [x] 10.7 Inspect the built `manifest.json`; confirm no `<all_urls>` host permission and no remote CSP entries.
  - Built manifest verified: `optional_host_permissions: ["http://*/*","https://*/*"]`, no `<all_urls>`, default MV3 CSP, no remote entries, fonts local.
- [x] 10.8 Update `CHANGELOG.md` under `Unreleased` with the foundation completion notes.
  - CHANGELOG carries a `0.1.0` entry covering the foundation; the wave-0 fixes land under a fresh `Unreleased` section.

## Acceptance gates

Spec 1 is complete only when all Phase J checks pass and the acceptance criteria in `requirements.md` §6 are satisfied:
1. `pnpm typecheck` exits zero across all workspaces. — _satisfied (10.1)_
2. `pnpm build` produces a loadable extension. — _satisfied (10.4)_
3. Extension loads unpacked; side panel opens with no console errors. — _blocked on 10.5_
4. Graveyard, Options, Onboarding, Help tabs each open to a non-empty shell. — _blocked on 10.6_
5. Shared types and Zod schemas compile; fixture-based schema tests pass. — _satisfied (10.3)_
6. Dexie opens on a fresh profile and round-trips an `AgreementRecord`. — _satisfied in tests (10.3); browser runtime check pending 10.5_
7. No `<all_urls>` host permission in the built manifest. — _satisfied (10.7)_
8. No remote font/script or non-provider network request in the bundle. — _satisfied (10.4/10.7)_
9. Default excluded-domains list includes banking, health, email. — _satisfied (2.4/9.1)_

### Open items before the spec can close

- **4.1:** decide whether React 19 is acceptable or must downgrade to React 18.
- **5.1 / 5.2:** decide whether markdown stub files are required or the TS catalog suffices.
- **8.4:** align the Onboarding "Begin" button state with FR-SURF-05.
- **9.2:** add a test for the `no-console` ESLint rule or accept config-only enforcement.
- **10.5 / 10.6:** load the built extension in Chrome, open the side panel and every extension tab, confirm clean console and rendered shells.

## Notes

- Tasks marked `[x]` are implemented; `[~]` are partially done with remaining work noted; `[ ]` are not done.
- Phases A–I are implemented except the decision points above; Phase J is fully green except the manual Chrome checks.
- The build toolchain required a dependency repair (Vite 6 + `@vitejs/plugin-react` 5 replacing a broken pin) before any verification could run.
- Each remaining task references the requirement it satisfies via the phase notes above.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["4.1", "5.1", "5.2", "8.4", "9.2"] },
    { "id": 1, "tasks": ["10.5", "10.6"] }
  ]
}
```