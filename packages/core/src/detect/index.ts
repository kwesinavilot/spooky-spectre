import type { AgreementKind, DetectionResult } from '../schema';
import { DEFAULT_EXCLUDED_DOMAINS, shouldAnalyze } from '../privacy';
import { elementsDeep, type WalkContext } from '../dom/walk';
import { findBanner, type BannerMatch } from './banner';
import { findPolicyLinks } from './links';
import { scorePageKinds } from './pageKind';
import { findActionControls, hasConsentCheckbox, hasSubscriptionTerms } from './forms';

export { findBanner, type BannerMatch } from './banner';
export { classifyControlLabel, CONTROL_PATTERNS } from './controls';
export { classifyLinkText, findPolicyLinks } from './links';
export { scorePageKind, scorePageKinds, PAGE_KIND_THRESHOLD } from './pageKind';
export { findActionControls, hasConsentCheckbox, hasSubscriptionTerms } from './forms';

export interface DetectOptions {
  /** The user's excluded domains; defaults to the built-in list. */
  excludedDomains?: readonly string[];
  now?: Date;
}

export type DetectOutcome =
  | { excluded: true }
  | { excluded: false; result: DetectionResult; banner: BannerMatch | null };

/** Origin and path only; the query string and hash are dropped (FR-PRV-05). */
export function cleanUrl(pageUrl: string): string {
  const url = new URL(pageUrl);
  return `${url.origin}${url.pathname}`;
}

/**
 * Detects agreements on a page using rules only (FR-DET-01). Checks the
 * excluded-domains list before touching the document (FR-PRV-01), never
 * writes to the DOM (FR-DET-12). The result matches the DetectionResult schema; it is validated where it is received (background worker, side panel), not in the page, so Zod stays out of the content script (NFR-03).
 * `banner` holds the live banner element for extraction; it is not part of
 * the serializable result.
 */
export function detectPage(doc: Document, pageUrl: string, opts: DetectOptions = {}): DetectOutcome {
  const url = new URL(pageUrl);
  if (!shouldAnalyze(url.hostname, opts.excludedDomains ?? DEFAULT_EXCLUDED_DOMAINS)) {
    return { excluded: true };
  }
  const detectedAt = (opts.now ?? new Date()).toISOString();
  const isPdf = doc.contentType === 'application/pdf' || /\.pdf$/i.test(url.pathname);
  if (isPdf) {
    return {
      excluded: false,
      banner: null,
      result: {
        url: cleanUrl(pageUrl),
        kinds: [],
        signals: ['page.pdf'],
        cookieControls: [],
        noRejectControlFound: false,
        actionControls: [],
        links: [],
        unreadable: [],
        isPdf: true,
        confidence: 0,
        detectedAt,
      },
    };
  }

  const ctx: WalkContext = { unreadable: [] };
  const elements = Array.from(elementsDeep(doc, ctx));
  const kinds: AgreementKind[] = [];
  const signals: string[] = [];
  let confidence = 0;

  const banner = findBanner(elements);
  if (banner) {
    kinds.push('cookie_banner');
    signals.push(...banner.signals);
    confidence = Math.max(confidence, banner.confidence);
  }

  for (const page of scorePageKinds(doc, url.pathname)) {
    kinds.push(page.kind);
    signals.push(...page.signals);
    confidence = Math.max(confidence, page.score);
  }

  if (hasConsentCheckbox(elements, pageUrl)) {
    kinds.push('consent_checkbox');
    signals.push('checkbox.policy_link');
    confidence = Math.max(confidence, 0.8);
  }

  if (hasSubscriptionTerms(elements)) {
    kinds.push('subscription_terms');
    signals.push('form.billing_wording');
    confidence = Math.max(confidence, 0.7);
  }

  return {
    excluded: false,
    banner,
    result: {
      url: cleanUrl(pageUrl),
      kinds,
      signals,
      cookieControls: banner?.controls ?? [],
      noRejectControlFound: banner?.noRejectControlFound ?? false,
      actionControls:
        kinds.includes('subscription_terms') || kinds.includes('consent_checkbox')
          ? findActionControls(elements)
          : [],
      links: findPolicyLinks(elements, pageUrl),
      unreadable: ctx.unreadable,
      isPdf: false,
      confidence,
      detectedAt,
    },
  };
}
