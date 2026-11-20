import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Specter',
    description: 'See what haunts your digital life.',
    permissions: ['activeTab', 'storage', 'sidePanel', 'scripting', 'alarms', 'notifications'],
    // Per-site host access: only http/https origins are even *requestable*,
    // and each grant is made at runtime per site via chrome.permissions
    // (FR-WXT-03). The blanket `<all_urls>` pattern is never declared, so
    // file:, ws: and other schemes are out of reach entirely.
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: 'Specter',
    },
  },
});
