# Spec 10 — Ask Specter (Design)

Written after most of the code, to match what exists.

## Pieces

| Piece | File | Job |
| --- | --- | --- |
| Retrieval | `packages/core/src/ask/retrieve.ts` | `retrieveSections(doc, question, maxChars)`: ranks sections by the question's words, caps by `ASK_MAX_SECTIONS` and the budget. On-device. |
| Prompt and parse | `packages/ai/src/ask.ts` | `ASK_SYSTEM_PROMPT`, `buildAskPrompt`, `parseAskReply` (strips a code fence, validates with `AskReply`). |
| Ask call | `packages/ai/src/ask.ts` | `askDocument`: one model call. Keeps only citations that name a section that was sent. No valid citation becomes "The terms do not say." with `notStated: true`. |
| Tab | `apps/extension/entrypoints/sidepanel/AskTab.tsx` | Thread, suggestions, "what will be sent" preview, citation chips, Retry. |
| Explain | `FindingsTab.tsx` and `store/sidepanel.ts` | `askAbout(question)` switches to Ask and sets `askDraft`. The tab moves it into the box and clears it. |
| Cited excerpt | `src/showOnPage.ts` | `excerptStart` (first 160 characters at a word boundary), `excerptItemFor`, `showExcerptOnPage`. |

## Decisions

- **Citations are checked in code.** The model's ids are intersected with the ids sent. This is the Ask
  version of the quote check: no source, no answer.
- **A cited section is not a finding.** The page receives a `MarkItem` with `verified: false`, `concern: 'low'`,
  `confidence: 0`. Possession needs High, verified and 0.85 or more, so it never starts. The popover shows
  the "Source verified" chip only when `verified` is true.
- **Highlight by the opening words of the section.** A whole section is too long to match on the page. The
  opening 160 characters usually are unique. When they do not match, the saved passage in the panel is the
  fallback and says so.
- **Explain does not send.** It fills the box. The preview of what would be sent updates as for any question.
- **No saved threads.** Memory only, until Spec 8 decides what the Graveyard stores.

## Not in this spec

- Asking across saved agreements, and "What changed since I agreed?". That needs Spec 8 (saved versions) and
  Spec 9 (comparison).
- Streaming answers.
