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
| Background service worker | `entrypoints/background.ts` | Opens onboarding on install, turns off the old "open the panel on click" behavior, answers `ping` and `get-status` |
| Toolbar popup | `entrypoints/popup/` | Host, status chip (Not checked, Excluded, Unsupported page), Open Specter (opens the side panel), Settings, Graveyard and Help links |
| Content script | `entrypoints/content.ts` | Registered at runtime only; mounts an empty Shadow DOM host. Detection wiring is Spec 2 Phase 5 |
| Side panel | `entrypoints/sidepanel/` | Header (AI connectivity, Settings and profile), Page, Findings and Ask tabs, History opening the Graveyard, and Settings and AI drill-ins with a back arrow. Page shows the excluded, unsupported and idle states; Analyze is disabled until Phase 5 |
| Graveyard | `entrypoints/graveyard/` | Search field, stat cards, empty list |
| Options | `entrypoints/options/` | Placeholder sections |
| Onboarding | `entrypoints/onboarding/` | Welcome screen |
| Help Center | `entrypoints/help/` | Searchable article titles |

**Access path.** The toolbar icon opens the popup. Chrome grants `activeTab` when the user opens
an extension's popup, so the side panel opened from it can read that tab when the user asks,
without any host permission. `describePage()` in `src/pageInfo.ts` classifies the active tab as
supported, excluded or unsupported (browser pages, the Web Store, PDFs), and both the popup and the
side panel use it. This still needs a manual check in Chrome (Spec 2 task 6.4).

Still to come on these surfaces: detection state, the "Specter on this site" toggle, cookie
controls and extraction results (Spec 2 Phases 5 and 6).

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
