import type { CookieControl } from '../schema';
import { containsDeep, isFixedLike, isHidden, parentDeep } from '../dom/walk';

/** Hidden itself or inside a hidden ancestor (across shadow boundaries). */
function isHiddenDeep(el: Element): boolean {
  for (let cur: Element | null = el; cur; cur = parentDeep(cur)) {
    if (isHidden(cur)) return true;
  }
  return false;
}
import { visibleText } from '../dom/text';
import { classifyControlLabel, controlLabel, isControlElement, toCookieControl } from './controls';

const BANNER_KEYWORDS = /\bcookies?\b|\bconsent\b|\btracking\b|\bgdpr\b/i;
const MAX_ANCESTOR_STEPS = 8;
const COMPACT_CHARS = 1500;

export interface BannerMatch {
  element: Element;
  signals: string[];
  controls: CookieControl[];
  noRejectControlFound: boolean;
  confidence: number;
}

function isDialogLike(el: Element): boolean {
  const role = el.getAttribute('role');
  return (
    el.localName === 'dialog' ||
    role === 'dialog' ||
    role === 'alertdialog' ||
    el.getAttribute('aria-modal') === 'true'
  );
}

/**
 * Finds a cookie banner (FR-DET-02). Starts from controls whose label looks
 * like accept, reject or manage, and walks up to the container. A container
 * needs cookie or consent wording plus controls, and must be positioned
 * fixed or sticky, be a dialog, or be compact (short text).
 */
export function findBanner(elements: Element[]): BannerMatch | null {
  const controls = elements.filter((el) => {
    if (!isControlElement(el)) return false;
    const label = controlLabel(el);
    // A banner the user already dismissed is hidden; it is not on the page any more.
    return label !== null && classifyControlLabel(label) !== null && !isHiddenDeep(el);
  });
  if (controls.length === 0) return null;

  interface Candidate {
    el: Element;
    positioned: boolean;
    dialog: boolean;
    compact: boolean;
    textLength: number;
    controlCount: number;
  }
  const seen = new Map<Element, Candidate | null>();

  for (const control of controls) {
    let anc = parentDeep(control);
    for (let step = 0; anc && step < MAX_ANCESTOR_STEPS; step++, anc = parentDeep(anc)) {
      if (['html', 'body', 'main'].includes(anc.localName)) break;
      if (seen.has(anc)) continue;
      const text = visibleText(anc, COMPACT_CHARS * 2);
      if (!BANNER_KEYWORDS.test(text)) {
        seen.set(anc, null);
        continue;
      }
      const positioned = isFixedLike(anc);
      const dialog = isDialogLike(anc);
      const compact = text.length < COMPACT_CHARS;
      if (!positioned && !dialog && !compact) {
        seen.set(anc, null);
        continue;
      }
      const container = anc;
      const inside = controls.filter((c) => containsDeep(container, c));
      const roles = new Set(inside.map((c) => classifyControlLabel(controlLabel(c) ?? '')));
      // A banner asks for a decision: it needs an accept or reject control. A
      // footer "Cookie settings" link alone is not a banner. Outside a fixed
      // container or dialog, it needs two different kinds of control (FR-DET-02).
      const decides = roles.has('accept_all') || roles.has('reject_optional');
      if (!decides || (!positioned && !dialog && roles.size < 2)) {
        seen.set(anc, null);
        continue;
      }
      seen.set(anc, {
        el: anc,
        positioned,
        dialog,
        compact,
        textLength: text.length,
        controlCount: inside.length,
      });
    }
  }

  const candidates = [...seen.values()].filter((c): c is Candidate => c !== null);
  if (candidates.length === 0) return null;

  const score = (c: Candidate) => (c.positioned || c.dialog ? 100 : 0) + c.controlCount * 10;
  candidates.sort((a, b) => score(b) - score(a) || a.textLength - b.textLength);
  const best = candidates[0]!;

  const inside = elements.filter((el) => isControlElement(el) && containsDeep(best.el, el));
  const found = inside
    .map(toCookieControl)
    .filter((c): c is CookieControl => c !== null);

  const signals = ['banner.keyword', 'banner.controls'];
  if (best.positioned) signals.push('banner.positioned');
  if (best.dialog) signals.push('banner.dialog');
  if (best.compact) signals.push('banner.compact');

  return {
    element: best.el,
    signals,
    controls: found,
    noRejectControlFound: !found.some((c) => c.role === 'reject_optional'),
    confidence: best.positioned || best.dialog ? 0.9 : 0.7,
  };
}
