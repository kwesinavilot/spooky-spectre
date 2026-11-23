/**
 * Show on page (design steering 5.2, 6D). Runs in the content script. Everything is drawn inside the open
 * shadow root of the overlay host, so the page text, layout and buttons are not changed. Boxes ignore
 * pointer events. The margin marker and the popover accept them. Esc closes the popover first, then the
 * highlight. Page text and finding text are inserted as text nodes, never as HTML.
 */
import type { HighlightCard, SpecterMessage } from './messaging';

const HOST_ID = 'specter-overlay-host';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT_GUESS = 240;

const CSS = `
.hl{position:fixed;border-radius:4px;background:rgba(199,167,255,.2);
  --c:#C7A7FF;box-shadow:0 0 0 2px var(--c);pointer-events:none;}
.hl.high{background:rgba(220,70,103,.16);--c:#DC4667;}
.hl.pulse{animation:specter-pulse 1.2s ease-out 2;}
@keyframes specter-pulse{from{box-shadow:0 0 0 0 var(--c);}to{box-shadow:0 0 0 12px transparent;}}
.marker{position:fixed;width:44px;height:44px;border:0;padding:0;background:transparent;color:#C7A7FF;
  cursor:pointer;display:flex;align-items:center;justify-content:center;pointer-events:auto;}
.marker .glyph{width:26px;height:26px;border-radius:13px;background:#191C2B;border:1px solid #8B6BC3;
  display:flex;align-items:center;justify-content:center;}
.marker:focus-visible{outline:2px solid #C7A7FF;outline-offset:2px;border-radius:12px;}
.pop{position:fixed;width:${POPOVER_WIDTH}px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:16px;
  background:#191C2B;color:#F4EAFF;border:1px solid #2E3252;border-radius:16px;
  box-shadow:0 18px 40px rgba(0,0,0,.45);font:14px/1.5 system-ui,sans-serif;pointer-events:auto;}
.chip{display:inline-block;border:1px solid;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;margin-right:6px;}
.chip.high{color:#FF9DB0;border-color:#DC4667;}
.chip.medium{color:#E4B15C;border-color:#E4B15C;}
.chip.neutral{color:#BDB8CE;border-color:#2E3252;}
.chip.ok{color:#65BDA6;border-color:#65BDA6;}
.title{margin:10px 0 4px;font-weight:600;font-size:15px;}
.sentence{margin:0 0 12px;color:#BDB8CE;}
.row{display:flex;gap:8px;}
.btn{min-height:44px;border-radius:12px;padding:0 14px;font:600 14px system-ui,sans-serif;cursor:pointer;
  border:1px solid #8B6BC3;background:transparent;color:#F4EAFF;}
.btn.primary{background:#C7A7FF;color:#0D101B;border-color:#C7A7FF;}
.btn:focus-visible{outline:2px solid #C7A7FF;outline-offset:2px;}
`;

const GHOST_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M5 21V11a7 7 0 0 1 14 0v10l-2.33-1.6L14.33 21 12 19.4 9.67 21 7.33 19.4Z"/>' +
  '<circle cx="9.5" cy="11" r="0.6" fill="currentColor"/><circle cx="14.5" cy="11" r="0.6" fill="currentColor"/></svg>';

interface SlotLike {
  node: Text;
  offset: number;
}

interface Active {
  range: Range;
  layer: HTMLDivElement;
  effect: string;
  card: HighlightCard | null;
  marker: HTMLButtonElement | null;
  popover: HTMLDivElement | null;
  onMove: () => void;
  onKey: (e: KeyboardEvent) => void;
}

let active: Active | null = null;

