# Spec 4 — AI Provider Layer and BYOK (Requirements)

> Scope: how Specter talks to a model the user chose and paid for (bring your own key). Provider
> setup, key storage, connection test, model choice, token budget, and the cost estimate shown
> before a send. No clause logic (Spec 5) and no on-page effects (Spec 6). Written after the code.

## 1. Overview

Specter analyses an agreement with a model only when the user asks for it. The user brings the key
for their provider. Specter never ships a key, never stores it outside `chrome.storage.local`, and
never shows it again after it is saved.

## 2. Out of scope

- Clause finding, verification, and effects (Spec 3, Spec 5).
- Ask Specter's retrieval and answer format (Spec 10).
- Redaction of personal data in agreement text (decided against; see §6).
- Live checks against providers. These are done by the user with their own keys (see tasks).

## 3. Glossary

- **Provider:** one of OpenAI, Anthropic, Google Gemini, DeepSeek, Mistral, Grok (xAI), Groq, or
  Ollama (on this computer, no key).
- **Connection:** a saved provider, its key (if it needs one), and a chosen model name.
- **Token budget:** the most agreement text, in tokens, that one analysis or question may send.

## 4. Requirements

### R1 Providers through one layer

- R1.1 Every model call goes through `packages/ai`, using the Vercel AI SDK (`generateText`) and the
  provider packages `@ai-sdk/*`.
- R1.2 The provider list is the eight providers in §3. Adding one means one entry in the AI package,
  one entry in the extension's provider list, and one model-list parser.
- R1.3 The AI package has no storage and no logging. The caller passes the key in for each call.

### R2 Keys

- R2.1 Keys live only in `chrome.storage.local`, under one name per provider.
- R2.2 A saved key is never displayed. The screen shows "A key is saved on this device" with Replace
  and Remove.
- R2.3 A key is sent only to its provider's origin, in a header, never in a URL.
- R2.4 Removing a key clears the key and, if that provider was connected, the connection.

### R3 Connection test and model choice

- R3.1 "Test connection" must start from a click. It asks Chrome for access to the provider's origin
  and reads that provider's model list.
- R3.2 No model name is hardcoded. The model picker shows only names the provider listed.
- R3.3 Until the user chooses a model, analysis and Ask do not call the provider. They stop with a
  message that says to choose a model.
- R3.4 A chosen model that the provider no longer lists is cleared.

### R4 Errors

- R4.1 A 401 or 403 is reported as a rejected key, and a 429 as rate limiting.
- R4.2 Failures do not retry silently. The user sees the error at once and can press Retry.
- R4.3 Ollama is reported as not running when its local endpoint is unreachable.

### R5 Token budget and cost

- R5.1 The token budget is a setting from 1,000 to 8,000 tokens, default 3,000. The stored value is
  clamped to that range when read.
- R5.2 The budget limits the agreement text in one analysis or one question. Sections beyond the
  limit are not sent.
- R5.3 Before an analysis, the preview shows the approximate token count of the exact prompt. Specter
  shows no dollar cost.

### R6 Consent before sending

- R6.1 With "Preview before sending" on (default), an analysis waits for the user to press Send after
  the preview.
- R6.2 Ask Specter shows the number of sections and characters before each question is sent.
- R6.3 Nothing is sent to a provider until the user presses Test connection, Send, or Ask.

### R7 Session cache

- R7.1 "Reuse results this session" is off by default.
- R7.2 When on, results are kept in memory for the same agreement hash, model and prompt version. They
  are never written to storage and are cleared when the side panel closes.

## 5. Acceptance

- Typecheck passes for `@specter/ai` and the extension.
- The AI package tests pass, including the mapping of 401, 429, and an unreachable Ollama.
- Each provider in §3 can be tested and used by the user with their own key (open task 1).

## 6. Decisions

- **Redaction is not built.** The master prompt's design asked to redact personal fields. Specter never
  reads password or payment fields, so the form values it could redact are never read. Agreement text
  often contains contact emails, and redacting them would break verbatim quote checks. The toggle is
  not in the screen.
- **No SDK retries.** The SDK's default retries hide rate limits for seconds at a time. Errors are shown
  at once instead.
- **Google's id is `gemini`.** A Google key saved under the old `google` id is not used and must be
  reconnected.
