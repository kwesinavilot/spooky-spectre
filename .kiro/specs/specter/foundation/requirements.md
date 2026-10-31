# Spec 1 — Foundation (Requirements)

> Scope: monorepo, WXT setup, shared types and Zod schemas, Dexie schema, design tokens, and the empty shells of every surface. The AI analysis pipeline is explicitly **out of scope** for this spec.

## 1. Overview

Specter is a Chrome Manifest V3 extension with a local dashboard ("the Graveyard"). This spec builds the load-bearing foundation that every later spec depends on: a strict TypeScript monorepo, a WXT extension that loads in Chrome, the shared type and schema layer, the local database schema, the design token system, and the empty-but-navigable shells of all surfaces. No AI analysis, detection, segmentation, validation or diff logic is implemented here.

## 2. Out of scope (deferred to later specs)

- Agreement detection, extraction and segmentation (Spec 2, Spec 3).
- The AI provider layer, BYOK and cost estimation (Spec 4).
- Clause analysis, evidence validation and retry (Spec 5).
- Finding rendering, Shadow DOM overlays and visual effects (Spec 6).
- Onboarding flow content and interactive tutorial (Spec 7).
- Saving, consent records and Graveyard logic (Spec 8).
- Haunting Timeline diffing (Spec 9).
- Ask Specter retrieval (Spec 10).
- Reminders via chrome.alarms (Spec 11).
- Help Center articles and coach marks (Spec 12).
- Final accessibility, polish and performance pass (Spec 13).

> The shells created here for those surfaces must exist and open, but contain only placeholder content wired to the real navigation and layout.

## 3. Functional requirements

Requirements are written in EARS. Each has a stable id for traceability.

### 3.1 Monorepo and tooling

- **FR-MONO-01** The repository shall be a pnpm workspace containing the workspaces `apps/extension`, `packages/core`, `packages/ai`, `packages/ui`, and `packages/help`.
- **FR-MONO-02** Every TypeScript package shall compile in strict mode with `noUnusedLocals` and `noUnusedParameters` enabled.
- **FR-MONO-03** Where a workspace contains pure logic, that workspace shall include a Vitest configuration and at least one passing unit test.
- **FR-MONO-04** When a developer runs `pnpm typecheck` at the repository root, the repository shall typecheck every workspace and exit non-zero on any error.
- **FR-MONO-05** When a developer runs `pnpm build` at the repository root, the repository shall build the extension package into a loadable `.output/` directory.
- **FR-MONO-06** The repository root shall declare the script aliases `typecheck`, `lint`, `test`, `build`, and `dev` that dispatch to the relevant workspaces.
- **FR-MONO-07** The repository shall pin Node, pnpm, and dependency versions so that builds are reproducible.

### 3.2 WXT extension shell

- **FR-WXT-01** The extension shall target Chrome Manifest V3 using WXT.
- **FR-WXT-02** The extension manifest shall declare only the permissions `activeTab`, `storage`, `sidePanel`, `scripting`, `alarms`, and `notifications`.
- **FR-WXT-03** The extension manifest shall not request `<all_urls>` host access by default; host access shall be declared under `optional_host_permissions` and requested per site at runtime.
- **FR-WXT-04** The extension shall register a background service worker entrypoint.
- **FR-WXT-05** The extension shall register a content script entrypoint that injects into the active tab on demand.
- **FR-WXT-06** The extension shall register a side panel entrypoint.
- **FR-WXT-07** The extension shall register full-page extension tab entrypoints for the Graveyard, Options, Onboarding, and Help Center.
- **FR-WXT-08** While the extension is loaded unpacked in Chrome, the side panel shall open without console errors.
- **FR-WXT-09** The extension shall bundle Fraunces and IBM Plex Sans fonts locally and shall not load any remote font or script.
- **FR-WXT-10** The extension shall not contain any network request to an endpoint other than a user-chosen AI provider, and no such request exists in this foundation build.

### 3.3 Design tokens and theming

