# Spec 1 — Foundation (Design)

> Companion to `requirements.md` and `tasks.md`. Implements only the foundation: monorepo, WXT, tokens, Dexie, schemas, and surface shells. No AI pipeline.

## 1. Architecture overview

Specter is a single Chrome MV3 extension backed by a pnpm monorepo. Logic is split so that pure, testable code lives in `packages/*` and Chrome/React glue lives in `apps/extension`. The extension surfaces talk to a thin in-extension service layer that wraps `chrome.*` and Dexie; nothing in the packages calls `chrome.*` directly except the app.

```
+----------------------------------------------------------+
|                       apps/extension                      |
|  background SW | content script | sidepanel | ext tabs   |
|        |              |             |          |         |
|        v              v             v          v         |
|            service layer (db, storage, messaging)        |
|        |              |             |          |         |
|        +--------------+---+---------+----------+         |
|                           |                              |
|          packages/ui (React components, tokens)          |
|                           |                              |
|          packages/core (types, schemas, db types)        |
|                           |                              |
|          packages/ai (provider stub)  packages/help       |
+----------------------------------------------------------+
```

Data flow at this stage is limited to: shell renders -> reads settings from Dexie/chrome.storage -> shows placeholder. No content analysis.

## 2. Package boundaries

| Package | Responsibility in this spec | Depends on |
| --- | --- | --- |
| `packages/core` | Shared TS types + Zod schemas; excluded-domains default; contrast helper. Pure logic only. | (none) |
| `packages/ai` | Empty provider abstraction interface + types re-exported from core. No network calls. | `packages/core` |
| `packages/ui` | Design tokens, Tailwind preset, shared layout primitives (Button, Card, Tabs, SearchField, etc.). | `packages/core` |
| `packages/help` | Markdown stub files with front-matter only. | (none) |
| `apps/extension` | WXT app: background, content, sidepanel, graveyard, options, onboarding, help; Dexie db; service layer. | all packages |

Boundary rules enforced by `tsconfig` project references and an ESLint `no-restricted-imports` rule:
- `packages/core` imports nothing from other packages.
- `packages/ai` and `packages/ui` may import `packages/core` only.
- `apps/extension` may import anything.
- No package imports `apps/extension`.

## 3. Monorepo tooling

- **Package manager:** pnpm with workspaces. Root `pnpm-workspace.yaml` lists `apps/*` and `packages/*`.
- **TypeScript:** strict, `noUnusedLocals`, `noUnusedParameters`, project references with `composite: true` so `pnpm typecheck` uses `tsc --build`.
- **Linting:** ESLint flat config shared via a root config; `no-restricted-imports` encodes the boundary rules above.
- **Formatting:** Prettier; no emoji in source strings (an ESLint rule flags any emoji literal outside markdown).
- **Test runner:** Vitest per pure-logic package; a root `vitest` alias runs all. Playwright is installed but unused until Spec 6/13.
- **Node/pnpm pinning:** root `.nvmrc` (Node 20 LTS) and `packageManager` field in root `package.json`.

### 3.1 Scripts (root)

| Script | Effect |
| --- | --- |
| `pnpm dev` | `wxt` dev for the extension |
| `pnpm build` | `pnpm -r typecheck` then `wxt build` |
| `pnpm typecheck` | `tsc --build` across all projects |
| `pnpm lint` | ESLint across workspaces |
| `pnpm test` | Vitest across pure-logic workspaces |

## 4. WXT configuration

WXT is configured in `apps/extension/wxt.config.ts`:

- `manifestVersion: 3`.
- `permissions`: `['activeTab','storage','sidePanel','scripting','alarms','notifications']`.
- `optional_host_permissions`: declared as needed at runtime; never `<all_urls>`.
- Entrypoints (WXT convention — `entrypoints/*`):
  - `background.ts` — service worker.
  - `content.ts` — content script (`world: 'ISOLATED'`, mounts Shadow DOM).
  - `sidepanel/index.html` + `SidePanel.tsx` — side panel app.
  - `graveyard/index.html` + `Graveyard.tsx` — full-page tab.
  - `options/index.html` + `Options.tsx` — full-page tab.
  - `onboarding/index.html` + `Onboarding.tsx` — full-page tab.
  - `help/index.html` + `HelpCenter.tsx` — full-page tab.
- `web_accessible_resources`: the demo/Streamly assets and the bundled fonts, scoped so nothing is world-readable beyond need.
- Fonts: `@fontsource/fraunces` and `@fontsource/ibm-plex-sans` bundled; Tailwind referenced via local `@font-face` in the extension's CSS so no remote fetch.
- No `content_security_policy` relaxation; default MV3 CSP is kept (no `unsafe-eval`).

