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

/** At most this many links are kept, and at most this many of one kind. A page full of links helps nobody. */
const MAX_LINKS = 8;
const MAX_PER_KIND = 2;

/** A document name is short. A longer text is a sentence that happens to mention privacy or terms. */
const MAX_TEXT_WORDS = 6;

/**
 * Words that mark navigation, settings or a part of a page, not a document: "Privacy Center home",
 * "Common privacy settings", "View printable version", "See previous versions", "Learn more about ...".
 */
const NOT_A_DOCUMENT =
  /\b(home|centre|center|search|settings|preferences|choices|topics|resources|printable|versions?|overview|contact|help|faq|blog|careers|manage|learn more|read more)\b/i;

/** Link text that says nothing about the target. Only then is the end of the URL used. */
const GENERIC_TEXT = /^(here|this|view|view all|read|read more|learn more|more|details|click here|link)$/i;

function firstKind(text: string): PolicyLink['kind'] | null {
  for (const { kind, pattern } of LINK_KINDS) {
    if (pattern.test(text)) return kind;
  }
  return null;
}

/** The last part of the path as words: "/legal/terms-of-service/" becomes "terms of service". */
function lastSegment(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  return last.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]/g, ' ');
}

/**
 * Decides whether a link points at an agreement document, and which kind (FR-DET-08).
 * The text has to name the document: short, and not navigation. The path is a fallback only for
 * generic text such as "Learn more", and only its last segment counts, so every link under
 * `/privacy/...` is not a privacy policy.
 */
export function classifyLinkText(text: string, path: string): PolicyLink['kind'] | null {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean);
  const generic = words.length === 0 || GENERIC_TEXT.test(t) || /^(https?:\/\/|www\.)/i.test(t);
  if (generic) return firstKind(lastSegment(path));
  // Footnote markers such as "partners[2]" and sentences are not document names.
  if (words.length > MAX_TEXT_WORDS || /\[\d+\]/.test(t) || NOT_A_DOCUMENT.test(t)) return null;
  return firstKind(t);
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

/**
 * The policy links on a page, in document order. The same address is listed once, the same kind with the
 * same text is listed once, and each kind keeps its first few.
 */
export function findPolicyLinks(elements: Element[], pageUrl: string): PolicyLink[] {
  const out: PolicyLink[] = [];
  const seenUrl = new Set<string>();
  const seenName = new Set<string>();
  const perKind = new Map<PolicyLink['kind'], number>();
  for (const el of elements) {
    if (el.localName !== 'a') continue;
    const link = toPolicyLink(el, pageUrl);
    if (!link || seenUrl.has(link.url)) continue;
    const name = `${link.kind}:${link.text.toLowerCase()}`;
    if (seenName.has(name)) continue;
    const count = perKind.get(link.kind) ?? 0;
    if (count >= MAX_PER_KIND) continue;
    seenUrl.add(link.url);
    seenName.add(name);
    perKind.set(link.kind, count + 1);
    out.push(link);
    if (out.length >= MAX_LINKS) break;
  }
  return out;
}
