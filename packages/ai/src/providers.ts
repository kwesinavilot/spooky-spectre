/**
 * Provider calls (Spec 4). Each provider is a single HTTP request, so the
 * caller depends only on `ChatProvider`. Keys are passed in per call and are
 * never stored or logged here. `fetchImpl` is injectable for tests.
 */
export type ProviderId = 'anthropic' | 'openai' | 'google' | 'ollama';

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

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

function statusError(status: number, id: ProviderId): ProviderError {
  if (status === 401 || status === 403) return new ProviderError('invalid_key', `${id} rejected the key (${status}).`);
  if (status === 429) return new ProviderError('rate_limited', `${id} is rate limiting requests.`);
  return new ProviderError('network', `${id} returned status ${status}.`);
}

async function send(id: ProviderId, fetchImpl: FetchLike, url: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, credentials: 'omit' });
  } catch (err) {
    if (id === 'ollama') throw new ProviderError('not_running', 'Ollama is not running on this computer.');
    if ((err as { name?: string }).name === 'AbortError') throw err;
    throw new ProviderError('network', `Could not reach ${id}.`);
  }
  if (!res.ok) throw statusError(res.status, id);
  try {
    return await res.json();
  } catch {
    throw new ProviderError('bad_response', `${id} sent a reply that is not JSON.`);
  }
}

const pick = (v: unknown, path: (o: any) => unknown): string => {
  const out = path(v);
  if (typeof out !== 'string') throw new ProviderError('bad_response', 'The provider reply had an unexpected shape.');
  return out;
};

export function anthropic(fetchImpl: FetchLike = fetch): ChatProvider {
  return {
    id: 'anthropic',
    async complete({ model, system, user, apiKey, signal }) {
      const body = await send('anthropic', fetchImpl, 'https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey ?? '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model, max_tokens: 2048, system, messages: [{ role: 'user', content: user }] }),
      });
      return pick(body, (o) => o.content.find((b: { type: string }) => b.type === 'text')?.text);
    },
  };
}

export function openai(fetchImpl: FetchLike = fetch): ChatProvider {
  return {
    id: 'openai',
    async complete({ model, system, user, apiKey, signal }) {
      const body = await send('openai', fetchImpl, 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey ?? ''}` },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      return pick(body, (o) => o.choices[0].message.content);
    },
  };
}

export function google(fetchImpl: FetchLike = fetch): ChatProvider {
  return {
    id: 'google',
    async complete({ model, system, user, apiKey, signal }) {
      // The key goes in a header, so it never appears in a URL, history or log.
      const body = await send(
        'google',
        fetchImpl,
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          signal,
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey ?? '' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        },
      );
      return pick(body, (o) => o.candidates[0].content.parts[0].text);
    },
  };
}

export function ollama(fetchImpl: FetchLike = fetch, baseUrl = 'http://localhost:11434'): ChatProvider {
  return {
    id: 'ollama',
    async complete({ model, system, user, signal }) {
      const body = await send('ollama', fetchImpl, `${baseUrl}/api/chat`, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          format: 'json',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      return pick(body, (o) => o.message.content);
    },
  };
}

export function providerFor(id: ProviderId, fetchImpl?: FetchLike): ChatProvider {
  switch (id) {
    case 'anthropic':
      return anthropic(fetchImpl);
    case 'openai':
      return openai(fetchImpl);
    case 'google':
      return google(fetchImpl);
    case 'ollama':
      return ollama(fetchImpl);
  }
}
