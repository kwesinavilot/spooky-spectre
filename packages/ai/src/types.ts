import type { Category, ClauseFinding } from '@specter/core';

/**
 * Provider abstraction. No network code lives here yet (Spec 4 implements real
 * providers). Callers depend on this interface, so switching providers needs no
 * change in calling code (Spec 4 acceptance).
 */
export interface Provider {
  id: string;
  label: string;
  supportsStructuredOutput: boolean;
}

/** A candidate clause plus neighbouring sections, never the full browsing history. */
export interface AnalysisRequest {
  category: Category;
  context: string;
}

export interface AnalysisResult {
  finding: ClauseFinding;
}

export type ConnectionStatus =
  | 'idle'
  | 'testing'
  | 'success'
  | 'invalid_key'
  | 'network_error'
  | 'ollama_not_running';

export interface ConnectionTest {
  status: ConnectionStatus;
  message?: string;
}

export const PROVIDER_IDS = ['anthropic', 'openai', 'google', 'ollama', 'none'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
