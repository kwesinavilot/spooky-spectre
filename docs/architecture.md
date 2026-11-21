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
| Background service worker | `entrypoints/background.ts` | Opens onboarding on install; keeps the detection script registration in line with permissions and excluded sites; stores validated detection results per tab and sets the dot badge |
| Toolbar popup | `entrypoints/popup/` | Host, status from the tab state, Open Specter, "Specter on this site", Settings, Graveyard and Help links |
| Content script | `entrypoints/content.ts` | Registered at runtime (background detection or per site) or injected on demand; detects, watches for late banners, extracts on request. Mounts only an empty Shadow DOM host |
| Side panel | `entrypoints/sidepanel/` | Page tab with detection, document choice, cookie controls, reading and coverage; Findings and Ask placeholders; History opens the Graveyard; Settings (with the linked-policy switch) and AI drill-ins |
| Options | `entrypoints/options/` | Site access (background detection, linked policies, per-site and paused lists) plus placeholder sections |
| Graveyard | `entrypoints/graveyard/` | Search field, stat cards, empty list |
| Onboarding | `entrypoints/onboarding/` | Welcome screen |
| Help Center | `entrypoints/help/` | Searchable article titles |

**Access path.** The toolbar icon opens the popup. Chrome grants `activeTab` when the user opens
an extension's popup, so the side panel opened from it can read that tab when the user asks,
without any host permission. `describePage()` in `src/pageInfo.ts` classifies the active tab as
supported, excluded or unsupported (browser pages, the Web Store, PDFs), and both the popup and the
side panel use it. This still needs a manual check in Chrome (Spec 2 task 6.4). Detection and
extraction in the extension are described in [Detection and extraction](detection-extraction.md).

## Data

- **Schemas:** defined once in `packages/core/src/schema.ts`; types are inferred with `z.infer`.
  Spec 1 added `ClauseFinding`, `Evidence`, `Consent` and `AgreementRecord`. Spec 2 added
  `DetectionResult`, `CookieControl`, `ActionControl`, `PolicyLink`, `Section`,
  `ExtractedDocument` and `CompletenessReason`.
- **Local database:** Dexie (IndexedDB) in `apps/extension/src/db/database.ts` with the stores
  `agreements`, `versions`, `settings` and `dismissedTips`. Nothing writes agreements yet.
- **Secrets:** API keys only through `apps/extension/src/secrets.ts`, which uses
  `chrome.storage.local`.

## Flow

```
page loads -> content script (if access granted) -> detectPage()
           -> background validates the result, stores it per tab, sets the dot badge
popup -> Open Specter -> side panel shows the detected state (checks now if nothing is stored)
user clicks Analyze -> content script runs extractDocument(), or the side panel reads a linked policy
           -> side panel validates the document and shows sections and coverage (in memory only)
```

Messages between the parts are typed in `src/messaging.ts`; anything coming from the content
script is validated with the Zod schemas before use, because the content script runs inside the
web page.
