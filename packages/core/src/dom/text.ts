import { isHidden, isSkipped } from './walk';

/**
 * Normalizes one block of text: Unicode NFC, every whitespace run (including
 * non-breaking and zero-width spaces) collapsed to one space, trimmed.
 * Extraction joins normalized blocks with a single '\n' (FR-EXT-03). Spec 5
 * must apply the same function to quotes before comparing them.
 */
export function normalizeInline(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[\s\u200b\u2060\ufeff]+/g, ' ')
    .trim();
}

/**
 * Visible text of a node for detection rules. Skips form controls, sensitive
 * fields and hidden elements, enters open shadow roots, and stops after
 * `limit` characters. Elements are separated by spaces, so this is for
 * keyword matching, not for extraction.
 */
export function visibleText(
  node: Node,
  limit = 5000,
  opts: { skipLabels?: boolean } = {},
): string {
  const parts: string[] = [];
  let length = 0;
  const visit = (n: Node): void => {
    if (length >= limit) return;
    if (n.nodeType === 3) {
      const t = n.nodeValue ?? '';
      parts.push(t);
      length += t.length;
      return;
    }
    if (n.nodeType === 1) {
      const el = n as Element;
      if (isSkipped(el) || isHidden(el)) return;
      if (opts.skipLabels && el.localName === 'label') return;
      const shadow = (el as HTMLElement).shadowRoot;
      if (shadow) {
        visit(shadow);
        return;
      }
      el.childNodes.forEach(visit);
      parts.push(' ');
      return;
    }
    if (n.nodeType === 9 || n.nodeType === 11) n.childNodes.forEach(visit);
  };
  visit(node);
  return normalizeInline(parts.join(''));
}
