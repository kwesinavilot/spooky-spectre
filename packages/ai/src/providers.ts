import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createXai } from '@ai-sdk/xai';
import { APICallError, generateText, type LanguageModel } from 'ai';

/**
 * Provider calls through the Vercel AI SDK (Spec 4). Every AI call in Specter
 * goes through this file. The caller depends only on `ChatProvider`. Keys are
 * passed in per call and are never stored or logged here.
 */
export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'mistral' | 'grok' | 'groq' | 'ollama';

export type ProviderErrorCode = 'invalid_key' | 'rate_limited' | 'network' | 'not_running' | 'bad_response';

export class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface ChatRequest {
  model: string;
  system: string;
  user: string;
  apiKey?: string;
  signal?: AbortSignal;
}

export interface ChatProvider {
  readonly id: ProviderId;
  complete(req: ChatRequest): Promise<string>;
}

/** The fetch used for requests. Injectable so tests can stop the network. */
export type FetchLike = typeof fetch;

/** Builds the SDK language model for one provider and model id. */
function languageModel(id: ProviderId, modelId: string, apiKey: string, fetchImpl?: FetchLike): LanguageModel {
  switch (id) {
    case 'openai':
      return createOpenAI({ apiKey, fetch: fetchImpl })(modelId);
    case 'anthropic':
      // The header lets the browser call the API directly; the extension requests this origin.
      return createAnthropic({
        apiKey,
        fetch: fetchImpl,
        headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
      })(modelId);
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey, fetch: fetchImpl })(modelId);
    case 'deepseek':
      return createDeepSeek({ apiKey, fetch: fetchImpl })(modelId);
    case 'mistral':
      return createMistral({ apiKey, fetch: fetchImpl })(modelId);
    case 'grok':
      return createXai({ apiKey, fetch: fetchImpl })(modelId);
    case 'groq':
      return createGroq({ apiKey, fetch: fetchImpl })(modelId);
    case 'ollama':
      // Ollama serves an OpenAI-compatible API on this computer. No key.
      return createOpenAICompatible({
        name: 'ollama',
        baseURL: 'http://localhost:11434/v1',
        fetch: fetchImpl,
      })(modelId);
  }
}

/** Turns an SDK failure into the ProviderError codes the UI explains. Aborts pass through. */
export function toProviderError(id: ProviderId, err: unknown, aborted: boolean): unknown {
  if (aborted || (err as { name?: string } | null)?.name === 'AbortError') return err;
  // An error with an HTTP status came from the provider. One without a status never got a reply.
  if (APICallError.isInstance(err) && err.statusCode !== undefined) {
    const status = err.statusCode;
    if (status === 401 || status === 403) return new ProviderError('invalid_key', `${id} rejected the key (${status}).`);
    if (status === 429) return new ProviderError('rate_limited', `${id} is rate limiting requests.`);
    if (status === 400) return new ProviderError('bad_response', `${id} rejected the request (400).`);
    return new ProviderError('network', `${id} returned status ${status ?? 'unknown'}.`);
  }
  // No HTTP status means the request never got a reply: the host was unreachable.
  if (id === 'ollama') return new ProviderError('not_running', 'Ollama is not running on this computer.');
  return new ProviderError('network', `Could not reach ${id}.`);
}

export function providerFor(id: ProviderId, fetchImpl?: FetchLike): ChatProvider {
  return {
    id,
    async complete({ model, system, user, apiKey, signal }) {
      try {
        const { text } = await generateText({
          model: languageModel(id, model, apiKey ?? '', fetchImpl),
          instructions: system,
          messages: [{ role: 'user', content: user }],
          abortSignal: signal,
          // No silent retries: a rate limit or a bad key is shown to the user at once, with Retry.
          maxRetries: 0,
        });
        if (!text) throw new ProviderError('bad_response', `${id} sent an empty reply.`);
        return text;
      } catch (err) {
        throw toProviderError(id, err, signal?.aborted === true);
      }
    },
  };
}
