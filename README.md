# Specter

> See what haunts your digital life.

Specter is a Chrome (Manifest V3) extension that reveals risky clauses in online
agreements — terms of service, privacy policies, cookie banners, subscription
conditions — highlights them on the page with verified evidence, explains them in
plain language, lets you save what you choose to remember, and shows what changed
when an agreement is updated later.

Built for the Kiroween hackathon (Costume Contest category) as a genuinely
haunting interface that is also a real product people could use daily.

## Current status

Spec 1 (Foundation) is code-complete. What exists today:

| Capability | State |
| --- | --- |
| pnpm monorepo, strict TypeScript, lint boundaries | Done |
| Shared Zod schemas for all data models (Part 4 contract) | Done, 5 fixture tests |
| Design tokens with enforced WCAG AA 4.5:1 pairings | Done, 13 contrast tests |
| Dexie local database schema (agreements, versions, settings, tips) | Done, round-trip test |
| Extension surfaces: side panel, Graveyard, Options, Onboarding, Help | Shells written, final build verification pending |
| Agreement detection, extraction, AI analysis, overlays | Not yet (Specs 2–6) |

## Principles

1. **Evidence or silence.** Every finding quotes text that exists verbatim in the
   document; a deterministic validator rejects anything else.
2. **AI proposes, code verifies.** The model interprets clauses; rules detect
   candidates, validate quotes, score severity, and diff versions.
3. **Local-first.** No backend, no accounts, no telemetry. Bring your own API key
   or run a local model through Ollama.
4. **Never interfere with the site.** Specter never touches Accept/Reject/Manage
   controls; overlays are pointer-events none except Specter's own badges.
5. **Honest limits.** Extraction completeness, confidence, and what a document
   does *not* say are always shown. Never legal advice.
6. **No unobserved consent.** A consent record exists only from an observed click
   or a user confirmation, and is labeled as one or the other.
7. **Spooky but proportional.** Effects scale with severity and are fully
   controllable (Immersive / Subtle / Quiet); `prefers-reduced-motion` is respected.
8. **Privacy by default.** Nothing is analyzed or saved until you act; password
   and payment fields and default excluded domains (banks, health, email) are
   never read.

## Architecture

```
spectre/
  apps/extension/        WXT app: background, content, sidepanel, graveyard,
                         options, onboarding, help entrypoints
  packages/core/        types, Zod schemas, tokens, privacy gates, contrast
                         (pure logic, unit tested)
  packages/ai/           provider abstraction (real providers: Spec 4)
  packages/ui/           React primitives, AppShell, tokens, error boundary
  packages/help/         Help Center article catalog
  corpus/                saved terms pages for regression tests (Spec 2)
  examples/streamly/     fictional demo site with versioned terms (Spec 7)
```

Boundaries are enforced by ESLint: `core` imports nothing from other packages;
`ai` and `ui` may depend only on `core`; only `apps/extension` wires everything
to `chrome.*` APIs.

The analysis pipeline (planned, Specs 2–5) is: rule-based detection, extraction
with section ids and a completeness score, segmentation, rule-nominated
candidates across seven categories (billing, cancellation, privacy,
content_rights, disputes, account_control, liability), LLM analysis with Zod
structured output, and deterministic validation that every `exactQuote` and its
offsets match the source. Failed findings are retried once, then dropped and
counted in a visible "rejected by verification" number.

## Getting started

Requirements: Node 20+, pnpm 9 (via corepack), Chrome.

```bash
pnpm install
pnpm dev      # WXT opens a browser with the extension installed
```

Production build, then load in Chrome:

```bash
pnpm --filter @specter/extension build
# chrome://extensions → Developer mode → Load unpacked
# → select apps/extension/.output/chrome-mv3
```

Quality gates:

```bash
pnpm typecheck   # tsc across every workspace
pnpm test        # core + extension unit tests (Vitest)
pnpm lint        # ESLint (boundaries, no emoji, no console in ai/secrets)
```

On install the extension opens the onboarding tab; clicking Begin opens the
Graveyard. The toolbar icon opens the side panel.

## Privacy model

- Nothing leaves the device except the clauses you explicitly analyze, sent to
  the provider you chose. A one-time consent explains this before the first
  analysis.
- API keys live only in `chrome.storage.local` and are never logged.
- Password and payment fields and the default excluded domains (banking,
  health, email) are never read; analysis runs only on sites you allow, with
  host permission requested per site at runtime.
- Delete-one, delete-all, and JSON export are provided for saved data.

## How Kiro specs, steering, and hooks were used

- **Steering** (`.kiro/steering/`): five always-included rulesets — product tone
  ("never legal advice", "every finding needs a verified quote"), stack and
  permissions, package structure, design tokens and accessibility, and privacy
  defaults — govern every change.
- **Specs** (`.kiro/specs/`): the Foundation spec was authored first
  (EARS requirements, design, tasks) and implemented against it. Each later
  spec (detection, AI, overlay, onboarding, Graveyard, timeline, reminders,
  help, polish) gets its own requirements/design/tasks before code.
- **Hooks** (`.kiro/hooks/`): five automation rules — run Vitest on core saves,
  typecheck+lint on UI saves, evidence-validation tests when AI prompts change,
  extraction when a corpus file is added, and a pre-commit scan that blocks
  secrets, disallowed remote URLs, and document-text logging.

## Known limits

- No PDF analysis (clear "not supported yet" state).
- No agreements outside the browser, no private/authenticated pages.
- Not legal advice, ever. Specter says "this clause says" and "the text does
  not state".
- Analysis pipeline (detection through verification) is not yet implemented;
  the current build is the foundation (Spec 1).

## Versioning

See [CHANGELOG.md](./CHANGELOG.md). Pre-1.0 minors map to completed specs;
`1.0.0` is the release candidate meeting the definition of done (end-to-end
demo on the Streamly site plus 7/10 real corpus pages, onboarding under three
minutes, no network beyond the chosen provider, keyboard and reduced-motion
checks).
