# Development

## Setup

Node 20 or newer, pnpm 9 (enable it with `corepack enable pnpm`), Chrome.

```bash
pnpm install
pnpm dev                                  # WXT opens Chrome with the extension loaded
pnpm --filter @specter/extension build    # production build in apps/extension/.output/chrome-mv3
```

To load a build by hand: `chrome://extensions`, turn on Developer mode, Load unpacked, choose
`apps/extension/.output/chrome-mv3`.

## Checks

```bash
pnpm typecheck                     # tsc in every workspace
pnpm lint                          # ESLint: package boundaries, no emoji, no console in ai/secrets
pnpm test                          # Vitest in core and extension
pnpm --filter @specter/core test   # core only (detection, extraction, schemas, contrast)
```

DOM tests use happy-dom (`// @vitest-environment happy-dom` at the top of the file). Property tests
use fast-check.

## Demo pages

Static HTML in `examples/`, described in [Detection and extraction](detection-extraction.md). Open
them directly in Chrome for now; a local server script (`pnpm examples`) is planned.

## Kiro hooks

`.kiro/hooks/` runs Vitest when `packages/core` changes, typecheck and lint when the extension or UI
changes, the evidence tests when AI prompts change, the corpus report when a corpus file is added,
and a pre-commit scan for keys, remote URLs and logging of document text.

## Known tooling issues

- **PowerShell execution policy** blocks `pnpm.ps1`. Use `pnpm.cmd` in PowerShell, or Git Bash.
- **Agent shell output:** in this workspace, PowerShell output from node tools is often lost.
  Run node and pnpm commands in Git Bash and paste the output when needed.
- **Line endings:** git warns that LF will be replaced by CRLF on Windows; this is harmless.
- **Vite and the React plugin:** WXT 0.21 needs Vite 6 with `@vitejs/plugin-react` 5. Older pins
  broke `wxt prepare`.
