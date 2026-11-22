# Spec 3 — Candidate Finding and Segmentation (Tasks)

`[x]` means the code exists in the repository and the tests pass. Spec 3 is closed.

## Built

- [x] 1 `splitClauses(text)` in `packages/core/src/classify/index.ts`: punctuation and line-break
  split, trimmed, with offsets. _R1_
- [x] 2 `CATEGORY_KEYWORDS`: seven category patterns with stems. _R2_
- [x] 3 `NEGATION` and the `negated` flag on each candidate, without dropping the clause. _R3_
- [x] 4 `findCandidates(doc, limit)`: per section, per clause, per category; stable id; keywords
  recorded. _R5_
- [x] 5 `MAX_CANDIDATES = 40` cap. _R4.1_
- [x] 6 Candidates used by the analysis loop (`analyzeDocument`) and the prompt builder
  (`buildUserPrompt`, `contextSections`), which adds the neighbouring sections. _§5_

## Closed

- [x] 7 Ranked cap. `findCandidates` collects every match, keeps the `limit` strongest (strength =
  keyword hits in the clause), breaks ties by document order, and returns the kept candidates in
  document order. A late, strong clause is kept over an early, weak one. Covered by the tests for
  R4. _R4.2_
- [x] 8 Unit tests for R1 to R6 in `packages/core/test/classify/classify.test.ts` (15 tests). Core
  suite: 107 of 107 passing. _R1–R6_
- [x] 9 Abbreviations: decided to keep the split on punctuation. "e.g." and "U.S." can split one
  clause into two candidates. Both pieces still carry the same meaning to the model, and the cost of
  an extra candidate is small. Pinned by a test, so a future change is deliberate. _Design §4.2_
- [x] 10 Keyword coverage widened from the corpus. A scan of the ten corpus pages listed clauses
  that carry risk wording but match no category. The most useful gaps were added:
  - disputes: `governed by`, `choice of law`, `governing`, `jurisdiction`, `court`
  - liability: `liable` (the old pattern only matched `liability`)
  - account control: `delete`/`deletion`, `automatically change/update`
  - cancellation: `withdraw`, `waive` (rights of withdrawal)
  - privacy: `disclose`, `consent`, `personalize`, `profile`

  Deliberately not added: plain `law`, `any time`, `government` and `third party`. They are common
  boilerplate, and matching them would nominate most clauses and push out the useful ones. `location`
  was also left out, since the scan did not show whether it refers to data. _Design §4.4_
