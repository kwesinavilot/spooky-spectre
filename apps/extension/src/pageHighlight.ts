/**
 * Spectral Vision on the page (Spec 6; design steering 5.2, 6C, 6D). Runs in the content script.
 *
 * Every verified finding of an analysis gets a margin marker beside its clause, drawn as soon as the
 * analysis finishes. "Show on page" scrolls to one of them. Everything is drawn in the open shadow root of
 * the overlay host, so the page text, layout and buttons are not changed. Boxes ignore pointer events; the
 * markers, popovers and callouts accept them. Esc closes the innermost open thing first. Finding text is
 * inserted as text nodes, never as HTML.
 */
import type { MarkItem } from './messaging';

export type OverlayLevel = 'immersive' | 'subtle' | 'quiet';

const HOST_ID = 'specter-overlay-host';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
const POPOVER_WIDTH = 320;

const CSS = `
.mk{position:fixed;inset:0;pointer-events:none;}
.hl{position:fixed;border-radius:4px;background:rgba(199,167,255,.16);--c:#C7A7FF;
  box-shadow:0 0 0 2px var(--c);pointer-events:none;}
.hl.high{background:rgba(220,70,103,.16);--c:#DC4667;}
.hl.soft{box-shadow:0 0 0 1px rgba(199,167,255,.55);}
.hl.shimmer{animation:sv-shimmer .6s ease-out 1 both;}
.hl.pulse-once{animation:sv-pulse 1.2s ease-out 1;}
.hl.pulse-twice{animation:sv-pulse 1.2s ease-out 2;}
@keyframes sv-pulse{from{box-shadow:0 0 0 0 var(--c);}to{box-shadow:0 0 0 12px transparent;}}
@keyframes sv-shimmer{0%{box-shadow:0 0 0 0 rgba(199,167,255,0);}50%{box-shadow:0 0 0 4px rgba(199,167,255,.45);}100%{box-shadow:0 0 0 1px rgba(199,167,255,.55);}}
.marker{position:fixed;width:44px;height:44px;border:0;padding:0;background:transparent;color:#C7A7FF;
  cursor:pointer;display:flex;align-items:center;justify-content:center;pointer-events:auto;}
.marker .glyph{width:26px;height:26px;border-radius:13px;background:#191C2B;border:1px solid #8B6BC3;
  display:flex;align-items:center;justify-content:center;}
.marker.haunt .glyph{animation:sv-pulse 1.2s ease-out 2;}
.marker.rise{animation:sv-rise .6s ease-out 1 both;}
@keyframes sv-rise{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.marker:focus-visible{outline:2px solid #C7A7FF;outline-offset:2px;border-radius:12px;}
.pop,.callout{position:fixed;width:${POPOVER_WIDTH}px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:16px;
  background:#191C2B;color:#F4EAFF;border:1px solid #2E3252;border-radius:16px;
  box-shadow:0 18px 40px rgba(0,0,0,.45);font:14px/1.5 system-ui,sans-serif;pointer-events:auto;}
.chip{display:inline-block;border:1px solid;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;margin-right:6px;}
.chip.high{color:#FF9DB0;border-color:#DC4667;}
.chip.medium{color:#E4B15C;border-color:#E4B15C;}
.chip.neutral{color:#BDB8CE;border-color:#2E3252;}
.chip.ok{color:#65BDA6;border-color:#65BDA6;}
.title{margin:10px 0 4px;font-weight:600;font-size:15px;}
.sentence{margin:0 0 12px;color:#BDB8CE;}
.row{display:flex;gap:8px;flex-wrap:wrap;}
.btn{min-height:44px;border-radius:12px;padding:0 14px;font:600 14px system-ui,sans-serif;cursor:pointer;
  border:1px solid #8B6BC3;background:transparent;color:#F4EAFF;}
.btn.primary{background:#C7A7FF;color:#0D101B;border-color:#C7A7FF;}
.btn:focus-visible{outline:2px solid #C7A7FF;outline-offset:2px;}
.spec{position:fixed;pointer-events:none;color:#C7A7FF;transition:left .4s ease-out,top .4s ease-out,opacity .4s ease-out;}
.vig{position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 88%,rgba(0,0,0,.55) 100%);
  opacity:0;animation:sv-vig-in .4s ease-out 1 forwards;}
@keyframes sv-vig-in{to{opacity:1}}
.drift{position:fixed;pointer-events:none;color:#C7A7FF;animation:sv-drift 5s linear 1 both;}
@keyframes sv-drift{from{left:-60px;opacity:0}15%{opacity:.7}85%{opacity:.7}to{left:100vw;opacity:0}}
`;

