import type { ClauseFinding } from '@specter/core';
import { sendToTab } from './messaging';

/**
 * found: the live page still has the passage and it is highlighted.
 * missing: the page changed, so the passage cannot be shown; the card keeps the saved quote.
 * stale: the active tab is not the one the agreement came from.
 * no_tab: there is no active tab to show it in.
 */
export type ShowResult = 'found' | 'missing' | 'stale' | 'no_tab';

/** Sends one verified finding to the tab it came from. Never clicks or changes the page. */
export async function showOnPage(finding: ClauseFinding, fromTabId: number | null): Promise<ShowResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return 'no_tab';
  if (fromTabId !== null && tab.id !== fromTabId) return 'stale';
  const reply = await sendToTab(tab.id, {
    type: 'highlight',
    quote: finding.evidence.exactQuote,
    effect: finding.effect,
  });
  return reply?.type === 'highlighted' && reply.found ? 'found' : 'missing';
}
