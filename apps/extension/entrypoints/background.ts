import { onMessage } from '../src/messaging';
import {
  handleBackgroundMessage,
  handlePermissionsChanged,
  handleTabRemoved,
  handleTabUpdated,
} from '../src/backgroundHandlers';
import { syncRegistrations } from '../src/access';
import { onPrefsChanged } from '../src/prefs';

export default defineBackground(() => {
  // The toolbar icon opens the popup (design steering 6B), which opens the side
  // panel. Turn off the older "open the panel on click" behavior, which Chrome
  // remembers between sessions.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    }
    void syncRegistrations();
  });
  chrome.runtime.onStartup.addListener(() => void syncRegistrations());

  // Keep the registered detection script in line with granted permissions,
  // including access revoked from Chrome's own settings (FR-ACC-05).
  chrome.permissions.onAdded.addListener(() => void handlePermissionsChanged());
  chrome.permissions.onRemoved.addListener(() => void handlePermissionsChanged());
  // Excluded or paused sites changed: update the script's excludeMatches.
  onPrefsChanged(() => void syncRegistrations());

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => void handleTabUpdated(tabId, changeInfo));
  chrome.tabs.onRemoved.addListener((tabId) => void handleTabRemoved(tabId));

  onMessage((message, sender) => handleBackgroundMessage(message, sender));
});
