# Privacy model

The rules are in `.kiro/steering/privacy.md`. This page records how the code meets them today.

## Built

| Rule | Where |
| --- | --- |
| No host access at install; only http/https can ever be requested | `apps/extension/wxt.config.ts` (`optional_host_permissions`) |
| Excluded domains (banking, health, email) are never read | `shouldAnalyze` in `packages/core/src/privacy.ts`, checked first in `detectPage` |
| Password, card and `cc-*` fields are never read | `isSensitive` and `SKIP_TAGS` in `packages/core/src/dom/walk.ts` |
| Form field values, placeholders and labels are never read | Detection reads only button labels (aria-label for `<input>` buttons) and link text; extraction skips labels and controls |
| Detection results carry no page body text | Labels capped at 80 characters, link text at 120; URL is origin and path only |
| API keys only in `chrome.storage.local` | `apps/extension/src/secrets.ts` |
| No `console` logging in `packages/ai` or `secrets.ts` | ESLint config |
| Background detection only after the user grants all-sites access; per-site access otherwise | `apps/extension/src/access.ts` |
| Revoking access in Chrome's settings turns detection off | `syncRegistrations` on `permissions.onRemoved` |
| Excluded and paused sites never get the detection script | `excludeMatches` in `access.ts`, plus the `shouldAnalyze` check in the content script |
| Detection results kept per tab only, cleared on navigation and close, no page text | `apps/extension/src/tabState.ts`, `backgroundHandlers.ts` |

## Planned (Spec 2 Phase 6, later specs)

- The Options and onboarding screens that explain Chrome's "read and change data on all
  websites" warning before asking.
- Extracted text stays in memory until the user saves (Spec 8).
- A linked policy page is read automatically during an analysis once the user has given the
  one-time consent (onboarding, changeable in Settings and Options), and on a button click
  otherwise. No cookies are sent and nothing is stored. This is the only network request before
  AI analysis.
- Before any AI call, the user sees exactly what will be sent (Spec 4 and 5).
