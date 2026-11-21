import type { CompletenessReasonCode } from '../schema';
import { frameDocument, isClosedShadowSuspect, isHidden, isSkipped } from '../dom/walk';
import { normalizeInline } from '../dom/text';

export interface Block {
  text: string;
  el: Element;
  /** Heading level 1..6, or 0 for a body block. */
  level: number;
}

export interface Collected {
  blocks: Block[];
  /** Characters Specter knows it skipped, per reason. */
  skippedChars: Map<CompletenessReasonCode, number>;
  /** Reasons whose size cannot be estimated. */
  unmeasured: Set<CompletenessReasonCode>;
}

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'dialog', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'caption',
]);
const BLOCK_SELECTOR = [...BLOCK_TAGS].join(',');
const CHROME_TAGS = new Set(['nav', 'aside', 'header', 'footer']);
const CHROME_ROLES = new Set(['navigation', 'banner', 'contentinfo', 'complementary']);
const READ_MORE = /^(read|show|see|view|expand)\s+(more|all|full|the full|everything)\b/i;
const NEXT_PAGE = /^(next|next page|older|more results|›|»)$/i;

export interface CollectOptions {
  /** Drop nav, aside, header and footer (used when the root was guessed). */
  dropChrome: boolean;
}

function headingLevel(el: Element): number {
  const m = /^h([1-6])$/.exec(el.localName);
  return m ? Number(m[1]) : 0;
}

function isBlock(el: Element): boolean {
  return BLOCK_TAGS.has(el.localName);
}

function hasBlockDescendant(el: Element): boolean {
  try {
    return el.querySelector(BLOCK_SELECTOR) !== null;
  } catch {
    return false;
  }
}

/** Navigation-like content: most of its text is link text (for example a table of contents). */
export function isMostlyLinks(el: Element): boolean {
  const total = normalizeInline(el.textContent ?? '').length;
  if (total === 0) return true;
  let linked = 0;
  el.querySelectorAll('a').forEach((a) => {
    linked += normalizeInline(a.textContent ?? '').length;
  });
  return linked / total >= 0.6;
}

function isPaginationLink(el: Element): boolean {
  if (el.localName !== 'a') return false;
  if ((el.getAttribute('rel') ?? '').split(/\s+/).includes('next')) return true;
  return NEXT_PAGE.test(normalizeInline(el.textContent ?? ''));
}

/**
 * Walks `root` in reading order and returns normalized text blocks plus what
 * could not be read (FR-EXT-02, FR-CMP-02). Never reads form controls, labels,
 * buttons or sensitive fields.
 */
export function collectBlocks(root: Element, opts: CollectOptions): Collected {
  const out: Collected = { blocks: [], skippedChars: new Map(), unmeasured: new Set() };
  const doc = root.ownerDocument;
  const collapsedIds = new Set(
    Array.from(doc.querySelectorAll('[aria-expanded="false"][aria-controls]')).flatMap((el) =>
      (el.getAttribute('aria-controls') ?? '').split(/\s+/).filter(Boolean),
    ),
  );

  const emit = (raw: string, el: Element, level: number) => {
    const text = normalizeInline(raw);
    if (text) out.blocks.push({ text, el, level });
  };

  /** Handles elements that never produce text but may signal missing content. Returns true if consumed. */
  const consumeSpecial = (el: Element): boolean => {
    const name = el.localName;
    if (isSkipped(el) || name === 'label') return true;
    if (name === 'button' || el.getAttribute('role') === 'button') {
      if (READ_MORE.test(normalizeInline(el.textContent ?? ''))) out.unmeasured.add('read_more');
      return true;
    }
    if (isPaginationLink(el)) {
      out.unmeasured.add('pagination');
      return true;
    }
    if (isHidden(el)) {
      const id = el.getAttribute('id');
      // A collapsed region the page can expand (aria-expanded="false") is part
      // of the agreement and is already in the page, so it is read. A collapsed
      // table of contents is navigation, not agreement text (task 7.4).
      if (id && collapsedIds.has(id) && !isMostlyLinks(el)) {
        visit(el, el);
      }
      return true;
    }
    if (opts.dropChrome && el !== root) {
      if (CHROME_TAGS.has(name) || CHROME_ROLES.has(el.getAttribute('role') ?? '')) return true;
    }
    if (isClosedShadowSuspect(el)) {
      out.unmeasured.add('closed_shadow_root');
      return true;
    }
    return false;
  };

  const inlineText = (node: Node): string => {
    if (node.nodeType === 3) return node.nodeValue ?? '';
    if (node.nodeType !== 1) return '';
    const el = node as Element;
    if (el.localName === 'br') return ' ';
    if (el.localName === 'a' && READ_MORE.test(normalizeInline(el.textContent ?? ''))) {
      out.unmeasured.add('read_more');
      return '';
    }
    if (consumeSpecial(el)) return '';
    const shadow = (el as HTMLElement).shadowRoot;
    const kids = shadow ? shadow.childNodes : el.childNodes;
    let s = '';
    kids.forEach((k) => {
      s += inlineText(k);
    });
    return s;
  };

  const visit = (container: Element | ShadowRoot, owner: Element) => {
    let buffer = '';
    const flush = () => {
      emit(buffer, owner, 0);
      buffer = '';
    };
    container.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        buffer += child.nodeValue ?? '';
        return;
      }
      if (child.nodeType !== 1) return;
      const el = child as Element;
      if (el.localName === 'br') {
        buffer += ' ';
        return;
      }
      if (el.localName === 'iframe') {
        flush();
        const frame = frameDocument(el);
        if (frame?.body) visit(frame.body, frame.body);
        else out.unmeasured.add('cross_origin_frame');
        return;
      }
      if (consumeSpecial(el)) return;
      const shadow = (el as HTMLElement).shadowRoot;
      if (shadow) {
        flush();
        visit(shadow, el);
        return;
      }
      if (el.localName === 'details' && !el.hasAttribute('open')) {
        // A closed <details> is folded away, not missing: its text is in the
        // page, so it is read in full (corpus finding, task 7.4).
        flush();
        visit(el, el);
        return;
      }
      const level = headingLevel(el);
      if (level > 0) {
        flush();
        emit(inlineText(el), el, level);
        return;
      }
      if (isBlock(el) || hasBlockDescendant(el)) {
        flush();
        if (isBlock(el) && !hasBlockDescendant(el)) emit(inlineText(el), el, 0);
        else visit(el, el);
        return;
      }
      buffer += inlineText(el);
    });
    flush();
  };

  const level = headingLevel(root);
  if (level > 0) emit(inlineText(root), root, level);
  else visit(root, root);
  return out;
}
