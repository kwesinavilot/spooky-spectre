import {
  analysisCacheKey,
  analyzeDocument,
  PROMPT_VERSION,
  ProviderError,
  providerFor,
  type ChatProvider,
} from '@specter/ai';
import { findCandidates, type ExtractedDocument } from '@specter/core';
import { keyName, PROVIDERS, type ProviderId } from './aiConnect';
import type { FindingsSnapshot } from './findingsStore';
import type { AnalysisFailure } from './labels';
import { getPrefs } from './prefs';
import { getSecret } from './secrets';

export type Connection =
  | { ok: true; provider: ChatProvider; model: string; apiKey?: string; label: string }
  | { ok: false; failure: AnalysisFailure };

/**
 * Resolves the chosen provider into a ready call: the saved key (read for
 * this call only) and the model name. Used by analysis and Ask Specter.
 */
export async function connectionFor(providerId: ProviderId | null): Promise<Connection> {
  if (!providerId) return { ok: false, failure: 'no_provider' };
  const info = PROVIDERS.find((p) => p.id === providerId);
  if (!info) return { ok: false, failure: 'no_provider' };

  let apiKey: string | undefined;
  if (info.needsKey) {
    const saved = await getSecret(keyName(providerId));
    if (!saved) return { ok: false, failure: 'no_key' };
    apiKey = saved;
  }
  const prefs = await getPrefs();
  if (!prefs.aiModel) return { ok: false, failure: 'no_model' };
  return {
    ok: true,
    provider: providerFor(providerId),
    model: prefs.aiModel,
    apiKey,
    label: info.label,
  };
}

export interface AnalysisRun {
  snapshot: FindingsSnapshot;
  /** Set when AI did not run or failed; the snapshot then holds on-device results only. */
  failure?: AnalysisFailure;
}

/**
 * Runs the analysis for one extracted agreement (Spec 5). Sends the clause
 * candidates to the chosen provider only. Without a provider, or when the
 * call fails, returns limited on-device results with the reason. The key is
 * read from chrome.storage.local for each call and never kept in memory.
 */
/**
 * Results of analyses run in this browser session, keyed by agreement hash,
 * model and prompt version. Only used when the "cache" setting is on. Held in
 * memory: it is cleared when the side panel closes and is never written to storage.
 */
const sessionCache = new Map<string, FindingsSnapshot>();

export async function runAnalysis(
  doc: ExtractedDocument,
  providerId: ProviderId | null,
  signal: AbortSignal,
  tabId: number | null,
): Promise<AnalysisRun> {
  const candidates = findCandidates(doc);
  const candidateCount = candidates.length;
  const limited = (failure: AnalysisFailure): AnalysisRun => ({
    snapshot: { doc, tabId, mode: 'limited', failure, findings: [], rejected: 0, corrected: 0, candidateCount },
    failure,
  });

  const conn = await connectionFor(providerId);
  if (!conn.ok) return limited(conn.failure);

  const prefs = await getPrefs();
  const key = analysisCacheKey(doc.documentHash, conn.model, PROMPT_VERSION);
  if (prefs.cacheAnalysis) {
    const hit = sessionCache.get(key);
    if (hit) return { snapshot: { ...hit, tabId } };
  }

  try {
    const outcome = await analyzeDocument({
      provider: conn.provider,
      model: conn.model,
      apiKey: conn.apiKey,
      doc,
      candidates,
      signal,
    });
    if (outcome.status === 'invalid_output') return limited('invalid_output');
    const snapshot: FindingsSnapshot = {
      doc,
      tabId,
      mode: 'ai',
      failure: null,
      findings: outcome.findings,
      rejected: outcome.rejected,
      corrected: outcome.corrected,
      candidateCount,
    };
    if (prefs.cacheAnalysis) sessionCache.set(key, snapshot);
    return { snapshot };
  } catch (err) {
    if (signal.aborted) return limited('cancelled');
    if (err instanceof ProviderError) return limited(err.code);
    return limited('error');
  }
}
