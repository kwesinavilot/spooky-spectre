import { analyzeDocument, ProviderError, providerFor } from '@specter/ai';
import { findCandidates, type ExtractedDocument } from '@specter/core';
import { DEFAULT_MODELS, keyName, PROVIDERS, type ProviderId } from './aiConnect';
import type { FindingsSnapshot } from './findingsStore';
import type { AnalysisFailure } from './labels';
import { getPrefs } from './prefs';
import { getSecret } from './secrets';

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

  if (!providerId) return limited('no_provider');
  const info = PROVIDERS.find((p) => p.id === providerId);
  if (!info) return limited('no_provider');

  let apiKey: string | undefined;
  if (info.needsKey) {
    const saved = await getSecret(keyName(providerId));
    if (!saved) return limited('no_key');
    apiKey = saved;
  }

  const prefs = await getPrefs();
  const model = prefs.aiModel || DEFAULT_MODELS[providerId];
  try {
    const outcome = await analyzeDocument({
      provider: providerFor(providerId),
      model,
      apiKey,
      doc,
      candidates,
      signal,
    });
    if (outcome.status === 'invalid_output') return limited('invalid_output');
    return {
      snapshot: {
        doc,
        tabId,
        mode: 'ai',
        failure: null,
        findings: outcome.findings,
        rejected: outcome.rejected,
        corrected: outcome.corrected,
        candidateCount,
      },
    };
  } catch (err) {
    if (signal.aborted) return limited('cancelled');
    if (err instanceof ProviderError) return limited(err.code);
    return limited('error');
  }
}
