# Analysis: clauses, verification and AI

**Status:** the logic is built and tested (92 core tests, 16 AI tests). It is not yet wired into the
side panel, so it does not run in Chrome. The AI provider calls have not been tested against a live
API.

## Pipeline

1. **Nominate candidates** (`packages/core/src/classify`). Keyword rules pick out clauses in seven
   categories: billing, cancellation, privacy, content rights, disputes, account control and
   liability. Keywords only nominate. A negated clause ("we do not automatically renew") is still
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

Anthropic, OpenAI, Google and Ollama, each one `fetch` call (`providers.ts`). The key is sent in a
header, never in a URL. Errors are typed: `invalid_key`, `rate_limited`, `network`, `not_running`
and `bad_response`. Ollama is treated as not running when the connection fails.

Model names in the Settings are defaults to be checked against each provider's current list.

## Cost and cache

- `estimateCost` gives about one token per four characters. It shows "Price not set" until a price
  is configured for the model. No price is assumed.
- Cache key: document hash, model and prompt version. Changing the prompt invalidates old results.

## Limits

- Model output is checked, not trusted. A correct-looking finding can still be wrong about
  meaning; the quote check proves the words exist, not that the reading is right.
- Only English keyword rules.
- Sends excerpts to the chosen provider only when the user presses Analyze.
