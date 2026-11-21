import { DEFAULT_EXCLUDED_DOMAINS, shouldAnalyze } from '@specter/core';

export type PageAccess = 'supported' | 'excluded' | 'unsupported';

export interface PageInfo {
  access: PageAccess;
  /** Host shown in mono in the popup header; empty for pages without one. */
  host: string;
  /** Plain-language reason for unsupported pages. */
  reason?: string;
}

/**
 * Classifies the active tab's URL for the popup and side panel (design
 * steering 6B). Pure, so it is unit tested. Chrome blocks extensions on its own
 * pages and the Web Store; PDFs are not supported yet.
 */
export function describePage(
  rawUrl: string | undefined,
  excluded: readonly string[] = DEFAULT_EXCLUDED_DOMAINS,
): PageInfo {
  if (!rawUrl) {
    return { access: 'unsupported', host: '', reason: 'Specter cannot read this page.' };
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { access: 'unsupported', host: '', reason: 'Specter cannot read this page.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      access: 'unsupported',
      host: url.host,
      reason: 'Browser and extension pages cannot be read by extensions.',
    };
  }
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'chromewebstore.google.com' || (host === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) {
    return { access: 'unsupported', host, reason: 'Chrome does not let extensions read the Web Store.' };
  }
  if (/\.pdf$/i.test(url.pathname)) {
    return { access: 'unsupported', host, reason: 'PDF agreements are not supported yet.' };
  }
  if (!shouldAnalyze(host, excluded)) {
    return { access: 'excluded', host };
  }
  return { access: 'supported', host };
}
