const fs = require('fs');
const f = 'c:/wamp64/www/alter/spectre/.kiro/specs/specter/foundation/tasks.md';
let s = fs.readFileSync(f, 'utf8');

// 2.8 tests run
s = s.replace(/- \[~\] 2\.8 /, '- [x] 2.8 ');
s = s.replace(/^  - Tests exist but were not executed.*$/m,
  '  - All 18 core tests (schema + contrast) pass via `pnpm -r run test`.');

// 4.3 preset
s = s.replace(/- \[ \] 4\.3 /, '- [x] 4.3 ');
s = s.replace(/^  - \*\*Not done\.\*\* No `tailwind\.preset\.ts` exists.*$/m,
  '  - `packages/ui/tailwind.preset.ts` created (token colors + font stacks); `apps/extension/tailwind.config.ts` consumes it via `presets` and only declares `content` globs.');

// 4.4 fonts
s = s.replace(/- \[~\] 4\.4 /, '- [x] 4.4 ');
s = s.replace(/^  - `:root` CSS custom properties for all tokens are present\..*$/m,
  '  - `:root` custom properties plus `@fontsource` imports (local @font-face rules over bundled woff2) now live in `base.css`; the extension `styles.css` imports only the base sheet. Verified in the built bundle (assets/*.woff2).');

// 6.2 host permissions
s = s.replace(/- \[~\] 6\.2 /, '- [x] 6.2 ');
s = s.replace(/^  - MV3; permissions `activeTab,storage.*$/m,
  '  - `optional_host_permissions` scoped to `http://*/*`, `https://*/*`; each grant is per site at runtime via `chrome.permissions`. Built manifest verified to contain no `<all_urls>`.');

// 6.4 get-status
s = s.replace(/- \[~\] 6\.4 /, '- [x] 6.4 ');
s = s.replace(/^  - `background\.ts` has `sidePanel\.setPanelBehavior`.*$/m,
  '  - `ping`/`get-status` handlers registered in `background.ts` via the typed message bus.');

// 7.2 settings persistence
s = s.replace(/- \[~\] 7\.2 /, '- [x] 7.2 ');
s = s.replace(/^  - All fields present\..*$/m,
  '  - Store hydrates from the Dexie `settings` table on surface mount (via `mount.tsx`) and persists on change; `prefers-reduced-motion` honoured when nothing is saved (FR-TOK-06).');

// Phase J
s = s.replace(/- \[ \] 10\.1 /, '- [x] 10.1 ');
s = s.replace(/^  - \*\*Not verified\.\*\* Could not run due to PowerShell execution-policy issues\..*$/m,
  '  - `pnpm -r run typecheck` exits zero across all workspaces (after fixing `content.ts` registration typing and the sidepanel tab callback).');

s = s.replace(/- \[ \] 10\.2 /, '- [x] 10.2 ');
s = s.replace(/^  - \*\*Not verified\.\*\* Could not run\..*$/m,
  '  - `pnpm -w run lint` clean (after adding `argsIgnorePattern: "^_"` to the ESLint config).');

s = s.replace(/- \[ \] 10\.3 /, '- [x] 10.3 ');
s = s.replace(/^  - \*\*Not verified\.\*\* Tests exist but were not run.*$/m,
  '  - 19 tests pass: 18 core (schema + contrast) + 1 extension Dexie round-trip.');

s = s.replace(/- \[ \] 10\.4 /, '- [x] 10.4 ');
s = s.replace(/^  - \*\*Not done\.\*\* `\.output\/chrome-mv3` is empty\..*$/m,
  '  - `pnpm build` produces `.output/chrome-mv3` (all 5 HTML surfaces, background, content script, fonts bundled locally).');

s = s.replace(/- \[ \] 10\.7 /, '- [x] 10.7 ');
s = s.replace(/^  - \*\*Not done\.\*\* Note: current `wxt\.config\.ts` declares.*$/m,
  '  - Built manifest verified: `optional_host_permissions: ["http://*/*","https://*/*"]`, no `<all_urls>`, default MV3 CSP, no remote entries, fonts local.');

// 10.8 — release workflow added the 0.1.0 entry
s = s.replace(/- \[~\] 10\.8 /, '- [x] 10.8 ');
s = s.replace(/^  - CHANGELOG exists but `Unreleased` still says.*$/m,
  '  - CHANGELOG has a `0.1.0` entry covering the foundation; the wave-0 fixes land under a fresh `Unreleased` section.');

// Acceptance gates
s = s.replace('— _blocked on 10.1_', '— _satisfied (10.1)_');
s = s.replace('— _blocked on 10.4_', '— _satisfied (10.4)_');
s = s.replace('— _partially verified (code present, tests not yet run)_', '— _satisfied (10.3)_');
s = s.replace('— _at risk: 6.2 declares `<all_urls>` in `optional_host_permissions`; needs resolution_', '— _satisfied (10.7)_');
s = s.replace('— _fonts bundled locally via `@fontsource`; needs build-time verification (10.4/10.7)_', '— _satisfied (10.4/10.7)_');

// Open items list — drop resolved ones
s = s.replace(/^- \*\*6\.2 \/ Gate 7:\*\*.*$\n/m, '');
s = s.replace(/^- \*\*6\.4:\*\*.*$\n/m, '');
s = s.replace(/^- \*\*7\.2:\*\*.*$\n/m, '');
s = s.replace(/^- \*\*4\.3 \/ 4\.4:\*\*.*$/m,
  '- **4.3 / 4.4:** resolved — shared Tailwind preset created; fonts load via `@fontsource` in `base.css`.');
s = s.replace(/^- \*\*10\.1–10\.7:\*\*.*$\n/m, '');
s = s.replace(/^- \*\*10\.8:\*\*.*$\n/m, '');

// Dependency graph
s = s.replace(/\{ "id": 0, "tasks": \[[^\]]*\] \}/,
  '{ "id": 0, "tasks": ["4.1", "5.1", "5.2", "8.4", "9.2"] }');
s = s.replace(/\{ "id": 1, "tasks": \[[^\]]*\] \}/,
  '{ "id": 1, "tasks": [] }');
s = s.replace(/\{ "id": 2, "tasks": \[[^\]]*\] \}/,
  '{ "id": 2, "tasks": ["10.5", "10.6"] }');
s = s.replace(/\{ "id": 3, "tasks": \[[^\]]*\] \}/,
  '{ "id": 3, "tasks": [] }');

fs.writeFileSync(f, s);
console.log('tasks.md updated');