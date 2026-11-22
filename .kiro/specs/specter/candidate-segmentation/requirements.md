# Spec 3 — Candidate Finding and Segmentation (Requirements)

> Scope: splitting extracted agreement sections into clauses, and nominating clauses that may need
> the reader's attention by category. Local and deterministic. No AI call, no verification of
> quotes, no decisions about meaning. This spec was written after the code was built, so the
> requirements describe what exists and the open tasks record the gaps.

## 1. Overview

Spec 2 gives Specter clean sections with offsets. Spec 3 answers one question for the model that
reads them later: **which sentences in this agreement could matter to the reader, and why?**

Keyword rules nominate candidates. They only choose what the model reads. They never say a clause
is risky, and a negated clause is still nominated (see R3).

## 2. Out of scope

- Any AI call, prompt, or choice of model (Spec 4, Spec 5).
- Checking that a model's quote is verbatim, or locating its offsets (Spec 5, `core/validate`).
- Impact, confidence, and visual effects (Spec 5 and Spec 6).

## 3. Glossary

- **Clause:** one sentence-like span of a section, from `splitClauses`. Trimmed, with offsets into
  the document text.
- **Category:** one of `billing`, `cancellation`, `privacy`, `content_rights`, `disputes`,
  `account_control`, `liability`.
- **Candidate:** a clause that matched at least one category. Carries its section id and heading,
  offsets, matched keywords and a negation hint.
- **Cap:** the maximum number of candidates sent for one analysis (`MAX_CANDIDATES`, 40).

## 4. Requirements

### R1 Clause split

- R1.1 Text is split at `.`, `!`, `?` or a line break. Each clause is trimmed of surrounding space.
- R1.2 Every clause keeps offsets into the same text it came from, so `text.slice(start, end)`
  returns the clause.
- R1.3 Empty spans are dropped.
- R1.4 Splitting is per section, so no clause crosses a section boundary.

### R2 Categories

- R2.1 Each category has one keyword pattern. Matching is case-insensitive and on whole words or
  word stems (for example `renew` matches `renewal`).
- R2.2 A clause can match more than one category. It is nominated once per category.
- R2.3 The matched keywords are recorded (lower case, de-duplicated) so the model and the UI can
  show them.

### R3 Negation

- R3.1 A clause that contains a negation word (`not`, `no`, `never`, `without`, `unless`, `neither`,
  `nor`, `cannot`, or an `n't`) is still nominated. The candidate carries `negated: true`.
- R3.2 Keywords never drop a negated clause. The model reads negations; Specter does not
  (master prompt).

### R4 Cap and order

- R4.1 At most `MAX_CANDIDATES` (40) candidates are returned for one document.
- R4.2 Candidates come back in document order. **Known gap:** the cap is applied in document
  order, so on a long agreement the later sections are never nominated. See task 7.

### R5 Candidate record

- R5.1 Each candidate has a stable id made of section id, absolute start offset and category.
- R5.2 Each candidate carries its section id, section heading, clause text, start and end offsets,
  category, keywords and negation flag.

### R6 Offline and deterministic

- R6.1 The same document always gives the same candidates, in the same order.
- R6.2 No network access and no storage. Pure functions in `packages/core/src/classify`.

## 5. Acceptance

- The analysis uses `findCandidates` on the extracted document, and nothing else chooses what the
  model reads.
- Changing a keyword pattern changes the candidates on the regression corpus (`corpus:report`).
- Unit tests cover R1 to R6 (open, see task 8).
