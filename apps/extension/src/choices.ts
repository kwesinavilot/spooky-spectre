import type { DetectionResult, PolicyLink } from '@specter/core';
import { KIND_LABEL } from './labels';

export type DocumentChoice =
  | { id: string; kind: 'page'; label: string }
  | { id: string; kind: 'banner'; label: string }
  | { id: string; kind: 'link'; label: string; link: PolicyLink };

const PAGE_DOCS = ['terms_of_service', 'privacy_policy', 'eula'] as const;

/**
 * The documents the user can analyze on this page (design steering 6C): the
 * page itself when it is a terms, privacy or license page, the cookie banner,
 * and linked policies. Specter never combines documents silently.
 */
export function documentChoices(result: DetectionResult): DocumentChoice[] {
  const out: DocumentChoice[] = [];
  const pageKind = PAGE_DOCS.find((k) => result.kinds.includes(k));
  if (pageKind) out.push({ id: 'page', kind: 'page', label: `This page (${KIND_LABEL[pageKind]})` });
  if (result.kinds.includes('cookie_banner')) out.push({ id: 'banner', kind: 'banner', label: 'The cookie banner' });
  for (const link of result.links) {
    if (link.kind === 'other') continue;
    // A terms page often links to itself; skip links back to the current page.
    if (pageKind && link.url.split('#')[0] === result.url) continue;
    out.push({ id: `link:${link.url}`, kind: 'link', label: link.text || link.url, link });
  }
  return out;
}

/**
 * Default selection: the only document, or the page itself when it is clearly
 * the agreement, or the linked terms when the page is a sign-up form. Otherwise
 * nothing, and Analyze stays disabled until the user chooses.
 */
export function defaultChoice(result: DetectionResult, choices: DocumentChoice[]): string | null {
  if (choices.length === 1) return choices[0]!.id;
  const page = choices.find((c) => c.kind === 'page');
  if (page) return page.id;
  const signup = result.kinds.includes('consent_checkbox') || result.kinds.includes('subscription_terms');
  if (signup) {
    const terms = choices.filter((c) => c.kind === 'link' && c.link.kind === 'terms');
    if (terms.length === 1) return terms[0]!.id;
  }
  return null;
}
