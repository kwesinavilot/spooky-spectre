/**
 * Content script. Manually registered so nothing injects anywhere by default
 * (FR-WXT-05 / privacy-by-default). On injection it mounts a single Shadow DOM
 * overlay host that renders nothing visible until a finding exists (FR-SURF-07).
 */
export default defineContentScript({
  registration: 'manual',
  async main() {
    if (document.getElementById('specter-overlay-host')) return;
    const host = document.createElement('div');
    host.id = 'specter-overlay-host';
    host.style.cssText =
      'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    // Shadow root isolates overlay styles from the site (FR — Shadow DOM overlay).
    host.attachShadow({ mode: 'open' });
    document.documentElement.append(host);
  },
});
