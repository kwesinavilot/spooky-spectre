import { create } from 'zustand';
import type { ClauseFinding, ExtractedDocument } from '@specter/core';
import type { AnalysisFailure } from './labels';

export type ImpactFilter = 'all' | 'high' | 'medium' | 'low';
/**
 * ai: the model read the agreement and findings were verified.
 * limited: no AI, or it failed. Only the count of clauses is known; nothing is explained.
 */
export type AnalysisMode = 'ai' | 'limited';

export interface FindingsSnapshot {
  doc: ExtractedDocument | null;
  /** Tab the agreement was read from. Show on page only works in that tab. */
  tabId: number | null;
  mode: AnalysisMode;
  /** Why the analysis is limited, or null when AI ran. */
  failure: AnalysisFailure | null;
  findings: ClauseFinding[];
  rejected: number;
  corrected: number;
  candidateCount: number;
}

export interface FindingsState extends FindingsSnapshot {
  filter: ImpactFilter;
  dismissed: string[];
  publish: (snapshot: FindingsSnapshot) => void;
  setFilter: (filter: ImpactFilter) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const EMPTY: FindingsSnapshot = {
  doc: null,
  tabId: null,
  mode: 'limited',
  failure: null,
  findings: [],
  rejected: 0,
  corrected: 0,
  candidateCount: 0,
};

/** In memory only: findings are never written to storage (Spec 2 FR-PRV-04). */
export const useFindings = create<FindingsState>((set) => ({
  ...EMPTY,
  filter: 'all',
  dismissed: [],
  publish: (snapshot) => set({ ...snapshot, dismissed: [] }),
  setFilter: (filter) => set({ filter }),
  dismiss: (id) => set((s) => ({ dismissed: [...s.dismissed, id] })),
  clear: () => set({ ...EMPTY, dismissed: [] }),
}));

const ORDER: Record<ClauseFinding['concern'], number> = { high: 0, medium: 1, low: 2 };

/** High impact first, then document order (design steering section 4). */
export function sortFindings(findings: ClauseFinding[]): ClauseFinding[] {
  return [...findings].sort(
    (a, b) => ORDER[a.concern] - ORDER[b.concern] || a.evidence.startOffset - b.evidence.startOffset,
  );
}
