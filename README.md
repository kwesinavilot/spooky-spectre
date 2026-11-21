# Specter

> The things you agree to online shouldn't come back to haunt you.

Specter is your digital sixth sense: a browser companion with three jobs. It sees
the invisible, explains the consequences, and remembers the agreement.

## MVP scope

| In the MVP | Later |
| --- | --- |
| Chrome extension and side panel | Automatic monitoring of saved policies |
| Cookie banner detection and explanation | Subscription and trial reminders |
| Terms and privacy policy extraction | Scam and phishing investigation |
| AI explanations with source citations | Multi-browser support |
| Spectral Vision highlights on the page | Cloud sync and accounts |
| Saving agreement snapshots locally | |
| Comparing two agreement versions | |

Background detection is opt-in. If you allow it during onboarding, Specter spots
agreements on the pages you visit using local rules and shows a small indicator.
Nothing is sent to an AI model until you click Analyze. If you decline, Specter
works only on sites you enable one at a time. Specter informs and never decides:
it will not accept cookies, accept agreements, or cancel anything for you.

## About

Specter is a Chrome (Manifest V3) extension that reveals risky clauses in online
agreements — terms of service, privacy policies, cookie banners, subscription
conditions — highlights them on the page with verified evidence, explains them in
plain language, lets you save what you choose to remember, and shows what changed
when an agreement is updated later.

Built for the Kiroween hackathon (Costume Contest category) as a genuinely
haunting interface that is also a real product people could use daily.

## Current status

Spec 1 (Foundation) is done at v0.6.0. Spec 2 (Detection and extraction) is code complete at
v0.7.0; two manual checks in Chrome are still open (see below).

| Capability | State |
| --- | --- |
| pnpm monorepo, strict TypeScript, lint boundaries | Done |
| Shared Zod schemas (findings, agreements, detection, extraction) | Done, fixture tests |
| Design system tokens, fonts and components (design steering) | Done, 33 contrast tests |
| Dexie local database schema | Done, round-trip test |
| Toolbar popup and four-tab side panel | Done |
| Rule-based detection: cookie banners, terms, privacy, licenses, sign-up checkboxes, subscription wording | Done, 77 core tests |
| Extraction with sections, anchors, hash and coverage | Done |
| Opt-in background detection, per-site access, dot badge, Options "Site access" | Done, 28 extension tests |
| Real-page corpus | 7 of 10 pass (below) |
| Manual check in Chrome on the demo pages, network check in DevTools | Open |
| Clause screening, AI analysis, findings, overlays | Not yet (Specs 3 to 6) |

### Corpus results (2026-11-21)

Ten saved public pages, measured with `pnpm corpus:report` ([details](corpus/README.md)):

| Pages | Passed |
| --- | --- |
| Terms of service (GitHub, Mozilla, Automattic, Dropbox) | 4 of 4 |
| Privacy policies (Firefox, DuckDuckGo, Signal terms and privacy) | 3 of 3 |
| Cookie-banner home pages (GOV.UK, the Guardian, legislation.gov.uk) | 0 of 3 |
| **Total** | **7 of 10** |

The cookie-banner failures are honest: those banners are added or revealed by each site's scripts,
which saved copies do not run. Detection on live pages relies on the 15-second late-banner watch,
which still needs the manual check in Chrome.

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

On install the extension opens the onboarding tab. The toolbar icon opens a small
popup; "Open Specter" opens the side panel for that tab. To try detection, run
`pnpm examples` and open http://localhost:5178/streamly/signup.html or
http://localhost:5178/cookies/index.html. Background detection can be turned on in
Options, under Site access.

Corpus:

```bash
pnpm corpus:report   # detection and extraction on the 10 saved real pages
```

## Privacy model

- Nothing leaves the device except the clauses you explicitly analyze, sent to
  the provider you chose. A one-time consent explains this before the first
  analysis.
- API keys live only in `chrome.storage.local` and are never logged.
- Password and payment fields and the default excluded domains (banking,
  health, email) are never read. No site access is granted at install:
  background detection is opt-in, otherwise Specter reads a page only when you
  open it there or turn the site on.
- Detection runs on the device with rules. Results are kept per tab and cleared
  when you leave the page; extracted text stays in memory.
- When an agreement is only linked, Specter can read that one linked page
  without your cookies, automatically after a one-time consent (Settings and
  Options), or from a button otherwise. Nothing is stored.
- Delete-one, delete-all, and JSON export are planned for saved data (Spec 8).
  See [docs/privacy.md](docs/privacy.md) for how each rule is met in the code.

## How Kiro specs, steering, and hooks were used

- **Steering** (`.kiro/steering/`): six always-included rulesets govern every
  change: product (tone, scares, MVP scope), tech (stack and permissions),
  structure (package boundaries), design (tokens, components, motion and the
  rules for scares), privacy, and workflow (every unit of work ships with its
  docs, changelog entry and commit).
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
- English keyword and label patterns only.
- Cookie banners added by scripts are found only on live pages, not in saved
  copies; banners in closed components or other sites' frames are reported as
  unreadable, not guessed.
- Clause screening, AI analysis and verification are not implemented yet
  (Specs 3 to 5); the current build detects and reads agreements.
- Developer documentation is in [docs/](docs/README.md).

## Versioning

See [CHANGELOG.md](./CHANGELOG.md). Pre-1.0 minors map to completed specs;
`1.0.0` is the release candidate meeting the definition of done (end-to-end
demo on the Streamly site plus 7/10 real corpus pages, onboarding under three
minutes, no network beyond the chosen provider, keyboard and reduced-motion
checks).
