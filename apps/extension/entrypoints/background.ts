import { onMessage } from '../src/messaging';

export default defineBackground(() => {
  // The toolbar icon opens the popup (design steering 6B), which opens the side
  // panel. Turn off the older "open the panel on click" behavior, which Chrome
  // remembers between sessions.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

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
