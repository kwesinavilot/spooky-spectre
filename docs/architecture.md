# Architecture

## Packages

| Package | Holds | May import |
| --- | --- | --- |
| `packages/core` | Zod schemas and types, design tokens, privacy gates, contrast helpers, detection and extraction | nothing from other Specter packages |
| `packages/ai` | Provider interface (real providers arrive in Spec 4) | `core` |
| `packages/ui` | React primitives, `AppShell`, `ErrorBoundary` | `core` |
| `packages/help` | Help Center article catalog | nothing |
| `apps/extension` | The WXT Chrome extension: entrypoints, database, stores, messaging | everything |

ESLint enforces these boundaries with `no-restricted-imports`. Only `apps/extension` calls `chrome.*`.

Core functions take a standard `Document` or `Element` and return plain objects, so the same code
runs in the content script, in an extension page on a `DOMParser` document, and in Vitest with
happy-dom.

## Extension surfaces

| Surface | Entry | State today |
| --- | --- | --- |
| Background service worker | `entrypoints/background.ts` | Opens the side panel from the toolbar, opens onboarding on install, answers `ping` and `get-status` |
| Content script | `entrypoints/content.ts` | Registered at runtime only; mounts an empty Shadow DOM host. Detection wiring is Spec 2 Phase 5 |
| Side panel | `entrypoints/sidepanel/` | Idle state and placeholder tabs |
| Graveyard | `entrypoints/graveyard/` | Search field, stat cards, empty list |
| Options | `entrypoints/options/` | Placeholder sections |
| Onboarding | `entrypoints/onboarding/` | Welcome screen |
| Help Center | `entrypoints/help/` | Searchable article titles |

The design steering file now describes a toolbar popup, a four-tab side panel (Page, Findings, Ask,
History) and new tokens and fonts. Those are not built yet; moving the UI over is the next planned
step.

## Data

- **Schemas:** defined once in `packages/core/src/schema.ts`; types are inferred with `z.infer`.
  Spec 1 added `ClauseFinding`, `Evidence`, `Consent` and `AgreementRecord`. Spec 2 added
  `DetectionResult`, `CookieControl`, `ActionControl`, `PolicyLink`, `Section`,
  `ExtractedDocument` and `CompletenessReason`.
- **Local database:** Dexie (IndexedDB) in `apps/extension/src/db/database.ts` with the stores
  `agreements`, `versions`, `settings` and `dismissedTips`. Nothing writes agreements yet.
- **Secrets:** API keys only through `apps/extension/src/secrets.ts`, which uses
  `chrome.storage.local`.

## Flow (target for Spec 2, partly built)

```
page loads -> content script (if access granted) -> detectPage()  [built]
           -> background stores the result per tab, sets the dot badge   [Phase 5]
side panel opens -> shows the detected state                          [Phase 6]
user clicks Analyze -> content script runs extractDocument()          [built, wiring in Phase 5]
           -> side panel shows sections and coverage (in memory only) [Phase 6]
```
