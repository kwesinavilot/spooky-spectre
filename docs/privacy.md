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

## Planned (Spec 2 Phases 5 to 6, later specs)

- Background detection is opt-in, with Chrome's "read and change data on all websites" warning
  explained first. Per-site access otherwise.
- Detection results are kept per tab in `chrome.storage.session` and cleared on navigation.
- Extracted text stays in memory until the user saves (Spec 8).
- A linked policy page is fetched only when the user clicks "Read the linked policy", without
  cookies. This is the only network request before AI analysis, and it is still an open decision.
- Before any AI call, the user sees exactly what will be sent (Spec 4 and 5).
