import { cleanUrl } from '@specter/core';
import type { SpecterMessage } from './messaging';
import { clearTabState, getTabState, setTabState } from './tabState';
import { syncRegistrations } from './access';

/**
 * Background message handling, separate from the entrypoint so it can be
 * unit tested with a mocked `chrome`.
 */
export async function handleBackgroundMessage(
  message: SpecterMessage,
  sender: Pick<chrome.runtime.MessageSender, 'tab' | 'frameId'>,
): Promise<SpecterMessage | undefined> {
  switch (message.type) {
    case 'ping':
      return { type: 'pong' };
    case 'get-status':
      return { type: 'status', status: 'idle' };
    case 'detected': {
      const tabId = sender.tab?.id;
      // Only the top frame reports for a tab.
      if (tabId === undefined || (sender.frameId ?? 0) !== 0) return undefined;
      const url = sender.tab?.url ? cleanUrl(sender.tab.url) : message.result?.url ?? '';
      await setTabState(tabId, { url, excluded: message.excluded === true, result: message.result });
      void chrome.runtime.sendMessage({ type: 'tab-state-changed', tabId }).catch(() => {});
      return undefined;
    }
    case 'get-tab-state':
      return { type: 'tab-state', state: await getTabState(message.tabId) };
    default:
      return undefined;
  }
}

/** A tab navigated to a new URL: its old result no longer applies (FR-PRV-03). */
export async function handleTabUpdated(tabId: number, changeInfo: { url?: string }): Promise<void> {
  if (changeInfo.url === undefined) return;
  const state = await getTabState(tabId);
  if (state && state.url !== cleanUrl(changeInfo.url)) {
    await clearTabState(tabId);
    void chrome.runtime.sendMessage({ type: 'tab-state-changed', tabId }).catch(() => {});
  }
}

export async function handleTabRemoved(tabId: number): Promise<void> {
  await clearTabState(tabId);
}

export async function handlePermissionsChanged(): Promise<void> {
  await syncRegistrations();
}
