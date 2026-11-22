# Spec 3 — Candidate Finding and Segmentation (Design)

Written after the code. The file names are the ones in the repository.

## 1. Pipeline

```
ExtractedDocument.sections  (Spec 2: offsets, ids, headings)
        │
        ▼  for each section
splitClauses(sectionText)   → clauses with offsets relative to the section
        │                      (offset + section.startOffset = absolute)
        ▼  for each clause, for each category
CATEGORY_KEYWORDS[category].test(clause)  → match → Candidate
        │
        ▼  collect all matches, keep the MAX_CANDIDATES (40) strongest by keyword hits,
           return them in document order
Candidate[]  → analysis (Spec 5) builds the prompt from these
```

## 2. Modules

| File | Role |
| --- | --- |
| `packages/core/src/classify/index.ts` | `Candidate`, `CATEGORY_KEYWORDS`, `NEGATION`, `splitClauses`, `findCandidates`, `MAX_CANDIDATES` |
| `packages/ai/src/prompts.ts` | `buildUserPrompt` lists the candidates and the sections around them (`contextSections`) |

## 3. Decisions

- **Keywords nominate, they do not judge.** A keyword match means "a reader should look at this".
  The model decides what the clause means.
- **Negations are flagged, not dropped.** The master prompt puts negation with the model. Dropping
  "we do not automatically renew" would hide the clause the reader most needs.
- **Stems, not exact words.** Patterns end in `\w*` so that inflections match. This can over-match;
  the cap and the model keep the cost of that bounded.
- **Cap for cost and data, ranked.** Only 40 clauses reach the model per analysis. The cap is the
  limit on how much agreement text leaves the device, so it is a privacy control too. Which 40 are kept
  is decided by keyword strength, not by position in the document.
- **Sentence split by punctuation.** Simple and fast, and offsets stay exact. It mis-splits
  abbreviations such as `e.g.` or `U.S.`.

## 4. Known limits

1. **Cap ranking (resolved).** The cap used to keep the first 40 matches in document order, which
   skipped later sections of long agreements. It now keeps the strongest 40 and returns them in
   document order (task 7).
2. **Abbreviations (accepted).** `e.g.`, `i.e.` and `U.S.` end a clause early. This only adds a
   candidate; it does not drop or misplace one. Pinned by a test.
3. **Lists without punctuation.** Items in a bulleted list that have no final punctuation are merged
   into the clause before them. Not addressed; the line break already splits most list items.
4. **Keyword coverage (partly resolved).** The corpus scan added the gaps listed in task 10. A clause
   that says "you may lose access" with no keyword from the table is still not nominated. The
   categories are a starting list, not a full taxonomy, and new words should be added only when the
   corpus shows a real gap.