const GHOST_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M5 21V11a7 7 0 0 1 14 0v10l-2.33-1.6L14.33 21 12 19.4 9.67 21 7.33 19.4Z"/>' +
  '<circle cx="9.5" cy="11" r="0.6" fill="currentColor"/><circle cx="14.5" cy="11" r="0.6" fill="currentColor"/></svg>';

interface Mark {
  item: MarkItem;
  range: Range;
  container: HTMLDivElement;
  marker: HTMLButtonElement;
  boxes: HTMLDivElement[];
  popover: HTMLDivElement | null;
  /** True after "Show on page": the box pulses at the current level (design steering 5.2, Haunting). */
  haunt: boolean;
}

const marks = new Map<string, Mark>();
let layer: HTMLDivElement | null = null;
let level: OverlayLevel = 'subtle';
let reduce = false;
let openId: string | null = null;
let listening = false;
let frame = 0;

/** Escape handlers, innermost last. Each returns true when it closed something. */
const escapeStack: (() => boolean)[] = [];

// Base Escape handler: close the popover if one is open, else clear the overlay. Page-opened things
// (callouts) are pushed on top of it and close first.
escapeStack.push(() => {
  if (openId) {
    closePopover();
    return true;
  }
  if (marks.size > 0 || layer) {
    clearAll();
    return true;
  }
  return false;
});

export function setEffectLevel(next: OverlayLevel, reducedMotion: boolean): void {
  level = next;
  reduce = reducedMotion;
}

/** Animations are off under Quiet and under reduced motion (design steering 5.1). */
export function animationsOn(): boolean {
  return !reduce && level !== 'quiet';
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

/** The overlay layer in the shadow root. Created on first use. Callouts and vignettes go here too. */
export function overlayLayer(): HTMLDivElement | null {
  if (layer?.isConnected) return layer;
  const root = overlayRoot();
  if (!root) return null;
  layer = document.createElement('div');
  layer.className = 'layer';
  root.append(layer);
  return layer;
}

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
  const slots: { node: Text; offset: number }[] = [];
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

/**
 * The class set for a finding's box, from its effect, whether it was shown on request, and the current
 * level (design steering 5.2). Immersive pulses twice (about 2.4 s); Subtle pulses once. Quiet and reduced
 * motion keep the static outline.
 */
function boxClass(effect: string, haunt: boolean): string {
  const high = effect === 'possession';
  const base = high ? 'hl high' : 'hl';
  if (!animationsOn()) return base;
  if (effect === 'whisper' && !haunt) return `${base} soft shimmer`;
  const pulses = haunt || effect === 'possession' || effect === 'hand' || effect === 'haunting';
  if (!pulses) return base;
  return `${base} ${level === 'immersive' ? 'pulse-twice' : 'pulse-once'}`;
}

function impactClass(impact: string): string {
  if (impact.startsWith('High')) return 'high';
  if (impact.startsWith('Medium')) return 'medium';
  return 'neutral';
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function buildMarker(id: string, title: string): HTMLButtonElement {
  const b = el('button', 'marker');
  b.type = 'button';
  b.setAttribute('aria-label', `Specter finding: ${title}`);
  b.setAttribute('aria-expanded', 'false');
  const glyph = el('span', 'glyph');
  // Constant markup from this file, not page content.
  glyph.innerHTML = GHOST_SVG;
  b.append(glyph);
  b.addEventListener('click', () => togglePopover(id));
  return b;
}

function buildPopover(item: MarkItem): HTMLDivElement {
  const pop = el('div', 'pop');
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `Specter finding: ${item.card.title}`);

  const chips = el('div');
  chips.append(
    Object.assign(el('span', `chip ${impactClass(item.card.impact)}`), { textContent: item.card.impact }),
  );
  // Only a finding that passed the quote check says so. A cited Ask excerpt does not.
  if (item.verified) chips.append(Object.assign(el('span', 'chip ok'), { textContent: 'Source verified' }));
  const title = el('p', 'title', item.card.title);
  const sentence = el('p', 'sentence', item.card.sentence);

  const row = el('div', 'row');
  const open = el('button', 'btn primary', 'Open in Specter');
  open.type = 'button';
  open.addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'focus-finding', id: item.id }).catch(() => {});
  });
  const dismiss = el('button', 'btn', 'Dismiss');
  dismiss.type = 'button';
  dismiss.addEventListener('click', () => clearAll());
  row.append(open, dismiss);

  pop.append(chips, title, sentence, row);
  return pop;
}

