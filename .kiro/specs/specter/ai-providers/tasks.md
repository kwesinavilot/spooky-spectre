# Spec 4 — AI Provider Layer and BYOK (Tasks)

`[x]` means the code exists in the repository and typechecks. Open items are below.

## Built

- [x] 1 `packages/ai` providers on the Vercel AI SDK: OpenAI, Anthropic, Gemini, DeepSeek, Mistral,
  Grok, Groq, Ollama. `providerFor`, `toProviderError`, `maxRetries: 0`. _R1, R4_
- [x] 2 Extension provider list and origins (`apps/extension/src/aiConnect.ts`), Test connection
  behind a click, key saved only on success. _R2, R3_
- [x] 3 Model list per provider, `parseModelIds`, picker that clears a model no longer listed. _R3_
- [x] 4 Keys in `chrome.storage.local`, shown only as saved, Replace and Remove. _R2_
- [x] 5 AI connectivity screen: status, provider, key, access grant, Test connection, model picker,
  "Preview before sending", "Reuse results this session", token budget slider. _R3, R5, R6, R7_
- [x] 6 Token budget: `prefs.tokenBudget` clamped to 1,000–8,000; `budgetChars`; applied in analysis,
  Ask retrieval, Page preview and Ask preview. _R5_
- [x] 7 Token count over the exact prompt, shown in the Page preview. No dollar cost. _R5.3_
- [x] 8 Session-only cache keyed by hash, model and prompt version. _R7_
- [x] 9 AI package tests: Anthropic request keeps the key out of the URL, 401 and 429 mapping, and an
  unreachable Ollama reported as `not_running`. _Acceptance_
- [x] 10 Redaction decided against; recorded in `requirements.md` §6. _R6 note_

## Open

- [x] 11 Live check, by the user, with their own key, for each provider: Test connection, pick a
  model, run one analysis and one Ask question. Record the provider and model that worked here.
- [ ] 12 Confirm the Ollama endpoint on the user's machine (`http://localhost:11434`).
