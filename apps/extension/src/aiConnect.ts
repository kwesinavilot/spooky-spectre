import { clearSecret, getSecret, setSecret } from './secrets';
import { getPrefs, setPrefs } from './prefs';

/**
 * Key setup, "Test connection" and the model list for onboarding step 5 and
 * AI connectivity. The model list comes from each provider's own endpoint, so
 * no model name is hardcoded. The key never goes to a web page or content
 * script, and it is never logged.
 */
export type ProviderId = 'anthropic' | 'openai' | 'google' | 'ollama';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** Origin pattern for the optional host permission (asked from a click). */
  origin: string;
  needsKey: boolean;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'anthropic', label: 'Anthropic', origin: 'https://api.anthropic.com/*', needsKey: true },
  { id: 'openai', label: 'OpenAI', origin: 'https://api.openai.com/*', needsKey: true },
  { id: 'google', label: 'Google', origin: 'https://generativelanguage.googleapis.com/*', needsKey: true },
  { id: 'ollama', label: 'Ollama (local model)', origin: 'http://localhost/*', needsKey: false },
];

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
 * Pulls model ids out of a provider's list reply. Google lists embedding and
 * other models too, so only those that support generateContent are kept.
 * Pure, so it can be tested without a network.
 */
export function parseModelIds(id: ProviderId, body: unknown): string[] {
  const b = body as Record<string, unknown> | null;
  if (!b) return [];
  if (id === 'anthropic' || id === 'openai') {
    const data = Array.isArray(b.data) ? (b.data as { id?: unknown }[]) : [];
    return data.map((m) => m.id).filter((x): x is string => typeof x === 'string');
  }
  if (id === 'google') {
    const models = Array.isArray(b.models) ? (b.models as { name?: unknown; supportedGenerationMethods?: unknown }[]) : [];
    return models
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => (typeof m.name === 'string' ? m.name.replace(/^models\//, '') : ''))
      .filter(Boolean);
  }
  const models = Array.isArray(b.models) ? (b.models as { name?: unknown }[]) : [];
  return models.map((m) => m.name).filter((x): x is string => typeof x === 'string');
}

export interface TestResult {
  status: ConnectionStatus;
  models: string[];
  latencyMs: number;
}

/**
 * Must start from a click: Chrome only shows the permission prompt for the
 * provider's origin from a user gesture. Asks the provider for its model list.
 * On success the key is saved (if one was typed), and the list is stored for
 * the model picker. A saved model that is no longer listed is cleared.
 */
export async function testAndListModels(id: ProviderId, key: string): Promise<TestResult> {
  const info = PROVIDERS.find((p) => p.id === id)!;
  const granted = await chrome.permissions.request({ origins: [info.origin] });
  if (!granted) return { status: 'no_permission', models: [], latencyMs: 0 };

  // An empty field means "test the key I already saved".
  const useKey = key || (info.needsKey ? ((await getSecret(keyName(id))) ?? '') : '');
  const { url, init } = request(id, useKey);
  const started = performance.now();
  try {
    const res = await fetch(url, { ...init, credentials: 'omit', signal: AbortSignal.timeout(10_000) });
    const latencyMs = Math.round(performance.now() - started);
    const status = statusFromHttp(id, res.status);
    if (status !== 'connected' && status !== 'rate_limited') return { status, models: [], latencyMs };

    const body = await res.json().catch(() => null);
    const models = parseModelIds(id, body);
    if (info.needsKey && key) await setSecret(keyName(id), key);

    const prefs = await getPrefs();
    await setPrefs({
      aiModelList: models,
      aiModelProvider: id,
      aiModel: prefs.aiModelProvider === id && models.includes(prefs.aiModel) ? prefs.aiModel : '',
      aiLastTestAt: new Date().toISOString(),
    });
    return { status, models, latencyMs };
  } catch {
    return {
      status: id === 'ollama' ? 'ollama_not_running' : 'network_error',
      models: [],
      latencyMs: 0,
    };
  }
}

/** Onboarding step 5 uses this: the status only. */
export async function testConnection(id: ProviderId, key: string): Promise<ConnectionStatus> {
  return (await testAndListModels(id, key)).status;
}

export const keyName = (id: ProviderId) => `apiKey:${id}`;

export async function hasSavedKey(id: ProviderId): Promise<boolean> {
  return (await getSecret(keyName(id))) !== null;
}

export async function removeKey(id: ProviderId): Promise<void> {
  await clearSecret(keyName(id));
}
