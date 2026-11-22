# Spec 5 — Clause Analysis and Validation (Tasks)

`[x]` means the code exists in the repository and was checked. Spec 5 is closed.

## Built

- [x] 1 `analyzeDocument` loop with one retry and a JSON re-ask on invalid output. _R1_
- [x] 2 `checkDraft`: quote located in its section, offsets from code, figures checked against the
  quote, `validateFinding`. _R2.1, R2.2_
- [x] 3 Retry matched by section; failed drafts counted as rejected and never shown. _R2.3, R2.4_
- [x] 4 `ClauseFinding` and `ModelResponse` schemas in `packages/core/src/schema.ts`. _R3.1_
- [x] 5 `effectFor` with the rules in R4.1, and `POSSESSION_CONFIDENCE = 0.85`. Covered by the core
  analysis tests. _R4_
- [x] 6 Verified findings only: `analyzeDocument` returns only accepted findings, and each carries
  `verified: true`. _R3.2_
- [x] 7 Limited mode labelling in the side panel. _R5.1_
- [x] 8 Live check by the user with a hosted provider. Analysis ran and produced findings. _Acceptance_

## Moved

- [~] 9 Possession (moment of agreement, callout, daily caps). Moved to Spec 6, where the on-page
  overlay lives. The effect rule itself stays in Spec 5 (task 5).

## Closed

Spec 5 is closed in the roadmap. The version bump (minor, per the workflow) is part of the next release
commit and is not yet made.
