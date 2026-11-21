import { DESIGN_TOKENS } from '@specter/core';
import type { TabState } from './messaging';

const key = (tabId: number) => `tab:${tabId}`;

/**
 * Per-tab detection state, kept in chrome.storage.session because the service
 * worker can stop at any time (Spec 2 design section 6). Holds only the
 * detection result (labels, link text, anchors), never page body text.
 */
export async function getTabState(tabId: number): Promise<TabState | null> {
  const stored = (await chrome.storage.session.get(key(tabId)))[key(tabId)] as TabState | undefined;
  return stored ?? null;
}

export async function setTabState(tabId: number, state: TabState): Promise<void> {
  await chrome.storage.session.set({ [key(tabId)]: state });
  await setBadge(tabId, !state.excluded && (state.result?.kinds.length ?? 0) > 0);
}

export async function clearTabState(tabId: number): Promise<void> {
  await chrome.storage.session.remove(key(tabId));
  await setBadge(tabId, false);
}

/**
 * The toolbar badge is a small dot in the medium color when an agreement is
 * detected (FR-DET-11). It never shows a number or a risk color. A single
 * space renders as a dot-sized badge; empty text clears it.
 */
export async function setBadge(tabId: number, on: boolean): Promise<void> {
  try {
    await chrome.action.setBadgeText({ tabId, text: on ? ' ' : '' });
    if (on) await chrome.action.setBadgeBackgroundColor({ tabId, color: DESIGN_TOKENS.medium });
  } catch {
    // The tab may have closed in the meantime.
  }
}
