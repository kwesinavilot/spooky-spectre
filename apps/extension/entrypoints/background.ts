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
});