- **FR-TOK-01** The repository shall define design tokens exactly as: ink `#0E0B14`, panel `#14101D`, border `#2B2340`, violet `#8B5CF6`, pale violet `#C9B5FF`, blood `#F0506E`, amber `#F5B84B`, verified green `#7FE0AD`, text `#E9E4F2`, muted `#A79FBA`.
- **FR-TOK-02** The tokens shall be exposed as Tailwind theme variables and as CSS custom properties consumable by the overlay Shadow DOM.
- **FR-TOK-03** The repository shall use Fraunces for display/headings and IBM Plex Sans for body text.
- **FR-TOK-04** Every text color pairing shall meet at least 4.5:1 contrast against its background.
- **FR-TOK-05** The repository shall define a `hauntingLevel` theme concept with the three modes Immersive, Subtle, and Quiet, plus a `reduceMotion` boolean.
- **FR-TOK-06** When the user agent reports `prefers-reduced-motion: reduce`, the reduce-motion flag shall default to true.

### 3.4 Shared types and Zod schemas

- **FR-SCHEMA-01** The repository shall define the shared types `Concern`, `Category`, `Evidence`, `ClauseFinding`, and `AgreementRecord` exactly as specified in Part 4 of the master prompt, in `packages/core`.
- **FR-SCHEMA-02** For each shared type, the repository shall define a matching Zod schema that parses and validates that type.
- **FR-SCHEMA-03** The Zod schemas shall be the single source of truth, and the shared types shall be derived from the schemas via `z.infer`.
- **FR-SCHEMA-04** The `Evidence` schema shall require `exactQuote` to be a non-empty string and `startOffset`/`endOffset` to be non-negative integers with `startOffset <= endOffset`.
- **FR-SCHEMA-05** The `ClauseFinding.confidence` schema shall constrain the value to the range 0..1 inclusive.
- **FR-SCHEMA-06** The `AgreementRecord.consent.evidenceType` schema shall accept only `observed_click` or `user_confirmed`.
- **FR-SCHEMA-07** When a caller parses a fixture conforming to a schema, parsing shall succeed; when a caller parses a fixture violating a constraint, parsing shall fail with a diagnostic error.
- **FR-SCHEMA-08** The shared schemas shall be importable from `packages/core` by `packages/ai`, `packages/ui`, and `apps/extension` without circular dependencies.

### 3.5 Dexie schema (local storage)

- **FR-DB-01** The extension shall define a Dexie database stored in IndexedDB.
- **FR-DB-02** The database shall declare an `agreements` object store keyed by `id`, indexing `domain`, `sourceUrl`, `capturedAt`, and `documentHash`.
- **FR-DB-03** The database shall declare a `versions` object store keyed by an auto-increment id, indexing `agreementId` and `capturedAt`.
- **FR-DB-04** The database shall declare a `settings` object store keyed by a string key for user preferences.
- **FR-DB-05** The database shall declare a `dismissedTips` object store keyed by tip id.
- **FR-DB-06** When a caller writes an `AgreementRecord` then reads it back, the round-tripped record shall be structurally equal to the input.
- **FR-DB-07** The database schema version shall be declared explicitly and the database shall open without migration errors on a fresh profile.

### 3.6 Surface shells

- **FR-SURF-01** The side panel shall render an idle state reading "No agreement detected on this page." with a button labeled "Analyze this page anyway".
- **FR-SURF-02** The side panel shall expose placeholder tabs Findings, Evidence, and Ask Specter that render empty states.
- **FR-SURF-03** The Graveyard tab shall render a shell with a search input, stats placeholders, and an empty records list.
- **FR-SURF-04** The Options tab shall render shell sections for AI provider, haunting level, site access, excluded domains, data export, delete all, and replay onboarding.
- **FR-SURF-05** The Onboarding tab shall render a placeholder welcome screen with the headline "See what haunts your digital life." and a disabled Begin path until at least this foundation is present.
- **FR-SURF-06** The Help Center tab shall render a searchable shell listing the article categories from Part 5 as headings with no article bodies.
- **FR-SURF-07** The content script shall mount a Shadow DOM root and render nothing onto the page until a finding exists.
- **FR-SURF-08** Every surface shall provide a "?" link affordance that is a real focusable control, even if it links to a placeholder anchor in this spec.
- **FR-SURF-09** All surfaces shall be reachable from the extension's navigation: the toolbar action opens the side panel, and extension tabs are registered so their internal URLs open.

