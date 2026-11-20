# Release Update Report

- **Date:** 2026-10-31
- **Branch:** `main`
- **Commits since last release:** 2 (no tags exist; full history used)
- **Current version (package.json):** 0.0.0

## Chosen version: v0.1.0

- **Bump type:** minor
- **Justification:** No tags and no prior released version exist. The current version is 0.0.0
  (pre-release placeholder). The latest commit (`85e76a7`, "set up foundation and run tests")
  is a feature-scale change: it introduces the pnpm monorepo, all workspace packages
  (`packages/core`, `packages/ai`, `packages/ui`, `packages/help`), the WXT-based
  `apps/extension` with all entrypoints, the Dexie database schema, Zod schemas, stores,
  and passing unit tests. Per semver, a new feature on 0.0.0 yields 0.1.0. There are no
  breaking changes (nothing shipped before), and this is more than a patch because it adds
  the first working feature surface. This also aligns with the versioning plan in
  CHANGELOG.md, where each completed spec increments the minor within the 0.x line.

## Categorized changes (from `git log` / `git diff ee758f8..HEAD`, 73 files, ~7049 insertions)

### Added
- pnpm workspace with root tooling: ESLint (flat config), Prettier, TypeScript base config,
  `.nvmrc`, `.gitignore`, `.prettierignore`, test scripts.
- `packages/core`: Zod schemas (`schema.ts`), design tokens (`tokens.ts`), contrast
  utilities (`contrast.ts`), privacy helpers (`privacy.ts`), plus Vitest unit tests for
  schema and contrast.
- `packages/ai`: provider type definitions and package shell.
- `packages/ui`: `AppShell`, `ErrorBoundary`, UI primitives with inline stroke SVG icons,
  base styles and tokens.
- `packages/help`: help content index module.
- `apps/extension` (WXT, MV3, React 18, Tailwind): entrypoints for background, content,
  sidepanel, options, onboarding, graveyard, help; Dexie database setup; message bus;
  settings and sidepanel Zustand stores; secrets handling via `chrome.storage.local`;
  extension icons; manifest config.

### Changed
- Initial repository state only; no pre-existing code was modified (nothing existed).

### Fixed
- None recorded.

### Removed
- None.

### Chores / Docs
- `ee758f8` — chore: add Kiro hooks, specs, and steering documentation (governance files,
  Foundation spec requirements/design/tasks, save-time hooks).
- `85e76a7` (docs portion) — root README/config scaffolding and lockfile.

## Commit list
- `85e76a7` set up foundation and run tests
- `ee758f8` chore: add Kiro hooks, specs, and steering documentation
