import { SENSITIVE_INPUT_SELECTORS } from '../privacy';
import type { Unreadable } from '../schema';

/** Elements whose contents are never read: code, media and form controls (FR-PRV-02). */
export const SKIP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'head',
  'meta',
  'link',
  'svg',
  'canvas',
  'video',
  'audio',
  'object',
  'embed',
  'input',
  'textarea',
  'select',
  'option',
  'optgroup',
  'datalist',
  'output',
]);

const CONSENT_HINT =
  /cookie|consent|cmp|gdpr|ccpa|onetrust|didomi|usercentrics|sourcepoint|trustarc|quantcast|cookiebot/i;

export function isSensitive(el: Element): boolean {
  return SENSITIVE_INPUT_SELECTORS.some((s) => {
    try {
      return el.matches(s);
    } catch {
      return false;
    }
  });
}

/** True for elements whose text Specter must never read. */
export function isSkipped(el: Element): boolean {
  return SKIP_TAGS.has(el.localName) || isSensitive(el);
}

function inlineStyle(el: Element): string {
  return (el.getAttribute('style') ?? '').toLowerCase().replace(/\s+/g, '');
}

/** Computed style when a window is available (live pages), otherwise null (parsed documents). */
export function computedStyle(el: Element): CSSStyleDeclaration | null {
  const view = el.ownerDocument?.defaultView;
  if (!view || typeof view.getComputedStyle !== 'function') return null;
  try {
    return view.getComputedStyle(el);
  } catch {
    return null;
  }
}

export function isHidden(el: Element): boolean {
  if (el.hasAttribute('hidden')) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  const inline = inlineStyle(el);
  if (inline.includes('display:none') || inline.includes('visibility:hidden')) return true;
  const cs = computedStyle(el);
  return cs !== null && (cs.display === 'none' || cs.visibility === 'hidden');
}

export function isFixedLike(el: Element): boolean {
  const inline = inlineStyle(el);
  if (inline.includes('position:fixed') || inline.includes('position:sticky')) return true;
  const cs = computedStyle(el);
  return cs !== null && (cs.position === 'fixed' || cs.position === 'sticky');
}

export function looksLikeConsent(el: Element): boolean {
  const hint = [
    el.localName,
    el.getAttribute('id'),
    el.getAttribute('class'),
    el.getAttribute('src'),
    el.getAttribute('title'),
    el.getAttribute('name'),
  ]
    .filter(Boolean)
    .join(' ');
  return CONSENT_HINT.test(hint);
}

/** A custom element with no readable content that looks like a consent tool (likely a closed shadow root). */
export function isClosedShadowSuspect(el: Element): boolean {
  return (
    el.localName.includes('-') &&
    !(el as HTMLElement).shadowRoot &&
    el.childNodes.length === 0 &&
    looksLikeConsent(el)
  );
}

export function frameDocument(el: Element): Document | null {
  try {
    return (el as HTMLIFrameElement).contentDocument ?? null;
  } catch {
    return null;
  }
}

/** Parent across shadow boundaries. */
export function parentDeep(el: Element): Element | null {
  if (el.parentElement) return el.parentElement;
  const root = el.getRootNode() as ShadowRoot | Document;
  return root.nodeType === 11 && 'host' in root ? (root as ShadowRoot).host : null;
}

export function containsDeep(ancestor: Element, el: Element): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (cur === ancestor) return true;
    cur = parentDeep(cur);
  }
  return false;
}

export interface WalkContext {
  unreadable: Unreadable[];
}

/**
 * Yields every element under `root` in document order, entering open shadow
 * roots and same-origin iframes. Never enters sensitive fields or skipped tags
 * (form controls themselves are yielded so rules can see they exist, but their
 * contents and values are never read). Records unreadable consent containers.
 */
export function* elementsDeep(
  root: Document | Element | ShadowRoot,
  ctx: WalkContext,
): Generator<Element> {
  const stack: Element[] = [];
  const pushChildren = (parent: ParentNode) => {
    const kids = Array.from(parent.children);
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]!);
  };
  pushChildren(root);
  while (stack.length > 0) {
    const el = stack.pop()!;
    if (isSensitive(el)) continue;
    const name = el.localName;
    if (SKIP_TAGS.has(name) && !['input', 'select', 'textarea'].includes(name)) continue;
    yield el;
    if (SKIP_TAGS.has(name)) continue;
    if (name === 'iframe') {
      const doc = frameDocument(el);
      if (doc?.documentElement) stack.push(doc.documentElement);
      else if (looksLikeConsent(el)) {
        ctx.unreadable.push({
          where: 'cross_origin_frame',
          note: 'A consent frame from another site that Specter cannot read.',
        });
      }
      continue;
    }
    const shadow = (el as HTMLElement).shadowRoot;
    if (shadow) pushChildren(shadow);
    else if (isClosedShadowSuspect(el)) {
      ctx.unreadable.push({
        where: 'closed_shadow_root',
        note: 'A consent component whose content Specter cannot read.',
      });
    }
    pushChildren(el);
  }
}
