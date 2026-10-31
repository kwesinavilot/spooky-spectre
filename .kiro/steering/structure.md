# Specter — Structure

- Pure logic lives in `packages/core` and must have unit tests.
- UI lives in `packages/ui` and `apps/extension`.
- Help content is markdown in `packages/help`.
- Every AI call goes through `packages/ai`.
- Types and Zod schemas are defined once in `packages/core` and imported everywhere.
- Fonts and assets are bundled locally; nothing is fetched remotely.
