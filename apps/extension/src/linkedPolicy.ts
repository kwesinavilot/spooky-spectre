import { extractDocument, type AgreementKind, type ExtractedDocument, type PolicyLink } from '@specter/core';
import { hasSiteAccess, hasBackgroundAccess, originPattern } from './access';

export type LinkedPolicyResult =
  | { ok: true; doc: ExtractedDocument }
  | { ok: false; reason: 'pdf' | 'not_html' | 'no_access' | 'network' };

const KIND_FOR_LINK: Record<PolicyLink['kind'], AgreementKind> = {
  terms: 'terms_of_service',
  privacy: 'privacy_policy',
  cookies: 'privacy_policy',
  subscription: 'subscription_terms',
  other: 'terms_of_service',
};

/**
 * Reads a policy page linked from the current page (FR-EXT-08). Called during
 * an analysis the user started: automatically when the one-time consent is
 * on, otherwise from the "Read the linked policy" button. The request sends no
 * cookies or credentials, only HTML is read, the response is never stored, and
 * nothing is logged. Without host access for that site Chrome asks once, so
 * this must start from a click.
 */
export async function readLinkedPolicy(link: PolicyLink): Promise<LinkedPolicyResult> {
  if (link.isPdf) return { ok: false, reason: 'pdf' };
  const origin = new URL(link.url).origin;
  const allowed =
    (await hasBackgroundAccess()) ||
    (await hasSiteAccess(origin)) ||
    (await chrome.permissions.request({ origins: [originPattern(origin)] }));
  if (!allowed) return { ok: false, reason: 'no_access' };

  let response: Response;
  try {
    response = await fetch(link.url, { credentials: 'omit', redirect: 'follow', cache: 'no-store' });
  } catch {
    return { ok: false, reason: 'network' };
  }
  const type = (response.headers.get('content-type') ?? '').toLowerCase();
  if (type.includes('application/pdf')) return { ok: false, reason: 'pdf' };
  if (!response.ok || !type.includes('html')) return { ok: false, reason: 'not_html' };

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Resolve relative links against the page that was fetched.
  const base = doc.createElement('base');
  base.href = response.url || link.url;
  doc.head.prepend(base);

  const extracted = await extractDocument(doc, {
    kind: KIND_FOR_LINK[link.kind],
    source: 'linked',
    url: response.url || link.url,
  });
  return { ok: true, doc: extracted };
}
