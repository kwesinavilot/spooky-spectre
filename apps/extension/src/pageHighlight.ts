/**
 * Show on page (design steering 5.2, section 6D). Runs in the content script.
 * Boxes are drawn inside the open shadow root of the overlay host, so the page
 * text, layout and buttons are not changed, and every box ignores pointer
 * events. Esc clears the highlight.
 */
const HOST_ID = 'specter-overlay-host';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

const CSS = `
.hl{position:fixed;border-radius:4px;background:rgba(199,167,255,.2);
  --c:#C7A7FF;box-shadow:0 0 0 2px var(--c);pointer-events:none;}
.hl.high{background:rgba(220,70,103,.16);--c:#DC4667;}
.hl.pulse{animation:specter-pulse 1.2s ease-out 2;}
@keyframes specter-pulse{from{box-shadow:0 0 0 0 var(--c);}to{box-shadow:0 0 0 12px transparent;}}
`;

interface Slot {
  node: Text;
  offset: number;
}

interface Active {
  range: Range;
  layer: HTMLDivElement;
  effect: string;
  reduce: boolean;
  onMove: () => void;
  onKey: (e: KeyboardEvent) => void;
}

let active: Active | null = null;

/**
 * Maps the page's visible text to positions in its text nodes, collapsing
 * whitespace the same way the quote was normalized. Returns the first match.
 */
export function findQuoteRange(quote: string): Range | null {
  const needle = quote.replace(/\s+/g, ' ').trim();
  if (needle.length === 0 || !document.body) return null;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let text = '';
  const slots: Slot[] = [];
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const data = n.data;
    for (let i = 0; i < data.length; i++) {
      const ch = data[i]!;
      if (/\s/.test(ch)) {
        // Collapse runs of whitespace and drop leading whitespace.
        if (text.length === 0 || text.endsWith(' ')) continue;
        text += ' ';
      } else {
        text += ch;
      }
      slots.push({ node: n, offset: i });
    }
  }

  const at = text.indexOf(needle);
  if (at < 0) return null;
  const first = slots[at];
  const last = slots[at + needle.length - 1];
  if (!first || !last) return null;

  const range = document.createRange();
  range.setStart(first.node, first.offset);
  range.setEnd(last.node, last.offset + 1);
  return range;
}

function overlayRoot(): ShadowRoot | null {
  const root = document.getElementById(HOST_ID)?.shadowRoot ?? null;
  if (root && !root.querySelector('style[data-specter]')) {
    const style = document.createElement('style');
    style.setAttribute('data-specter', '');
    style.textContent = CSS;
    root.append(style);
  }
  return root;
}

function paint(layer: HTMLDivElement, range: Range, effect: string, animate: boolean): void {
  layer.replaceChildren();
  for (const r of Array.from(range.getClientRects())) {
    if (r.width === 0 && r.height === 0) continue;
    const box = document.createElement('div');
    box.className = ['hl', effect === 'possession' ? 'high' : '', animate && effect !== 'whisper' ? 'pulse' : '']
      .filter(Boolean)
      .join(' ');
    box.style.left = `${r.left - 3}px`;
    box.style.top = `${r.top - 3}px`;
    box.style.width = `${r.width + 6}px`;
    box.style.height = `${r.height + 6}px`;
    layer.append(box);
  }
}

/** Highlights the quote and scrolls to it. Returns false when the live page no longer has it. */
export function showHighlight(quote: string, effect: string): boolean {
  clearHighlight();
  const root = overlayRoot();
  const range = findQuoteRange(quote);
  if (!root || !range) return false;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anchor = range.startContainer.parentElement;
  anchor?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });

  const layer = document.createElement('div');
  root.append(layer);

  // Boxes follow the text while the page scrolls. Only the first paint animates.
  let frame = 0;
  const onMove = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (active) paint(active.layer, active.range, active.effect, false);
    });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') clearHighlight();
  };

  active = { range, layer, effect, reduce, onMove, onKey };
  paint(layer, range, effect, !reduce);
  window.addEventListener('scroll', onMove, { capture: true, passive: true });
  window.addEventListener('resize', onMove, { passive: true });
  document.addEventListener('keydown', onKey, true);
  return true;
}

export function clearHighlight(): void {
  if (!active) return;
  window.removeEventListener('scroll', active.onMove, { capture: true });
  window.removeEventListener('resize', active.onMove);
  document.removeEventListener('keydown', active.onKey, true);
  active.layer.remove();
  active = null;
}