### 3.7 Privacy defaults

- **FR-PRIV-01** The extension shall define a default excluded-domains list containing at minimum common banking, health, and email providers.
- **FR-PRIV-02** The content script shall not read the text content of any `input[type=password]`, `input[type=card]`, or elements marked `autocomplete` containing `cc-` or `password`.
- **FR-PRIV-03** The repository shall define a single helper to read/write secrets that stores values only in `chrome.storage.local`.
- **FR-PRIV-04** The repository shall not include any logging statement that could emit document text or a stored key.

### 3.8 Accessibility baseline

- **FR-A11Y-01** Every interactive control shall be a real `<button>`, `<a>`, or `<input>` element.
- **FR-A11Y-02** Every interactive control shall render a visible focus ring on keyboard focus.
- **FR-A11Y-03** Every interactive control shall have a minimum 44px touch target.
- **FR-A11Y-04** The repository shall not use emoji as affordances; icons shall be inline stroke SVG with accessible names.

## 4. Non-functional requirements

- **NFR-PERF-01** The side panel shall paint its idle state within 300ms of being opened.
- **NFR-SIZE-01** The unpacked extension bundle (excluding fonts) shall remain under 2 MB at this stage; the rationale is documented, not enforced, in this spec.
- **NFR-SEC-01** The repository build shall produce no warnings about remote code execution or `unsafe-eval`.
- **NFR-COMPAT-01** The extension shall load in the current stable Chrome channel.

## 5. Test requirements

Tests here are limited to what the foundation can verify. Property-based and fixture-based tests are listed where applicable.

- **TEST-SCHEMA-01 (fixture-based)** A fixture conforming to `ClauseFinding` shall parse successfully through the Zod schema; a fixture with `confidence = 1.5` shall be rejected.
- **TEST-SCHEMA-02 (fixture-based)** A fixture conforming to `AgreementRecord` with a consent record shall parse; a fixture with `evidenceType = 'guessed'` shall be rejected.
- **TEST-SCHEMA-03 (fixture-based)** A fixture with `startOffset > endOffset` in `Evidence` shall be rejected.
- **TEST-DB-01 (fixture-based)** Writing then reading an `AgreementRecord` through the Dexie layer shall return a structurally equal record.
- **TEST-TOK-01 (property-based)** For every token-defined text/background pairing, the computed contrast ratio shall be at least 4.5:1. (If a pairing cannot meet this, the requirement is to document the exception and recolor.)
- **TEST-WXT-01 (smoke)** The built extension shall load in a Playwright-driven Chromium with MV3 enabled and the side panel shall open without throwing.
- **TEST-TYPE-01** `pnpm typecheck` shall exit zero across all workspaces.

## 6. Acceptance criteria

The Foundation spec is done when **all** of the following are true:

1. `pnpm typecheck` exits zero across every workspace.
2. `pnpm build` produces a loadable extension in `.output/`.
3. The extension loads unpacked in Chrome and the side panel opens without console errors.
4. The Graveyard, Options, Onboarding, and Help Center extension tabs each open to a non-empty shell.
5. The shared types and Zod schemas compile, and the fixture-based schema tests pass.
6. The Dexie database opens on a fresh profile and round-trips an `AgreementRecord`.
7. No `<all_urls>` host permission is declared in the built manifest.
8. No remote font, remote script, or non-provider network request exists in the bundle.
9. The default excluded-domains list includes banking, health, and email providers.

## 7. Traceability

| Requirement group | Spec section | Owning package |
| --- | --- | --- |
| Monorepo & tooling | 3.1 | repo root, all workspaces |
| WXT shell | 3.2 | apps/extension |
| Tokens & theming | 3.3 | packages/ui |
| Types & schemas | 3.4 | packages/core |
| Dexie schema | 3.5 | apps/extension (db) / packages/core (types) |
| Surface shells | 3.6 | apps/extension, packages/ui |
| Privacy defaults | 3.7 | apps/extension, packages/core |
| Accessibility baseline | 3.8 | packages/ui, apps/extension |
