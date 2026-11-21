import { blockedDomains, getPrefs } from './prefs';

/** The optional host permissions that make up background detection (FR-ACC-02). */
export const ALL_SITES = ['http://*/*', 'https://*/*'];
export const DETECT_SCRIPT_ID = 'specter-detect';
/** Where WXT writes the runtime-registered content script. */
export const CONTENT_SCRIPT_FILE = 'content-scripts/content.js';

export function originPattern(origin: string): string {
  return `${new URL(origin).origin}/*`;
}

/** Match patterns that keep the detection script off excluded domains and their subdomains. */
export function excludeMatchesFor(domains: readonly string[]): string[] {
  return domains.flatMap((d) => {
    const domain = d.toLowerCase().replace(/^www\./, '');
    return [`*://${domain}/*`, `*://*.${domain}/*`];
  });
}

export async function hasBackgroundAccess(): Promise<boolean> {
  return chrome.permissions.contains({ origins: ALL_SITES });
}

/** Sites the user enabled one by one, as origin patterns like "https://streamly.example/*". */
export async function listEnabledSites(): Promise<string[]> {
  const { origins = [] } = await chrome.permissions.getAll();
  return origins.filter((o) => !ALL_SITES.includes(o) && /^https?:\/\//.test(o));
}

/**
 * Makes the registered detection script match the granted permissions
 * (FR-ACC-04, FR-ACC-05): all sites when background access is granted,
 * otherwise the sites enabled one by one, otherwise nothing. Runs on worker
 * start and whenever permissions change, so revoking access in Chrome's own
 * settings also turns detection off.
 */
export async function syncRegistrations(): Promise<{ matches: string[] }> {
  const { origins = [] } = await chrome.permissions.getAll();
  const all = ALL_SITES.every((o) => origins.includes(o));
  const matches = all ? ALL_SITES : origins.filter((o) => /^https?:\/\//.test(o) && !ALL_SITES.includes(o));
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [DETECT_SCRIPT_ID] });

  if (matches.length === 0) {
    if (existing.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [DETECT_SCRIPT_ID] });
    return { matches };
  }

  const prefs = await getPrefs();
  const script: chrome.scripting.RegisteredContentScript = {
    id: DETECT_SCRIPT_ID,
    matches,
    excludeMatches: excludeMatchesFor(blockedDomains(prefs)),
    js: [CONTENT_SCRIPT_FILE],
    runAt: 'document_idle',
    // The top frame walks same-origin frames itself; one result per tab.
    allFrames: false,
    persistAcrossSessions: true,
  };
  if (existing.length > 0) await chrome.scripting.updateContentScripts([script]);
  else await chrome.scripting.registerContentScripts([script]);
  return { matches };
}

/** Must be called from a user gesture (a click), or Chrome refuses the prompt. */
export async function enableBackground(): Promise<boolean> {
  const granted = await chrome.permissions.request({ origins: ALL_SITES });
  await syncRegistrations();
  return granted;
}

export async function disableBackground(): Promise<void> {
  await chrome.permissions.remove({ origins: ALL_SITES });
  await syncRegistrations();
}

/** Must be called from a user gesture. */
export async function enableSite(origin: string): Promise<boolean> {
  const granted = await chrome.permissions.request({ origins: [originPattern(origin)] });
  await syncRegistrations();
  return granted;
}

export async function disableSite(originOrPattern: string): Promise<void> {
  const pattern = originOrPattern.endsWith('/*') ? originOrPattern : originPattern(originOrPattern);
  await chrome.permissions.remove({ origins: [pattern] });
  await syncRegistrations();
}

export async function hasSiteAccess(origin: string): Promise<boolean> {
  return chrome.permissions.contains({ origins: [originPattern(origin)] });
}
