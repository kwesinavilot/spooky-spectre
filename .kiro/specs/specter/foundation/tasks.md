# Spec 1 — Foundation (Tasks)

> Ordered implementation tasks for the Foundation spec. Check off each as it completes. Run the verification command at the bottom before marking the spec done.

## Phase A — Monorepo scaffold

- [ ] A1. Create `pnpm-workspace.yaml` listing `apps/*` and `packages/*`.
- [ ] A2. Create root `package.json` with `packageManager` pinned, script aliases (`dev`,`build`,`typecheck`,`lint`,`test`), and dev dependencies for shared tooling (TypeScript, ESLint, Prettier, Vitest, Playwright).
- [ ] A3. Create root `tsconfig.base.json` (strict, `noUnusedLocals`, `noUnusedParameters`, `composite`, paths for `@specter/*`).
- [ ] A4. Create root `.nvmrc` (Node 20 LTS) and `.gitignore` (`node_modules`, `.output`, `dist`, coverage).
- [ ] A5. Create ESLint flat config with `no-restricted-imports` enforcing package boundaries and a no-emoji rule; create `.prettierrc`.
- [ ] A6. Create `CHANGELOG.md` at repo root initialized with an `Unreleased` section and version `0.0.0`.

## Phase B — packages/core

- [ ] B1. Create `packages/core/package.json` (name `@specter/core`, type module, `vitest` scripts) and `tsconfig.json` extending base.
- [ ] B2. Create `packages/core/src/schema.ts` with Zod schemas and inferred types per design §6 (Concern, Category, Evidence, ClauseFinding, Consent, AgreementRecord).
- [ ] B3. Create `packages/core/src/index.ts` re-exporting all schemas and types.
- [ ] B4. Create `packages/core/src/privacy.ts` exporting `DEFAULT_EXCLUDED_DOMAINS`, `SENSITIVE_INPUT_SELECTORS`, `shouldAnalyze(host)`.
- [ ] B5. Create `packages/core/src/contrast.ts` exporting `contrastRatio(fg, bg)` and `meetsWcagAa(ratio)`.
- [ ] B6. Create `packages/core/test/schema.test.ts` covering TEST-SCHEMA-01..03 (valid fixtures parse; invalid confidence, evidenceType, offset order rejected).
- [ ] B7. Create `packages/core/test/contrast.test.ts` covering TEST-TOK-01 for all declared token pairs.
- [ ] B8. Run `pnpm --filter @specter/core test` and confirm green.

## Phase C — packages/ai (stub)

- [ ] C1. Create `packages/ai/package.json` (`@specter/ai`) and `tsconfig.json`.
- [ ] C2. Create `packages/ai/src/types.ts` defining a `Provider` interface (id, label, capabilities) and re-exporting schema types from `@specter/core`. No network code.
- [ ] C3. Create `packages/ai/src/index.ts` exporting the interface. Document that implementations arrive in Spec 4.

## Phase D — packages/ui

- [ ] D1. Create `packages/ui/package.json` (`@specter/ui`) and `tsconfig.json`; add React 18, Tailwind, clsx.
- [ ] D2. Create `packages/ui/src/tokens.ts` exporting the typed token object (design §5).
- [ ] D3. Create `packages/ui/tailwind.preset.ts` extending Tailwind theme with token colors and the two fonts.
- [ ] D4. Create `packages/ui/src/styles/base.css` with `:root` CSS custom properties for all tokens and `@font-face` for Fraunces and IBM Plex Sans (local `@fontsource` files).
- [ ] D5. Create primitives: `Button`, `Link`, `TextInput`, `SearchField`, `Card`, `Tabs`, `StatCard`, `SectionCard`, `IconButton`, `Icon` (inline stroke SVG with accessible name).
- [ ] D6. Create `AppShell` layout component (header, "?" link affordance, focus-visible ring base, 44px targets).
- [ ] D7. Create `ErrorBoundary` calm fallback component.

## Phase E — packages/help (stubs)

- [ ] E1. Create `packages/help/package.json` (`@specter/help`) with a markdown loader.
- [ ] E2. Create stub markdown files with front-matter (`title`, `category`, `description`) for each Part 5 article; bodies are TODO placeholders.