### 4.1 Shadow DOM overlay shell

The content script creates a single Shadow root appended to `document.documentElement`. At this stage it renders nothing visible (a zero-size host with `pointer-events: none`). The root is created once and reused; the side panel later commands effects through a message bus. This keeps site CSS from leaking in and Specter CSS from leaking out.

## 5. Design tokens and theming

Tokens live in `packages/ui/src/tokens.ts` as a typed object and are emitted to:
1. Tailwind theme extension (`packages/ui/tailwind.preset.ts`) — so utilities like `bg-ink`, `text-pale-violet` exist.
2. A `:root` CSS custom property block included in every surface's global CSS — so the Shadow DOM overlay can read the same values via `var(--specter-ink)`.

```
ink        #0E0B14   panel  #14101D   border #2B2340
violet     #8B5CF6   pale violet #C9B5FF
blood      #F0506E   amber  #F5B84B   verified #7FE0AD
text       #E9E4F2   muted  #A79FBA
```

- Display font: Fraunces (headings). Body: IBM Plex Sans.
- `hauntingLevel` and `reduceMotion` are surfaced as a Zustand store and as `data-specter-mode` / `data-specter-reduce-motion` attributes on the root element of each surface so CSS can branch.
- A `contrast.ts` helper in `packages/core` computes WCAG contrast; the token test asserts every declared text/background pair >= 4.5:1.

## 6. Data models and schemas

Defined once in `packages/core/src/schema.ts`, Zod-first:

```ts
import { z } from 'zod'

export const Concern = z.enum(['low','medium','high'])
export type Concern = z.infer<typeof Concern>

export const Category = z.enum([
  'billing','cancellation','privacy','content_rights',
  'disputes','account_control','liability'
])
export type Category = z.infer<typeof Category>

export const Evidence = z.object({
  sectionId: z.string().min(1),
  exactQuote: z.string().min(1),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
}).refine(e => e.startOffset <= e.endOffset, {
  message: 'startOffset must be <= endOffset'
})
export type Evidence = z.infer<typeof Evidence>

export const ClauseFinding = z.object({
  id: z.string().min(1),
  category: Category,
  summary: z.string().min(1),
  implication: z.string().min(1),
  evidence: Evidence,
  concern: Concern,
  confidence: z.number().min(0).max(1),
  conditions: z.array(z.string()),
  notStated: z.array(z.string()),
  suggestedQuestions: z.array(z.string()),
  effect: z.enum(['whisper','hand','haunting','possession']),
  verified: z.boolean(),
})
export type ClauseFinding = z.infer<typeof ClauseFinding>

export const ConsentAction = z.enum(['accepted','declined','customized','unsure'])
export const EvidenceType = z.enum(['observed_click','user_confirmed'])

export const Consent = z.object({
  action: ConsentAction,
  observedAt: z.string().datetime(),
  evidenceType: EvidenceType,
})
export type Consent = z.infer<typeof Consent>

export const AgreementRecord = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  sourceUrl: z.string().min(1),
  title: z.string().min(1),
  capturedAt: z.string().datetime(),
  documentHash: z.string().min(1),
  extractedText: z.string(),
  completeness: z.number().min(0).max(1),
  findings: z.array(ClauseFinding),
  consent: Consent.optional(),
  previousVersionId: z.string().optional(),
  trialEndsAt: z.string().datetime().optional(),
})
export type AgreementRecord = z.infer<typeof AgreementRecord>
```

Design decision: schemas are the source of truth and types are inferred, satisfying FR-SCHEMA-03. The refine on `Evidence` enforces FR-SCHEMA-04. `confidence` bounds satisfy FR-SCHEMA-05. `EvidenceType` enum satisfies FR-SCHEMA-06.

## 7. Dexie schema

`apps/extension/src/db/database.ts`:

```ts
import Dexie, { Table } from 'dexie'
import type { AgreementRecord } from '@specter/core'

export interface VersionRow {
  id?: number
  agreementId: string
  capturedAt: string
  record: AgreementRecord
}

export class SpecterDB extends Dexie {
  agreements!: Table<AgreementRecord, string>
  versions!: Table<VersionRow, number>
  settings!: Table<{ key: string; value: unknown }, string>
  dismissedTips!: Table<{ id: string; dismissedAt: string }, string>

  constructor() {
    super('specter')
    this.version(1).stores({
      agreements: 'id, domain, sourceUrl, capturedAt, documentHash',
      versions: '++id, agreementId, capturedAt',
      settings: 'key',
      dismissedTips: 'id',
    })
  }
}

export const db = new SpecterDB()
```

