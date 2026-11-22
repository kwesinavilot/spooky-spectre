import { useEffect, useState } from 'react';
import { Button, Card, Chip, InsetCard, Toggle } from '@specter/ui';
import {
  hasSavedKey,
  PROVIDERS,
  removeKey,
  STATUS_LABEL,
  testAndListModels,
  type ConnectionStatus,
  type ProviderId,
} from '../../src/aiConnect';
import { getPrefs, setPrefs, type SpecterPrefs } from '../../src/prefs';
import { useSettings } from '../../src/store/settings';

const STATUS_VARIANT: Record<ConnectionStatus, 'ok' | 'high' | 'medium' | 'neutral'> = {
  idle: 'neutral',
  testing: 'neutral',
  connected: 'ok',
  invalid_key: 'high',
  rate_limited: 'medium',
  no_permission: 'medium',
  network_error: 'high',
  ollama_not_running: 'high',
};

/**
 * AI connectivity drill-in (design steering 6C). Shows the connection state,
 * the key (never its value), the model list the provider reported, and the
 * two AI settings that exist today. Nothing is sent to a provider except by
 * Test connection, which the user presses, or an analysis the user starts.
 */
export function AiConnectivity() {
  const storedProvider = useSettings((s) => s.providerId);
  const setProviderId = useSettings((s) => s.setProviderId);
  const [provider, setProvider] = useState<ProviderId>(
    () => (PROVIDERS.find((p) => p.id === storedProvider)?.id ?? 'anthropic'),
  );
  const info = PROVIDERS.find((p) => p.id === provider)!;
  const [prefs, setLocal] = useState<SpecterPrefs | null>(null);
  const [keySaved, setKeySaved] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const [granted, setGranted] = useState(false);

  const refresh = async (id: ProviderId) => {
    const p = PROVIDERS.find((x) => x.id === id)!;
    setLocal(await getPrefs());
    setKeySaved(p.needsKey ? await hasSavedKey(id) : true);
    setGranted(await chrome.permissions.contains({ origins: [p.origin] }));
  };

  useEffect(() => {
    void refresh(provider);
    setStatus('idle');
    setLatency(null);
    setKeyInput('');
    setReplacing(false);
  }, [provider]);

  const connectedHere = storedProvider === provider;
  const models = prefs && prefs.aiModelProvider === provider ? prefs.aiModelList : [];

  const test = async () => {
    setStatus('testing');
    const r = await testAndListModels(provider, keyInput);
    setStatus(r.status);
    setLatency(r.status === 'connected' || r.status === 'rate_limited' ? r.latencyMs : null);
    if (r.status === 'connected' || r.status === 'rate_limited') {
      setProviderId(provider);
      setKeyInput('');
      setReplacing(false);
    }
    await refresh(provider);
  };

  const disconnect = async () => {
    await removeKey(provider);
    if (connectedHere) setProviderId(null);
    if (prefs?.aiModelProvider === provider) await setPrefs({ aiModel: '', aiModelList: [], aiModelProvider: '' });
    setStatus('idle');
    await refresh(provider);
  };

  const grant = async () => {
    // Asked from this click: Chrome shows its own prompt for the one origin.
    await chrome.permissions.request({ origins: [info.origin] });
    await refresh(provider);
  };

  const shownStatus: ConnectionStatus = status !== 'idle' ? status : connectedHere && keySaved ? 'connected' : 'idle';
  const showKeyField = info.needsKey && (!keySaved || replacing);

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-h4 font-semibold">Status</h3>
          <Chip variant={STATUS_VARIANT[shownStatus]}>{STATUS_LABEL[shownStatus]}</Chip>
        </div>
        <p className="mt-2 text-small text-muted">
          {connectedHere && prefs?.aiLastTestAt
            ? `Last test ${new Date(prefs.aiLastTestAt).toLocaleString()}${latency !== null ? `, ${latency} ms` : ''}.`
            : 'No successful test yet.'}
        </p>
      </Card>

      <Card>
        <label htmlFor="ai-provider" className="text-small font-semibold text-fg">
          Provider
        </label>
        <select
          id="ai-provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as ProviderId)}
          className="mt-1 min-h-[44px] w-full rounded-[12px] border border-line bg-inset px-3 text-body text-fg"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        {info.needsKey ? (
          <div className="mt-3">
            {showKeyField ? (
              <>
                <label htmlFor="ai-key" className="text-small font-semibold text-fg">
                  API key
                </label>
                <input
                  id="ai-key"
                  type="password"
                  autoComplete="off"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-[12px] border border-line bg-inset px-3 font-mono text-small text-fg"
                />
                <p className="mt-1 text-caption text-muted">Stored only on this device. It is not shown again.</p>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-small text-fg">A key is saved on this device. It is not shown.</p>
                <Button variant="quiet" onClick={() => setReplacing(true)}>
                  Replace
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-caption text-muted">Ollama runs on this computer and needs no key.</p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-small text-fg">Access to {info.label}</span>
          {granted ? (
            <Chip variant="ok">Granted</Chip>
          ) : (
            <Button variant="secondary" onClick={() => void grant()}>
              Grant access
            </Button>
          )}
        </div>

        <div className="mt-3">
          <Button block onClick={() => void test()} disabled={status === 'testing' || (info.needsKey && showKeyField && !keyInput)}>
            {status === 'testing' ? 'Testing' : 'Test connection'}
          </Button>
        </div>
        {info.needsKey && showKeyField && !keyInput ? (
          <p className="mt-1 text-caption text-muted">Type a key to test it, or use the saved one by pressing Replace first.</p>
        ) : null}
      </Card>

      <Card>
        <label htmlFor="ai-model" className="text-small font-semibold text-fg">
          Model
        </label>
        {models.length > 0 ? (
          <select
            id="ai-model"
            value={prefs?.aiModel ?? ''}
            onChange={async (e) => {
              await setPrefs({ aiModel: e.target.value });
              setLocal(await getPrefs());
            }}
            className="mt-1 min-h-[44px] w-full rounded-[12px] border border-line bg-inset px-3 font-mono text-small text-fg"
          >
            <option value="">Choose a model</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-1 text-small text-muted">
            Test connection to load the models {info.label} offers. Analysis and questions need a chosen model.
          </p>
        )}
      </Card>

      <Card>
        <h3 className="mb-2 text-h4 font-semibold">Sending</h3>
        <Toggle
          label="Preview before sending"
          description="Show how many sections will leave the device before each analysis."
          checked={prefs?.previewBeforeSending ?? true}
          onChange={async (next) => {
            await setPrefs({ previewBeforeSending: next });
            setLocal(await getPrefs());
          }}
        />
        <div className="mt-3">
          <Toggle
            label="Reuse results this session"
            description="Keep results for the same agreement and model while the side panel is open. Nothing is written to storage."
            checked={prefs?.cacheAnalysis ?? false}
            onChange={async (next) => {
              await setPrefs({ cacheAnalysis: next });
              setLocal(await getPrefs());
            }}
          />
        </div>
      </Card>

      {info.needsKey && keySaved ? (
        <Button variant="danger" block onClick={() => void disconnect()}>
          Remove key
        </Button>
      ) : null}

      <InsetCard>
        <p className="text-caption text-muted">
          No model or offline? Specter falls back to on-device scanning and labels results as limited. Informational
          assistance, not legal advice.
        </p>
      </InsetCard>
    </div>
  );
}
