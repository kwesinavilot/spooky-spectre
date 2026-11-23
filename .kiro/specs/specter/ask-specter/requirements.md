# Spec 10 — Ask Specter (Requirements)

Ask lets the user put a question to one analyzed agreement and get a short answer that cites the
sections it came from. Rules: `.kiro/steering/design.md` §6C (Ask) and Flow 4, and `product.md`.

## R1 Questions and answers

- R1.1 Ask works on the agreement last analyzed in the side panel. With none, the tab says to analyze first.
- R1.2 Specter picks the sections that match the question on the device (`retrieveSections`) and sends only
  those, within the token budget. The section count and size are shown before the user presses Ask.
- R1.3 The answer uses only the sections sent. It never states an amount, date or percentage that is not in
  them, and never says a clause is legal or illegal.
- R1.4 When the sections do not answer the question, the answer reads "The terms do not say." and carries a
  "Not stated" chip.
- R1.5 An answer that cites no section that was sent is shown as "The terms do not say.", not as an answer.
- R1.6 Invalid model output is reported as a failure with Retry. It is never shown as an answer.

## R2 Citations

- R2.1 Every answer ends with citation chips, one per section relied on, labelled with the section heading.
- R2.2 Opening a chip shows the saved passage in the panel and tries to show it on the live page. When the
  passage cannot be matched, the panel says "Live highlighting isn't available. Showing the saved passage."
- R2.3 A cited excerpt on the page is not a finding. It is unverified, low concern, never starts Possession,
  and its popover does not say "Source verified".

## R3 Entry points

- R3.1 Suggested questions show on an empty thread and again after an answer. A suggestion already asked is
  not offered twice.
- R3.2 "Explain" on a finding opens Ask with a question about that finding in the box. The user presses
  Ask. Nothing is sent by Explain itself.

## R4 States and limits

- R4.1 States: sending (status line), answered, not stated, error with Retry.
- R4.2 With no AI connected, the input is replaced by "Connect an AI model to ask questions" and a button to
  AI connectivity.
- R4.3 The thread is kept in memory and cleared when another agreement is analyzed. Nothing is saved.
- R4.4 The footer says "Answers use only the excerpts of this agreement. Informational assistance, not legal
  advice."

## Acceptance

Ask a question that the agreement answers: the answer cites the section, and the chip opens the passage.
Ask one it does not answer: "The terms do not say." with "Not stated". Press Explain on a finding: Ask opens
with the question filled in and nothing sent.
