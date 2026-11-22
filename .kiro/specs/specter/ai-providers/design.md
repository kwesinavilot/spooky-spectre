# Spec 4 — AI Provider Layer and BYOK (Design)

Written after the code. File names are the ones in the repository.

## 1. Layers

```
side panel (AiConnectivity, PageTab, AskTab)
        │  src/aiConnect.ts    keys, Test connection, model list
        │  src/analysisRunner  connectionFor(), runAnalysis(), session cache
        ▼
packages/ai
        src/providers.ts       providerFor(id) → ChatProvider.complete(); SDK calls; error mapping
        src/prompts.ts         budgetChars(), buildUserPrompt(maxChars)
        src/analyze.ts         analyzeDocument (uses ChatProvider)
        src/ask.ts             askDocument (uses ChatProvider)
        src/cost.ts            estimateTokens
        src/cache.ts           analysisCacheKey
```

## 2. Provider calls

- `languageModel(id, model, apiKey)` builds the SDK model: `createOpenAI`, `createAnthropic`,
  `createGoogleGenerativeAI`, `createDeepSeek`, `createMistral`, `createXai`, `createGroq`, and for
  Ollama `createOpenAICompatible` with `http://localhost:11434/v1`.
- Anthropic gets the header `anthropic-dangerous-direct-browser-access`, which the browser needs.
- `complete` calls `generateText` with `instructions` (system text), one user message, the abort
  signal, and `maxRetries: 0`.
- `toProviderError` maps SDK errors. An `APICallError` with a status maps 401/403 to `invalid_key`,
  429 to `rate_limited`, 400 to `bad_response`, and others to `network`. An error without a status
  means the host never answered: Ollama gives `not_running`, others `network`. Aborts pass through
  unchanged.

## 3. Model lists

Each provider's list endpoint is called from the extension, not the AI package, because it runs
during Test connection:

| Provider | Endpoint | Parser |
| --- | --- | --- |
| OpenAI, Anthropic, DeepSeek, Mistral, Grok, Groq | `…/models` | `data[].id` |
| Google Gemini | `/v1beta/models` | `models[]` that support `generateContent`, `models/` prefix removed |
| Ollama | `localhost:11434/api/tags` | `models[].name` |

`parseModelIds` is pure. Results are saved to `prefs.aiModelList` with the provider id.

## 4. Budget

`prefs.tokenBudget` is clamped to 1,000–8,000 in `getPrefs`. The caller converts it with
`budgetChars` (×4) and passes it to `analyzeDocument({ maxChars })` and `retrieveSections` in Ask.
`buildUserPrompt` and `contextSections` stop adding sections past `maxChars`. The preview counts the
same prompt, so the number shown is what is sent.

## 5. Decisions and limits

- Providers call the SDK from the side panel. No background worker holds keys.
- `maxRetries: 0`: the user sees a 429 at once and presses Retry.
- The token count uses about four characters per token. The SDK does not report usage before a call,
  so the figure is an estimate. There is no price table and no dollar cost.
- The session cache is in memory only. It is not a substitute for a stored history (Spec 8).
- Live provider behaviour is not covered by tests. Tests use injected `fetch` stubs.
