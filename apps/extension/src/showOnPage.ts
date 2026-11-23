import type { ClauseFinding, ExtractedDocument } from '@specter/core';
import { sendToTab, type MarkItem } from './messaging';

/** Impact wording used across the panel and the page popover (design steering section 4). */
const IMPACT_LABEL: Record<ClauseFinding['concern'], string> = {
  high: 'High impact',
  medium: 'Medium impact',
  low: 'Low impact',
};

/**
 * The page's view of one verified finding: its quote, how it is drawn, what the popover says, and the
 * section it is in. Plain values only.
 */
export function markItemFor(finding: ClauseFinding, doc: Pick<ExtractedDocument, 'sections'> | null): MarkItem {
  const section = doc?.sections.find((s) => s.id === finding.evidence.sectionId)?.heading ?? '';
  return {
    id: finding.id,
    quote: finding.evidence.exactQuote,
    effect: finding.effect,
    card: {
      id: finding.id,
      title: finding.summary,
      impact: IMPACT_LABEL[finding.concern],
      sentence: finding.implication,
    },
    concern: finding.concern,
    confidence: finding.confidence,
    verified: finding.verified,
    section: section ? `§ ${section}` : '',
  };
}

/** Markers for every verified finding of an analysis, drawn automatically (Spec 6 task 7). */
export function markItemsFor(findings: ClauseFinding[], doc: Pick<ExtractedDocument, 'sections'> | null): MarkItem[] {
  return findings.filter((f) => f.verified).map((f) => markItemFor(f, doc));
}

export type ShowResult = 'found' | 'missing' | 'stale' | 'no_tab';

/**
 * Show on page for one finding. Sends it to the tab the agreement came from. Never clicks or changes the page.
 * found: the passage is on the live page and scrolled to. missing: the page changed. stale: another tab is
 * active. no_tab: no active tab.
 */
export async function showOnPage(
  finding: ClauseFinding,
  doc: Pick<ExtractedDocument, 'sections'> | null,
  fromTabId: number | null,
): Promise<ShowResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return 'no_tab';
  if (fromTabId !== null && tab.id !== fromTabId) return 'stale';
  const item = markItemFor(finding, doc);
  const reply = await sendToTab(tab.id, {
    type: 'highlight',
    quote: item.quote,
    effect: item.effect,
    card: item.card,
    item,
  });
  return reply?.type === 'highlighted' && reply.found ? 'found' : 'missing';
}
