# Analysis: clauses, verification and AI

**Status:** the logic is built and tested (92 core tests, 16 AI tests). It is wired into the side
panel: Analyze agreement runs it, the Findings tab shows the result, and Show on page highlights a
quote on the live page. The side panel wiring is typechecked only and has not been run in Chrome.
The AI provider calls have not been tested against a live API.

**Before the AI call:** when a model is connected and "preview before sending" is on (default), the
side panel shows how many clause sections will be sent and waits for Send. Only the candidate
sections go to the provider, never the rest of the page. Findings are kept in memory only.

**Ask Specter:** the Ask tab retrieves the matching sections with `retrieveSections` (core, pure),
sends them with `askDocument` (ai), and keeps only citations that point to a section that was sent.
An answer without such a citation is not shown as an answer. Citation chips show the section text in
the panel; they do not scroll the page.

**Not built yet:** Explain on a finding (it can now open Ask with a question), the moment-of-agreement Possession trigger and its
frequency caps, the Quiet and Immersive levels for highlights, the ghost marker and popover, and
Save snapshot.

## Pipeline

1. **Nominate candidates** (`packages/core/src/classify`). Keyword rules pick out clauses in seven
   categories: billing, cancellation, privacy, content rights, disputes, account control and
   liability. Keywords only nominate. The cap keeps the 40 strongest candidates (most keyword hits), in document
   order. A negated clause ("we do not automatically renew") is still
   nominated, and marked as negated so the model reads it correctly. At most 40 candidates.
2. **Ask the model** (`packages/ai`). The prompt includes only the sections that hold candidates,
   plus their neighbours, capped at 12,000 characters. The model must return JSON with a quote for
   each finding, copied exactly from one section. It never returns character offsets.
3. **Locate and verify** (`packages/core/src/validate`). Code finds each quote in its section.
   It rejects a quote that is absent, outside its section, or at the wrong offsets. It also rejects
   any amount or date in the summary that does not appear in the quote.
4. **Retry once.** Drafts that fail are sent back once, with the reason. A correction is matched to
   the failed draft by section. Anything still failing is dropped and counted as rejected.
5. **Effect.** Only verified findings get an effect (`packages/core/src/effects`):
   - low concern: whisper;
   - medium concern: hand for billing, cancellation or privacy; haunting otherwise;
   - high concern: possession at confidence 0.85 or more, otherwise haunting.

## Providers

Model calls go through the Vercel AI SDK (`packages/ai/src/providers.ts`). Eight providers: OpenAI,
Anthropic, Google Gemini, DeepSeek, Mistral, Grok (xAI), Groq, and Ollama on this computer. Each
call uses one `generateText` with a single user message and no SDK retries. Keys are passed per
call and never stored in the AI package. Errors are typed: `invalid_key` (401 or 403),
`rate_limited` (429), `bad_response` (400 or an empty reply), `network`, and `not_running` (Ollama
unreachable). The Google provider id is `gemini`, so a Google key saved under the old id must be
reconnected.

**No model name is hardcoded.** Test connection asks the provider for its model list (Anthropic
and OpenAI `/v1/models`, Google `/v1beta/models` keeping only models that support `generateContent`,
Ollama `/api/tags`). The user picks one. Until a model is chosen, analysis and Ask stop with
"Choose a model" and nothing is sent. The list and the choice are stored in `chrome.storage.local`
as names only; the key is never shown again.

**Vercel AI SDK:** adopted, as the master prompt asks. The AI package depends on `ai` and the
`@ai-sdk/*` provider packages. Ollama uses `@ai-sdk/openai-compatible` against its local
OpenAI-compatible endpoint.

**AI connectivity screen** (side panel → key icon): provider, key (never shown; Replace and Remove),
Test connection, model picker, access to the provider's origin (Grant access), "Preview before
sending", "Reuse results this session" and a token budget slider. Nothing in the screen sends agreement
text.

**Token budget:** a slider (1,000 to 8,000 tokens, default 3,000; about four characters per token)
caps the agreement text sent for one analysis or one question. The Page tab preview and the Ask
preview count the same budgeted text, and no section is sent past the limit.

**Redaction:** not built, by decision. Specter never reads password or payment fields, so there are
no personal form values to redact. Redacting addresses in agreement text would also break verbatim
quote checks, since privacy policies often print contact emails.

## Cost and cache

- `estimateTokens` gives about one token per four characters, over the exact prompt that would be
  sent. The preview shows the token count. Specter shows no dollar cost: prices are not part of the
  app.
- Reuse results this session (off by default) keeps results in memory, keyed by agreement hash,
  model and prompt version. Nothing is written to storage, and the cache is empty after the side
  panel closes.

## Limits

- Model output is checked, not trusted. A correct-looking finding can still be wrong about
  meaning; the quote check proves the words exist, not that the reading is right.
- Only English keyword rules.
- Sends excerpts to the chosen provider only when the user presses Analyze.
