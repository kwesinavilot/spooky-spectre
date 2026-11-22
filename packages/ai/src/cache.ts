/**
 * Cache key for an analysis (master prompt: cache by documentHash and model id).
 * The prompt version is part of the key, so a prompt change never reuses old results.
 */
export function analysisCacheKey(documentHash: string, modelId: string, promptVersion: string): string {
  return `analysis:${promptVersion}:${modelId}:${documentHash}`;
}