/**
 * Maps the page's visible text to positions in its text nodes, collapsing whitespace the same way the
 * quote was normalized. Returns the first match.
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
  const slots: SlotLike[] = [];
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const data = n.data;
    for (let i = 0; i < data.length; i++) {
      const ch = data[i]!;
      if (/\s/.test(ch)) {
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

function impactClass(impact: string): string {
  if (impact.startsWith('High')) return 'high';
  if (impact.startsWith('Medium')) return 'medium';
  return 'neutral';
}

function buildMarker(card: HighlightCard, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'marker';
  b.setAttribute('aria-label', `Specter finding: ${card.title}`);
  b.setAttribute('aria-expanded', 'false');
  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  // Constant markup from this file, not page content.
  glyph.innerHTML = GHOST_SVG;
  b.append(glyph);
  b.addEventListener('click', onClick);
  return b;
}

function buildPopover(card: HighlightCard): HTMLDivElement {
  const pop = document.createElement('div');
  pop.className = 'pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `Specter finding: ${card.title}`);

  const chips = document.createElement('div');
  const impact = document.createElement('span');
  impact.className = `chip ${impactClass(card.impact)}`;
  impact.textContent = card.impact;
  const source = document.createElement('span');
  source.className = 'chip ok';
  source.textContent = 'Source verified';
  chips.append(impact, source);

  const title = document.createElement('p');
  title.className = 'title';
  title.textContent = card.title;
  const sentence = document.createElement('p');
  sentence.className = 'sentence';
  sentence.textContent = card.sentence;

  const row = document.createElement('div');
  row.className = 'row';
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'btn primary';
  open.textContent = 'Open in Specter';
  open.addEventListener('click', () => {
    const message: SpecterMessage = { type: 'focus-finding', id: card.id };
    void chrome.runtime.sendMessage(message).catch(() => {});
  });
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'btn';
  dismiss.textContent = 'Dismiss';
  dismiss.addEventListener('click', () => clearHighlight());
  row.append(open, dismiss);

  pop.append(chips, title, sentence, row);
  return pop;
}

function togglePopover(): void {
  if (!active || !active.card) return;
  if (active.popover) {
    closePopover();
    return;
  }
  active.popover = buildPopover(active.card);
  active.layer.append(active.popover);
  active.marker?.setAttribute('aria-expanded', 'true');
  active.popover.querySelector<HTMLButtonElement>('button')?.focus();
  placeFloating();
}

function closePopover(): void {
  if (!active) return;
  active.popover?.remove();
  active.popover = null;
  active.marker?.setAttribute('aria-expanded', 'false');
  active.marker?.focus();
}

/** Places the marker beside the first line of the highlight, and the popover beside the marker. */
function placeFloating(): void {
  if (!active) return;
  const rects = Array.from(active.range.getClientRects()).filter((r) => r.width > 0 || r.height > 0);
  const first = rects[0];
  if (!first || !active.marker) return;

  const markerLeft = Math.max(0, first.left - 44);
  const markerTop = first.top + first.height / 2 - 22;
  active.marker.style.left = `${markerLeft}px`;
  active.marker.style.top = `${markerTop}px`;

  if (active.popover) {
    const roomRight = window.innerWidth - (markerLeft + 48);
    const left = roomRight >= POPOVER_WIDTH + 8 ? markerLeft + 48 : Math.max(8, markerLeft - POPOVER_WIDTH - 8);
    const top = Math.min(Math.max(8, markerTop), Math.max(8, window.innerHeight - POPOVER_HEIGHT_GUESS - 8));
    active.popover.style.left = `${left}px`;
    active.popover.style.top = `${top}px`;
  }
}

function paint(layer: HTMLDivElement, range: Range, effect: string, animate: boolean): void {
  // Boxes are rebuilt; the marker and popover are kept, so their focus survives a scroll.
  Array.from(layer.querySelectorAll('.hl')).forEach((n) => n.remove());
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
    layer.prepend(box);
  }
  placeFloating();
}

/**
 * Highlights the quote and scrolls to it. With a card, also draws the margin marker. Returns false when the
 * live page no longer has the passage.
 */
export function showHighlight(quote: string, effect: string, card?: HighlightCard): boolean {
  clearHighlight();
  const root = overlayRoot();
  const range = findQuoteRange(quote);
  if (!root || !range) return false;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anchor = range.startContainer.parentElement;
  anchor?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });

  const layer = document.createElement('div');
  root.append(layer);

  let frame = 0;
  const onMove = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (active) paint(active.layer, active.range, active.effect, false);
    });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (active?.popover) closePopover();
    else clearHighlight();
  };

  active = {
    range,
    layer,
    effect,
    card: card ?? null,
    marker: null,
    popover: null,
    onMove,
    onKey,
  };
  if (card) {
    active.marker = buildMarker(card, togglePopover);
    layer.append(active.marker);
  }
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
