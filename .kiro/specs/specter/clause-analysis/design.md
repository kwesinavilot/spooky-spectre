# Spec 5 — Clause Analysis and Validation (Design)

Written after the code. File names are the ones in the repository.

## 1. Pipeline

```
Candidate[] (Spec 3)
   │
   ▼  analyzeDocument                          packages/ai/src/analyze.ts
   │   - buildUserPrompt(maxChars)             packages/ai/src/prompts.ts
   │   - ChatProvider.complete                 packages/ai/src/providers.ts (Spec 4)
   │   - parseModelReply (ModelResponse)       packages/ai/src/analyze.ts
   ▼
draft findings
   │
   ▼  checkDraft (per draft)
   │   - locateQuote(section, quote)           packages/core/src/validate
   │   - validateFinding(summary, quote)       packages/core/src/validate (figures in quote)
   │   - ClauseFinding.parse + effectFor       packages/core/src/effects
   ▼
accepted findings ── failed drafts ──► one retry (buildRetryPrompt) ──► matched by section
   │                                                    │
   ▼                                                    ▼
Findings shown (verified)                 still failing → rejected (counted)
```

## 2. Modules

| File | Role |
| --- | --- |
| `packages/core/src/validate/index.ts` | `locateQuote`, `checkFigures`, `validateFinding` |
| `packages/core/src/effects/index.ts` | `effectFor`, `POSSESSION_CONFIDENCE` (0.85) |
| `packages/core/src/schema.ts` | `ClauseFinding`, `ModelResponse` (Zod, defined once) |
| `packages/ai/src/analyze.ts` | `analyzeDocument`, `checkDraft`, `parseModelReply` |
| `packages/ai/src/prompts.ts` | `SYSTEM_PROMPT`, `buildUserPrompt`, `buildRetryPrompt`, `PROMPT_VERSION` |

## 3. Decisions

- **The model proposes, the code verifies.** Offsets come from the code, never the model. A quote that
  is not in the named section is rejected, even if it is close.
- **Figures are checked against the quote, not the document.** The summary may not introduce an amount
  or date that the quote does not contain.
- **One retry, then drop.** A second correction round would cost more and rarely helps. Dropped drafts
  are counted so the user sees the rejection rate.
- **Effects are assigned here and drawn in Spec 6.** Keeping the rule in core makes it testable and
  keeps the page code free of decisions.
- **Confidence is the model's own estimate**, used only for the Possession threshold in Spec 6. It is
  not shown as a score, since a number would look like a verdict.

## 4. Known limits

- Live behaviour depends on the model. Tests use scripted replies and injected `fetch` stubs.
- The prompt is fixed at `analysis-v1`. Changing it invalidates the session cache by key.
- Possession is not part of this spec (moved to Spec 6).
