import { clearSecret, getSecret, setSecret } from './secrets';

/**
 * Key setup and "Test connection" for onboarding step 5 and AI connectivity.
 * Only checks that the provider accepts the key (it lists models); the real
 * provider layer is Spec 4. Nothing here is logged, and the key never goes to
 * a web page or content script.
 */
export type ProviderId = 'anthropic' | 'openai' | 'google' | 'ollama';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** Origin pattern for the optional host permission (asked from the Test click). */
  origin: string;
  needsKey: boolean;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'anthropic', label: 'Anthropic', origin: 'https://api.anthropic.com/*', needsKey: true },
  { id: 'openai', label: 'OpenAI', origin: 'https://api.openai.com/*', needsKey: true },
  { id: 'google', label: 'Google', origin: 'https://generativelanguage.googleapis.com/*', needsKey: true },
  { id: 'ollama', label: 'Ollama (local model)', origin: 'http://localhost/*', needsKey: false },
];

/** Model names used when the user has not chosen one. Check them against the provider's current list. */
export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: 'claude-3-5-haiku-latest',
  openai: 'gpt-4o-mini',
  google: 'gemini-1.5-flash',
  ollama: 'llama3.1',
};

export type ConnectionStatus =
  | 'idle'
  | 'testing'
  | 'connected'
  | 'invalid_key'
  | 'rate_limited'
  | 'no_permission'
  | 'network_error'
  | 'ollama_not_running';

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  idle: 'Not connected',
  testing: 'Testing',
  connected: 'Connected',
  invalid_key: 'Key not accepted',
  rate_limited: 'Connected, rate limited',
  no_permission: 'Access not granted',
  network_error: 'Could not reach the provider',
  ollama_not_running: 'Ollama is not running',
};

function request(id: ProviderId, key: string): { url: string; init: RequestInit } {
  switch (id) {
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/models',
        init: {
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
        },
      };
    case 'openai':
      return { url: 'https://api.openai.com/v1/models', init: { headers: { authorization: `Bearer ${key}` } } };
    case 'google':
      // Key in a header, not the URL, so it never appears in history or logs.
      return {
        url: 'https://generativelanguage.googleapis.com/v1beta/models',
        init: { headers: { 'x-goog-api-key': key } },
      };
    case 'ollama':
      return { url: 'http://localhost:11434/api/tags', init: {} };
  }
}

/** Maps an HTTP status to a connection status. Pure, so it is unit tested. */
export function statusFromHttp(id: ProviderId, status: number): ConnectionStatus {
  if (status >= 200 && status < 300) return 'connected';
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 401 || status === 403) return id === 'ollama' ? 'network_error' : 'invalid_key';
  return 'network_error';
}

/**
 * Must start from a click: Chrome only shows the permission prompt for the
 * provider's origin from a user gesture. Saves the key only if it works.
 */
export async function testConnection(id: ProviderId, key: string): Promise<ConnectionStatus> {
  const info = PROVIDERS.find((p) => p.id === id)!;
  const granted = await chrome.permissions.request({ origins: [info.origin] });
  if (!granted) return 'no_permission';
  // An empty field means "test the key I already saved".
  const useKey = key || (info.needsKey ? ((await getSecret(keyName(id))) ?? '') : '');
  const { url, init } = request(id, useKey);
  try {
    const res = await fetch(url, { ...init, credentials: 'omit', signal: AbortSignal.timeout(10_000) });
    const status = statusFromHttp(id, res.status);
    if (status === 'connected' || status === 'rate_limited') {
      if (info.needsKey && key) await setSecret(keyName(id), key);
    }
    return status;
  } catch {
    return id === 'ollama' ? 'ollama_not_running' : 'network_error';
  }
}

export const keyName = (id: ProviderId) => `apiKey:${id}`;

export async function hasSavedKey(id: ProviderId): Promise<boolean> {
  return (await getSecret(keyName(id))) !== null;
}

export async function removeKey(id: ProviderId): Promise<void> {
  await clearSecret(keyName(id));
}