Stores map to FR-DB-02..05. `versions` holds prior snapshots for the Haunting Timeline (Spec 9); `settings` holds haunting level, excluded domains, provider id; `dismissedTips` holds coach-mark dismissals. Round-trip test (TEST-DB-01) covers FR-DB-06.

## 8. Settings and secrets

- User preferences (haunting level, reduce motion, excluded domains, provider id, onboarding complete) live in Dexie `settings` and are mirrored to a Zustand `useSettings` store hydrated on surface mount.
- API keys live in `chrome.storage.local` only, accessed through a single `secrets.ts` helper with `get`/`set`/`clear`. No other module touches `chrome.storage.local` for keys, and no log statement references key values.

## 9. Surface shells (this spec builds only shells)

All shells are React 18 + Tailwind, mounted via WXT HTML entrypoints. Each uses a shared `<AppShell>` from `packages/ui` providing the header, "?" link affordance, and focus-visible ring base.

- **Side panel** (`SidePanel.tsx`): idle state per FR-SURF-01, tabs per FR-SURF-02. State machine is a Zustand `useSidePanel` with states `idle | detected | analyzing | results`, but only `idle` is populated; others render placeholders.
- **Graveyard** (`Graveyard.tsx`): search field, three stats cards (Saved agreements / Trials ending soon / Policies changed) as placeholders, empty records list.
- **Options** (`Options.tsx`): section cards for the seven areas in FR-SURF-04, each a placeholder with real labeled controls that are disabled (no behavior wired).
- **Onboarding** (`Onboarding.tsx`): welcome screen headline only; full 7-screen flow is Spec 7.
- **Help Center** (`HelpCenter.tsx`): search input + category headings from Part 5; article bodies are Spec 12.
- **Content script** (`content.ts`): mounts Shadow root, renders nothing. Registers a message listener for later commands.

Navigation wiring: the toolbar action opens the side panel (`chrome.sidePanel.open`). Extension tabs are opened via `chrome.tabs.create({ url: browser.runtime.getURL('...') })` from a small nav helper shared across surfaces.

## 10. Messaging contract (shell only)

A tiny typed message bus lives in `apps/extension/src/messaging.ts` using `@webext-core/messaging` (or a hand-rolled `chrome.runtime.sendMessage` wrapper). At this stage only a `ping`/`pong` and `get-status` shape is defined to validate the side panel can reach the content script and background. Real messages (analyze, finding click, save) are added in later specs.

## 11. Privacy defaults

- `packages/core/src/privacy.ts` exports `DEFAULT_EXCLUDED_DOMAINS` (banking, health, email) and `SENSITIVE_INPUT_SELECTORS` (`input[type=password]`, `[autocomplete*="cc-"]`, `[autocomplete*="password"]`).
- A `shouldAnalyze(host)` helper returns false for excluded hosts; the content script will consult it (Spec 2) but the default list and helper exist now.

## 12. Accessibility baseline

- `<Button>`, `<Link>`, `<TextInput>`, `<SearchField>` primitives in `packages/ui` enforce min-height 44px and `focus-visible` ring via Tailwind utilities.
- SVG icons accept an accessible name prop and render `<title>`/`aria-hidden` appropriately.
- No emoji in any non-markdown source; an ESLint rule enforces this.

## 13. Error and edge states (placeholders)

Each surface includes a placeholder error boundary that renders a calm message ("Something went wrong") and a retry affordance. Real edge states (no key, rate limited, PDF not supported) are populated in later specs; the boundary shell exists now so crashes don't blank the surface.

## 14. Risks and decisions

| Risk | Decision |
| --- | --- |
| Remote fonts blocked by MV3 CSP | Bundle `@fontsource` packages locally; reference via `@font-face` in extension CSS. |
| Side panel not opening on install | Open side panel on action click via `chrome.sidePanel.open`; full auto-open wiring is Spec 7. |
| Schema drift across packages | Zod-first definitions in `packages/core`; import boundaries enforced by ESLint. |
| Accidental `<all_urls>` permission | Manifest is checked in a smoke test; `optional_host_permissions` only. |
| Logging secrets | A custom ESLint rule forbids `console.*` in `packages/ai` and any file named `secrets.ts`. |

## 15. Out of scope recap

Detection, extraction, segmentation, AI calls, validation, finding rendering, overlay effects, onboarding content, save/consent logic, diffing, Ask Specter, reminders, Help articles, and final a11y/perf pass are not implemented. Their shells exist so later specs fill them in without restructuring.
