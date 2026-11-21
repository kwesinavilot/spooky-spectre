import type { ElementAnchor, TextQuote } from '../schema';

const SIMPLE_ID = /^[A-Za-z][\w-]*$/;

function pathWithinRoot(el: Element): string {
  const root = el.getRootNode() as Document | ShadowRoot;
  const segments: string[] = [];
  let node: Element | null = el;
  while (node) {
    const current: Element = node;
    const id = current.getAttribute('id');
    if (id && SIMPLE_ID.test(id) && root.querySelectorAll(`#${id}`).length === 1) {
      segments.unshift(`#${id}`);
      break;
    }
    const parent: Element | null = current.parentElement;
    if (!parent) {
      segments.unshift(current.localName);
      break;
    }
    const same = Array.from(parent.children).filter((c) => c.localName === current.localName);
    segments.unshift(
      same.length > 1
        ? `${current.localName}:nth-of-type(${same.indexOf(current) + 1})`
        : current.localName,
    );
    node = parent;
  }
  return segments.join(' > ');
}

/** CSS path to `el`; each shadow boundary is written as ' >>> ' (FR-EXT-06). */
export function cssPath(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur) {
    parts.unshift(pathWithinRoot(cur));
    const root = cur.getRootNode() as Document | ShadowRoot;
    cur = root.nodeType === 11 && 'host' in root ? (root as ShadowRoot).host : null;
  }
  return parts.join(' >>> ');
}

/** Text-quote selector: up to 64 characters of the passage plus 32 before and after. */
export function textQuote(text: string, start: number, end: number): TextQuote {
  const exact = text.slice(start, Math.min(end, start + 64));
  return {
    exact,
    prefix: text.slice(Math.max(0, start - 32), start),
    suffix: text.slice(start + exact.length, start + exact.length + 32),
  };
}

export function anchorFor(el: Element, quote: TextQuote): ElementAnchor {
  return { cssPath: cssPath(el), quote };
}