function togglePopover(id: string): void {
  if (openId === id) {
    closePopover();
    return;
  }
  closePopover();
  const m = marks.get(id);
  if (!m) return;
  openId = id;
  m.popover = buildPopover(m.item);
  m.container.append(m.popover);
  m.marker.setAttribute('aria-expanded', 'true');
  m.popover.querySelector<HTMLButtonElement>('button')?.focus();
  place(m);
}

function closePopover(): void {
  if (!openId) return;
  const m = marks.get(openId);
  m?.popover?.remove();
  if (m) {
    m.popover = null;
    m.marker.setAttribute('aria-expanded', 'false');
    m.marker.focus();
  }
  openId = null;
}

/** Places the boxes on the quote and the marker beside its first line. Repeated on scroll and resize. */
function place(m: Mark): void {
  const rects = Array.from(m.range.getClientRects()).filter((r) => r.width > 0 || r.height > 0);
  if (rects.length === 0) return;

  // Rebuild boxes only when the number of lines changes; otherwise move them, so animations do not restart.
  if (m.boxes.length !== rects.length) {
    m.boxes.forEach((b) => b.remove());
    m.boxes = rects.map(() => {
      const box = el('div');
      m.container.prepend(box);
      return box;
    });
  }
  // The class is the same on every placement, so a CSS animation is not restarted by scrolling.
  const cls = boxClass(m.item.effect, m.haunt);
  rects.forEach((r, i) => {
    const box = m.boxes[i]!;
    box.className = cls;
    box.style.left = `${r.left - 3}px`;
    box.style.top = `${r.top - 3}px`;
    box.style.width = `${r.width + 6}px`;
    box.style.height = `${r.height + 6}px`;
  });

  const first = rects[0]!;
  const markerLeft = Math.max(0, first.left - 44);
  const markerTop = first.top + first.height / 2 - 22;
  m.marker.style.left = `${markerLeft}px`;
  m.marker.style.top = `${markerTop}px`;

  if (m.popover) {
    const roomRight = window.innerWidth - (markerLeft + 48);
    const left = roomRight >= POPOVER_WIDTH + 8 ? markerLeft + 48 : Math.max(8, markerLeft - POPOVER_WIDTH - 8);
    const top = Math.min(Math.max(8, markerTop), Math.max(8, window.innerHeight - 260));
    m.popover.style.left = `${left}px`;
    m.popover.style.top = `${top}px`;
  }
}

function placeAll(): void {
  for (const m of marks.values()) place(m);
}

function onScrollOrResize(): void {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(placeAll);
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return;
  for (let i = escapeStack.length - 1; i >= 0; i--) {
    if (escapeStack[i]!()) return;
  }
}

function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });
  document.addEventListener('keydown', onKeyDown, true);
}

