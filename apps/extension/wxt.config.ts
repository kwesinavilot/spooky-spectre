import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Specter',
    description: 'See what haunts your digital life.',
    permissions: ['activeTab', 'storage', 'sidePanel', 'scripting', 'alarms', 'notifications'],
    // Per-site host access is requested at runtime, never granted by default.
    optional_host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Specter',
    },
  },
});
