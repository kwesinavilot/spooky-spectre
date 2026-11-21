# Specter — Tech

TypeScript strict, pnpm, WXT, MV3, React 19, Tailwind, Zustand, Dexie, Vercel AI SDK, Zod,
Vitest, Playwright. No remote scripts, fonts or analytics. No backend.

- Keys only in `chrome.storage.local`. Never log document text or keys.
- Permissions: `activeTab`, `storage`, `sidePanel`, `scripting`. Add `alarms` and `notifications`
  only when reminders are built (post-MVP).
- Host access is never granted at install. `<all_urls>` is declared only under
  `optional_host_permissions` and requested at runtime when the user opts in to background
  detection during onboarding or in Options. Users who decline get per-site access instead.
- Once background detection is granted, register the detection content script dynamically
  (`chrome.scripting.registerContentScripts`). Unregister it when the permission is removed.
- Background detection is rules only and runs on the device. No AI call happens without an
  explicit user action or per-site preference.
- Pure logic in `packages/core` with unit tests; UI in `packages/ui` and `apps/extension`.
- Every AI call goes through `packages/ai`.
- Types and Zod schemas defined once in `packages/core`, imported everywhere.
