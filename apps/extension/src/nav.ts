import type { SpecterPage } from './pages';

/**
 * Opens a full-page extension tab. WXT outputs each HTML entrypoint as <name>.html.
 */
export async function openTab(page: SpecterPage): Promise<void> {
  await chrome.tabs.create({ url: chrome.runtime.getURL(`${page}.html`) });
}

export async function focusOrCreateTab(page: SpecterPage): Promise<void> {
  const url = chrome.runtime.getURL(`${page}.html`);
  const tabs = await chrome.tabs.query({ url });
  if (tabs[0]?.id !== undefined) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    if (tabs[0].windowId !== undefined) {
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    }
    return;
  }
  await chrome.tabs.create({ url });
}
