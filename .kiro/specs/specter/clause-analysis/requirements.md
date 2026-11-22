# Spec 5 — Clause Analysis and Validation (Requirements)

> Scope: turning candidate clauses into verified findings. The model proposes; the code checks. Covers
> the analysis loop, quote and figure verification, the retry, the concern, impact and confidence fields,
> and the effect each finding is given. Written after the code. Done.
> Out of scope: the on-page Possession effect, its callout and its daily caps. They are Spec 6.

## 1. Overview

A model reads the clauses that Spec 3 nominated and proposes findings. Specter never shows a finding it
cannot tie to the agreement text. Each finding must carry a quote that appears word for word in the
section it names, and any amount or date in its summary must appear in that quote.

## 2. Requirements

### R1 Analysis loop

- R1.1 One analysis makes at most two model calls: the first proposal, and one retry for drafts that fail
  verification.
- R1.2 The model is asked for JSON that matches a schema. A reply that is not valid JSON gets one retry
  asking for JSON only; if that also fails, the analysis reports invalid output.
- R1.3 Nothing is analysed when there are no candidates.

### R2 Verification

- R2.1 A quote must be located in the section it names, word for word, and at the offsets the code finds.
  The model never supplies offsets.
- R2.2 Any amount or date in the summary must appear in the quote.
- R2.3 A draft that fails is sent back once, with the reason. A correction is matched to the failed draft
  by section. Anything still failing is dropped and counted as rejected.
- R2.4 Rejected drafts are counted and never shown.

### R3 Findings

- R3.1 A finding has: category, summary, implication, evidence (section, quote, offsets), concern
  (low, medium, high), confidence (0 to 1), conditions, things not stated, and suggested questions.
- R3.2 Only verified findings are shown. Each finding carries `verified: true` after the checks.
- R3.3 The model's negations are read by the model, not dropped by keywords.

### R4 Effects

- R4.1 Each finding gets one effect (`packages/core/src/effects`):
  - low concern: whisper
  - medium concern: hand for billing, cancellation or privacy; haunting otherwise
  - high concern: possession at confidence 0.85 or more, otherwise haunting
- R4.2 An unverified finding never gets an effect.
- R4.3 The effect is recorded on the finding. How it is drawn on the page is Spec 6.

### R5 Honest limits

- R5.1 Results are labelled "Limited · on-device only" when no AI ran or the call failed.
- R5.2 No finding is described as legal advice, illegal, unlawful, a scam, or a verdict on fairness.

## 3. Acceptance

- Typecheck passes for `@specter/core` and `@specter/ai`.
- Core tests (analysis, verification, effects) pass. The count is recorded in the changelog for the
  release that closed the spec.
- The live analysis was run by the user with a hosted provider and produced verified findings.
