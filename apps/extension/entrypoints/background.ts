import { onMessage } from '../src/messaging';

export default defineBackground(() => {
  // Toolbar icon opens the side panel (FR-WXT-08).
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});

  // Open onboarding in a new tab on install.
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    }
  });

  // Shell message handlers (design section 10). Only ping/pong and
  // get-status exist at this stage; real messages arrive in later specs.
  onMessage((message) => {
    switch (message.type) {
      case 'ping':
        return { type: 'pong' };
      case 'get-status':
        return { type: 'status', status: 'idle' };
      default:
        return undefined;
    }
  });
});
