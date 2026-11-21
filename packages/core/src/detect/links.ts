import type { PolicyLink } from '../schema';
import { normalizeInline } from '../dom/text';

const LINK_KINDS: { kind: PolicyLink['kind']; pattern: RegExp }[] = [
  { kind: 'privacy', pattern: /privacy|data protection/i },
  { kind: 'cookies', pattern: /cookie/i },
  { kind: 'subscription', pattern: /subscription|billing|renewal|refund/i },
  {
    kind: 'terms',
    pattern: /\bterms\b|conditions|\btos\b|user agreement|\blegal\b|\beula\b|licen[cs]e agreement/i,
  },
];

const MAX_LINKS = 20;

export function classifyLinkText(text: string, path: string): PolicyLink['kind'] | null {
  for (const { kind, pattern } of LINK_KINDS) {
    if (pattern.test(text)) return kind;
  }
  for (const { kind, pattern } of LINK_KINDS) {
    if (pattern.test(path.replace(/[-_/]/g, ' '))) return kind;
  }
  return null;
}

/** Turns an anchor into a policy link, or null if it is not one (FR-DET-08). */
export function toPolicyLink(a: Element, pageUrl: string): PolicyLink | null {
  const href = a.getAttribute('href');
  if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href.trim())) return null;
  let url: URL;
  try {
    url = new URL(href, pageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const text = normalizeInline(a.textContent ?? '').slice(0, 120);
  const kind = classifyLinkText(text, url.pathname);
  if (!kind) return null;
  url.hash = '';
  return {
    kind,
    text,
    url: url.toString(),
    isPdf:
      /\.pdf$/i.test(url.pathname) || (a.getAttribute('type') ?? '').toLowerCase() === 'application/pdf',
  };
}

export function findPolicyLinks(elements: Element[], pageUrl: string): PolicyLink[] {
  const out: PolicyLink[] = [];
  const seen = new Set<string>();
  for (const el of elements) {
    if (el.localName !== 'a') continue;
    const link = toPolicyLink(el, pageUrl);
    if (!link || seen.has(link.url)) continue;
    seen.add(link.url);
    out.push(link);
    if (out.length >= MAX_LINKS) break;
  }
  return out;
}
