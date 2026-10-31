# Specter — Tech

TypeScript strict, pnpm, WXT, MV3, React 18, Tailwind, Zustand, Dexie, Vercel AI SDK, Zod,
Vitest, Playwright. No remote scripts, fonts or analytics. No backend.

- Keys only in `chrome.storage.local`. Never log document text or keys.
- Permissions: `activeTab`, `storage`, `sidePanel`, `scripting`, `alarms`, `notifications`.
- Request host access per site at runtime (`optional_host_permissions`), never `<all_urls>` by default.
- Pure logic in `packages/core` with unit tests; UI in `packages/ui` and `apps/extension`.
- Every AI call goes through `packages/ai`.
- Types and Zod schemas defined once in `packages/core`, imported everywhere.