## Phase F — apps/extension: WXT setup

- [ ] F1. Create `apps/extension/package.json` (`@specter/extension`) with WXT, wxt-react, dexie, zustand, zod.
- [ ] F2. Create `apps/extension/wxt.config.ts` per design §4 (MV3, permissions, optional_host_permissions, entrypoints, no remote).
- [ ] F3. Create `apps/extension/tsconfig.json` extending base with JSX and WXT types.
- [ ] F4. Create `apps/extension/entrypoints/background.ts` service worker with a `get-status` ping handler.
- [ ] F5. Create `apps/extension/entrypoints/content.ts` that mounts a single Shadow DOM root and registers a message listener (renders nothing visible).

## Phase G — apps/extension: data layer

- [ ] G1. Create `apps/extension/src/db/database.ts` Dexie schema per design §7.
- [ ] G2. Create `apps/extension/src/store/settings.ts` Zustand store hydrated from Dexie `settings` (hauntingLevel, reduceMotion, excludedDomains, providerId, onboardingComplete).
- [ ] G3. Create `apps/extension/src/store/sidepanel.ts` Zustand store with `status` states `idle | detected | analyzing | results`.
- [ ] G4. Create `apps/extension/src/secrets.ts` helper (get/set/clear in `chrome.storage.local` only).
- [ ] G5. Create `apps/extension/src/messaging.ts` typed message bus (ping/pong, get-status only).

## Phase H — apps/extension: surface shells

- [ ] H1. Create `apps/extension/entrypoints/sidepanel/` (html + `SidePanel.tsx`) per design §9 idle state + placeholder tabs.
- [ ] H2. Create `apps/extension/entrypoints/graveyard/` (html + `Graveyard.tsx`) shell.
- [ ] H3. Create `apps/extension/entrypoints/options/` (html + `Options.tsx`) shell with seven placeholder sections.
- [ ] H4. Create `apps/extension/entrypoints/onboarding/` (html + `Onboarding.tsx`) welcome placeholder.
- [ ] H5. Create `apps/extension/entrypoints/help/` (html + `HelpCenter.tsx`) shell with category headings.
- [ ] H6. Create a shared `nav.ts` helper to open extension tabs via `chrome.tabs.create`.

## Phase I — Privacy & a11y wiring

- [ ] I1. Wire `DEFAULT_EXCLUDED_DOMAINS` into the Options shell display (read-only list).
- [ ] I2. Add an ESLint rule + test that forbids `console.*` in `packages/ai` and any `secrets.ts`.
- [ ] I3. Verify all primitives expose 44px targets and visible focus rings.

## Phase J — Verification

- [ ] J1. Run `pnpm typecheck` and fix all errors until exit zero.
- [ ] J2. Run `pnpm lint` until clean.
- [ ] J3. Run `pnpm test` (core schema + contrast tests) until green.
- [ ] J4. Run `pnpm build` and confirm `.output/` is produced.
- [ ] J5. Load `.output/chrome-mv3` unpacked in Chrome; open side panel; confirm no console errors.
- [ ] J6. Open each extension tab (Graveyard, Options, Onboarding, Help); confirm each renders its shell.
- [ ] J7. Inspect the built `manifest.json`; confirm no `<all_urls>` host permission and no remote CSP entries.
- [ ] J8. Update `CHANGELOG.md` under `Unreleased` with the foundation completion notes.

## Acceptance gates

Spec 1 is complete only when all Phase J checks pass and the acceptance criteria in `requirements.md` §6 are satisfied:
1. `pnpm typecheck` exits zero across all workspaces.
2. `pnpm build` produces a loadable extension.
3. Extension loads unpacked; side panel opens with no console errors.
4. Graveyard, Options, Onboarding, Help tabs each open to a non-empty shell.
5. Shared types and Zod schemas compile; fixture-based schema tests pass.
6. Dexie opens on a fresh profile and round-trips an `AgreementRecord`.
7. No `<all_urls>` host permission in the built manifest.
8. No remote font/script or non-provider network request in the bundle.
9. Default excluded-domains list includes banking, health, email.
