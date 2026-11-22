# Spec 3 — Candidate Finding and Segmentation (Tasks)

Status is written after the build. `[x]` means the code exists in the repository. Open tasks are
the gaps listed in `design.md` §4.

## Built

- [x] 1 `splitClauses(text)` in `packages/core/src/classify/index.ts`: punctuation and line-break
  split, trimmed, with offsets. _R1_
- [x] 2 `CATEGORY_KEYWORDS`: seven category patterns with stems. _R2_
- [x] 3 `NEGATION` and the `negated` flag on each candidate, without dropping the clause. _R3_
- [x] 4 `findCandidates(doc, limit)`: per section, per clause, per category; stable id; keywords
  recorded. _R5_
- [x] 5 `MAX_CANDIDATES = 40` cap, applied inside `findCandidates`. _R4.1_
- [x] 6 Candidates used by the analysis loop (`analyzeDocument`) and the prompt builder
  (`buildUserPrompt`, `contextSections`), which adds the neighbouring sections. _§5_

## Open

- [ ] 7 Rank candidates by keyword strength before applying the cap, so later sections are not
  skipped on long agreements. Keep document order among equal ranks. Verify on the GitHub and
  Mozilla corpus pages, where section counts are high. _R4.2_
- [ ] 8 Unit tests for R1 to R6 in `packages/core/test`: offsets round-trip, negation flag, cap,
  determinism, and one case with an abbreviation. _R1–R6_
- [ ] 9 Decide on abbreviation handling (task 8 test shows the current behaviour). _Design §4.2_
- [ ] 10 Widen the keyword table with the corpus: count clauses in the 7 passing pages that a
  reader would flag but no category matches, and add patterns that catch them. _Design §4.4_
