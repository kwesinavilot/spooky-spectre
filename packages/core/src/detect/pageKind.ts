import type { AgreementKind } from '../schema';
import { normalizeInline } from '../dom/text';

type PageKind = Extract<AgreementKind, 'terms_of_service' | 'privacy_policy' | 'cookie_policy' | 'eula'>;

const PAGE_PATTERNS: Record<PageKind, { text: RegExp; path: RegExp }> = {
  terms_of_service: {
    text: /\bterms of (service|use)\b|\bterms (and|&) (conditions|privacy)\b|\buser agreement\b|\bconditions of use\b|^terms$/i,
    path: /\/(terms|tos|terms-of-service|terms-of-use|conditions|user-agreement|legal)(\/|\.|$|-)/i,
  },
  privacy_policy: {
    text: /\bprivacy (policy|notice|statement)\b|\bprivacy (and|&) cookies?\b|\bdata protection\b/i,
    path: /\/(privacy|privacy-policy)(\/|\.|$|-)/i,
  },
  // "Cookies Policy" (plural) is how Facebook and others name it. A title or heading is needed:
  // a /cookies path alone is not enough, since many sites have a cookie settings page.
  cookie_policy: {
    text: /\bcookies? (policy|notice|statement)\b|\bcookies? and (similar|other) technologies\b|^cookies?$/i,
    path: /\/(cookies?|cookie-policy|cookies-policy|cookie-notice)(\/|\.|$|-)/i,
  },
  eula: {
    text: /\bend[- ]user licen[cs]e\b|\beula\b|\bsoftware licen[cs]e\b|\blicen[cs]e agreement\b/i,
    path: /\/(eula|license|licence)(\/|\.|$|-)/i,
  },
};

const NUMBERED_HEADING = /^\s*(section\s+|§\s*|article\s+|clause\s+)?\d+(\.\d+)*[.)]?(\s|$)/i;
export const PAGE_KIND_THRESHOLD = 0.5;

export interface PageKindScore {
  kind: PageKind;
  score: number;
  signals: string[];
}

/** Share of headings that look like numbered legal sections. */
export function numberedHeadingShare(doc: Document): { share: number; count: number } {
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4'));
  if (headings.length === 0) return { share: 0, count: 0 };
  const numbered = headings.filter((h) => NUMBERED_HEADING.test(h.textContent ?? '')).length;
  return { share: numbered / headings.length, count: headings.length };
}

/**
 * Every page kind that reaches the threshold, best first. A combined
 * "Terms of Service & Privacy Policy" page is both (corpus finding, task 7.4).
 */
export function scorePageKinds(doc: Document, pathname: string): PageKindScore[] {
  const title = normalizeInline(doc.title ?? '');
  const h1 = normalizeInline(doc.querySelector('h1')?.textContent ?? '');
  const structure = numberedHeadingShare(doc);
  const legalStructure = structure.count >= 4 && structure.share >= 0.4;
  const out: PageKindScore[] = [];
  for (const kind of Object.keys(PAGE_PATTERNS) as PageKind[]) {
    const { text, path } = PAGE_PATTERNS[kind];
    let score = 0;
    const signals: string[] = [];
    if (text.test(title)) {
      score += 0.35;
      signals.push(`${kind}.title`);
    }
    if (text.test(h1)) {
      score += 0.35;
      signals.push(`${kind}.h1`);
    }
    if (path.test(pathname)) {
      score += 0.2;
      signals.push(`${kind}.path`);
    }
    if (score > 0 && legalStructure) {
      score += 0.2;
      signals.push(`${kind}.numbered_headings`);
    }
    if (score >= PAGE_KIND_THRESHOLD) out.push({ kind, score: Math.min(score, 1), signals });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Scores the page as a terms, privacy or license document (FR-DET-07). */
export function scorePageKind(doc: Document, pathname: string): PageKindScore | null {
  const title = normalizeInline(doc.title ?? '');
  const h1 = normalizeInline(doc.querySelector('h1')?.textContent ?? '');
  const structure = numberedHeadingShare(doc);
  const legalStructure = structure.count >= 4 && structure.share >= 0.4;

  let best: PageKindScore | null = null;
  for (const kind of Object.keys(PAGE_PATTERNS) as PageKind[]) {
    const { text, path } = PAGE_PATTERNS[kind];
    let score = 0;
    const signals: string[] = [];
    if (text.test(title)) {
      score += 0.35;
      signals.push(`${kind}.title`);
    }
    if (text.test(h1)) {
      score += 0.35;
      signals.push(`${kind}.h1`);
    }
    if (path.test(pathname)) {
      score += 0.2;
      signals.push(`${kind}.path`);
    }
    if (score > 0 && legalStructure) {
      score += 0.2;
      signals.push(`${kind}.numbered_headings`);
    }
    if (!best || score > best.score) best = { kind, score: Math.min(score, 1), signals };
  }
  return best && best.score >= PAGE_KIND_THRESHOLD ? best : null;
}