/** Registers an Escape handler for something the page code opens (a callout, for example). */
export function pushEscape(handler: () => boolean): () => void {
  escapeStack.push(handler);
  return () => {
    const i = escapeStack.indexOf(handler);
    if (i >= 0) escapeStack.splice(i, 1);
  };
}

function addMark(item: MarkItem): Mark | null {
  const existing = marks.get(item.id);
  if (existing) return existing;
  const lay = overlayLayer();
  const range = findQuoteRange(item.quote);
  if (!lay || !range) return null;

  const container = el('div', 'mk');
  const marker = buildMarker(item.id, item.card.title);
  container.append(marker);
  lay.append(container);
  // Subtle: the marker rises beside the clause once, as the design's rising ghost (5.2).
  if (level === 'subtle' && animationsOn()) marker.classList.add('rise');
  const m: Mark = { item, range, container, marker, boxes: [], popover: null, haunt: false };
  marks.set(item.id, m);
  place(m);
  return m;
}

/** Draws the marker and outline for every finding of an analysis. Replaces any earlier marks. */
export function showMarks(items: MarkItem[]): number {
  clearMarks();
  let count = 0;
  for (const item of items) {
    if (addMark(item)) count++;
  }
  if (count > 0) listen();
  return count;
}

/** Scrolls to a finding's clause and sends the spectral pointer if it was off screen. False if the passage is gone. */
export function focusMark(item: MarkItem): boolean {
  const m = addMark(item);
  if (!m) return false;
  const before = m.range.getBoundingClientRect();
  const offscreen = before.bottom < 0 || before.top > window.innerHeight;
  const anchor = m.range.startContainer.parentElement;
  const reducedNow = reduce || level === 'quiet';
  anchor?.scrollIntoView({ block: 'center', behavior: reducedNow ? 'auto' : 'smooth' });
  listen();
  if (offscreen) spectralPointer(m, reducedNow);
  // Haunting on request: the box pulses at the current level. Quiet keeps the static outline.
  m.haunt = !reducedNow;
  place(m);
  return true;
}

/** A ghost that travels from the nearest edge to the marker in 400 ms, then fades (design steering 5.2). */
function spectralPointer(m: Mark, reducedNow: boolean): void {
  const lay = overlayLayer();
  if (!lay) return;
  const ghost = el('div', 'spec');
  ghost.innerHTML = GHOST_SVG;
  lay.append(ghost);
  window.setTimeout(() => {
    const r = m.marker.getBoundingClientRect();
    const fromLeft = r.left < window.innerWidth / 2;
    const startLeft = fromLeft ? 0 : window.innerWidth - 24;
    if (reducedNow) {
      ghost.style.left = `${r.left}px`;
      ghost.style.top = `${r.top}px`;
    } else {
      ghost.style.left = `${startLeft}px`;
      ghost.style.top = `${r.top}px`;
      window.requestAnimationFrame(() => {
        ghost.style.left = `${r.left + 9}px`;
        ghost.style.top = `${r.top + 9}px`;
      });
    }
    window.setTimeout(() => ghost.remove(), 1400);
  }, 300);
}

/** Pulses a marker to say a finding was not shown in full (the haunting fallback). */
export function hauntMarker(id: string): void {
  const m = marks.get(id);
  if (!m || !animationsOn()) return;
  m.marker.classList.remove('haunt');
  void m.marker.offsetWidth;
  m.marker.classList.add('haunt');
}

/** The marker's element and the finding's clause rectangle, for placing a callout beside the control. */
export function markerRect(id: string): DOMRect | null {
  return marks.get(id)?.marker.getBoundingClientRect() ?? null;
}

export function hasMark(id: string): boolean {
  return marks.has(id);
}

export function openPopover(id: string): void {
  togglePopover(id);
}

export function clearMarks(): void {
  closePopover();
  for (const m of marks.values()) m.container.remove();
  marks.clear();
}

/** Removes everything the overlay drew, including callouts and the vignette. */
export function clearAll(): void {
  clearMarks();
  layer?.remove();
  layer = null;
}
