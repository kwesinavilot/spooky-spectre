import {
  ExtractedDocument,
  type AgreementKind,
  type CompletenessReason,
  type CompletenessReasonCode,
} from '../schema';
import { normalizeInline } from '../dom/text';
import { collectBlocks, type Collected } from './blocks';
import { buildSections, joinBlocks } from './sections';
import { sha256Hex } from './hash';

export { collectBlocks } from './blocks';
export { buildSections, joinBlocks, makeIdAllocator, slugify } from './sections';
export { sha256Hex } from './hash';

/** Plain-language messages for each completeness reason (FR-CMP-04). */
export const REASON_MESSAGES: Record<CompletenessReasonCode, string> = {
  collapsed_section: 'Some sections were collapsed, so their text was not read.',
  read_more: 'Part of the text is behind a "Read more" control.',
  pagination: 'The agreement continues on another page.',
  closed_shadow_root: 'Part of the page is in a component Specter cannot read.',
  cross_origin_frame: 'Part of the page is in a frame from another site, which Specter cannot read.',
  may_not_have_loaded: 'Some content may not have loaded.',
  page_changed: 'The page changed while Specter was reading it.',
};

/** Completeness is capped here when something unmeasurable is missing (FR-CMP-03). */
export const UNMEASURED_CAP = 0.9;

export interface RootChoice {
  root: Element;
  dropChrome: boolean;
}

function paragraphChars(el: Element): number {
  let total = 0;
  el.querySelectorAll('p, li').forEach((p) => {
    total += (p.textContent ?? '').length;
  });
  return total;
}

/**
 * Picks the element holding the agreement: <main>, a single <article>, or the
 * smallest ancestor holding 80% of the paragraph text (design section 5).
 */
export function chooseRoot(doc: Document): RootChoice {
  const main = doc.querySelector('main, [role="main"]');
  if (main) return { root: main, dropChrome: false };
  const articles = doc.querySelectorAll('article');
  if (articles.length === 1) return { root: articles[0]!, dropChrome: false };

  const body = doc.body ?? doc.documentElement;
  const scores = new Map<Element, number>();
  body.querySelectorAll('p, li').forEach((p) => {
    const parent = p.parentElement;
    if (parent) scores.set(parent, (scores.get(parent) ?? 0) + (p.textContent ?? '').length);
  });
  let best: Element | null = null;
  let bestScore = 0;
  for (const [el, score] of scores) {
    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }
  if (!best) return { root: body, dropChrome: true };

  const total = paragraphChars(body);
  let root: Element = best;
  while (root !== body && root.parentElement && paragraphChars(root) < 0.8 * total) {
    root = root.parentElement;
  }
  return { root, dropChrome: true };
}

export function scoreCompleteness(
  readChars: number,
  collected: Pick<Collected, 'skippedChars' | 'unmeasured'>,
  extra: CompletenessReasonCode[] = [],
): { completeness: number; reasons: CompletenessReason[] } {
  const reasons: CompletenessReason[] = [];
  let skipped = 0;
  collected.skippedChars.forEach((chars, code) => {
    skipped += chars;
    reasons.push({ code, message: REASON_MESSAGES[code], estimatedChars: chars });
  });
  const unmeasured = new Set([...collected.unmeasured, ...extra]);
  unmeasured.forEach((code) => {
    if (!collected.skippedChars.has(code)) reasons.push({ code, message: REASON_MESSAGES[code] });
  });
  let completeness = readChars + skipped === 0 ? 0 : readChars / (readChars + skipped);
  if (unmeasured.size > 0) completeness = Math.min(completeness, UNMEASURED_CAP);
  return { completeness: Math.round(completeness * 1000) / 1000, reasons };
}

export interface ExtractOptions {
  kind: AgreementKind;
  source: 'page' | 'modal' | 'linked';
  url: string;
  /** Extract this element (for example a cookie banner) instead of guessing the root. */
  root?: Element;
  title?: string;
  /** Extra reasons from the caller, for example 'page_changed'. */
  extraReasons?: CompletenessReasonCode[];
  now?: Date;
}

/** Extracts one agreement into a validated ExtractedDocument (FR-EXT-01 to 09). */
export async function extractDocument(
  doc: Document,
  opts: ExtractOptions,
): Promise<ExtractedDocument> {
  const choice: RootChoice = opts.root
    ? { root: opts.root, dropChrome: false }
    : chooseRoot(doc);
  const collected = collectBlocks(choice.root, { dropChrome: choice.dropChrome });
  const joined = joinBlocks(collected.blocks);
  const sections = buildSections(collected.blocks, joined);
  const { completeness, reasons } = scoreCompleteness(
    joined.text.length,
    collected,
    opts.extraReasons,
  );
  const url = new URL(opts.url);
  const firstHeading = collected.blocks.find((b) => b.level > 0)?.text;
  return ExtractedDocument.parse({
    url: `${url.origin}${url.pathname}`,
    title: opts.title ?? firstHeading ?? normalizeInline(doc.title ?? ''),
    kind: opts.kind,
    source: opts.source,
    text: joined.text,
    sections,
    documentHash: await sha256Hex(joined.text),
    completeness,
    completenessReasons: reasons,
    extractedAt: (opts.now ?? new Date()).toISOString(),
  });
}
