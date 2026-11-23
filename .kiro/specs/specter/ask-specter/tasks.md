# Spec 10 — Ask Specter (Tasks)

`[x]` means the code exists in the repository and was checked. Spec 10 is closed.

## Built

- [x] 1 Retrieval of matching sections on the device, capped by the token budget. _R1.2_
- [x] 2 `askDocument`, prompt and reply parsing; citations limited to sections that were sent. _R1.3, R1.5, R1.6_
- [x] 3 Ask tab: thread, "what will be sent" preview, failure with Retry, no-AI card. _R1.1, R4_
- [x] 4 "Not stated" chip and "The terms do not say." _R1.4_
- [x] 5 Citation chips open the saved passage and try the live page; fallback notice. `showExcerptOnPage`. _R2.1, R2.2_
- [x] 6 Cited excerpts are unverified and never start Possession; popover omits "Source verified". _R2.3_
- [x] 7 Suggestions after an answer, without repeats. _R3.1_
- [x] 8 Explain on a finding fills the Ask box. `askAbout`. _R3.2_
- [x] 9 Unit tests: `packages/ai/test/ask.test.ts` (parse, citation filter, not-stated, invalid output, prompt) and
  `apps/extension/test/ask.test.ts` (Explain hand-off, excerpt start and item). _R1, R2, R3_

## Not yet checked in Chrome

- Citation chip highlighting on a real page, and Explain filling the box, have typecheck and unit tests only.
  The live Ask call was checked earlier with a hosted provider (Spec 4 and the Ask commit).

## Carried forward

- "What changed since I agreed?" and asking over saved versions: Specs 8 and 9.
