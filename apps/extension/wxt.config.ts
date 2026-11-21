import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Specter',
    description: "The things you agree to online shouldn't come back to haunt you.",
    // alarms and notifications are added when reminders ship (post-MVP).
    permissions: ['activeTab', 'storage', 'sidePanel', 'scripting'],
    // Host access is never granted at install (FR-WXT-03). Only http/https
    // origins are requestable: all of them at once when the user opts in to
    // background detection, or one site at a time otherwise. file:, ws: and
    // other schemes are out of reach entirely.
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: 'Specter',
    },
  },
});
