/**
 * Possession on the page (Spec 6 tasks 12 to 14; design steering 5.3). Watches for a moment of agreement:
 * the pointer within 120 px of a detected action control (Accept, Start trial, Submit), focus on one, or
 * "Show on page" for a finding. Asks the rules module (`possession.ts`) whether Possession fires, and if it
 * does, draws a callout beside the control. Specter never prevents the click and never delays the site.
 */
import type { MarkItem } from './messaging';
import {
  countersForDay,
  decideEffect,
  POINTER_ZONE_PX,
  siteKey,
  type Moment,
  type PossessionCounters,
} from './possession';
import {
  animationsOn,
  hasMark,
  hauntMarker,
  openPopover,
  overlayLayer,
  pushEscape,
} from './pageHighlight';

const STORAGE_KEY = 'possessionCounters';
const CALLOUT_WIDTH = 320;
const CALLOUT_HOLD_MS = 8000;
const CONTROL_SELECTOR = 'button, a, input[type=submit], input[type=button], [role=button]';
const GHOST_SVG =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M5 21V11a7 7 0 0 1 14 0v10l-2.33-1.6L14.33 21 12 19.4 9.67 21 7.33 19.4Z"/>' +
  '<circle cx="9.5" cy="11" r="0.6" fill="currentColor"/><circle cx="14.5" cy="11" r="0.6" fill="currentColor"/></svg>';

type Level = 'immersive' | 'subtle' | 'quiet';

interface State {
  items: MarkItem[];
  controls: { label: string }[];
  level: Level;
  reduce: boolean;
}

let state: State = { items: [], controls: [], level: 'subtle', reduce: false };
/** Findings already possessed on this page load. Resets on reload. */
const shownThisLoad = new Set<string>();
let callout: { key: string; close: () => void } | null = null;
let pointer: { x: number; y: number } | null = null;
let bound = false;
let frame = 0;

/** Sets what the page knows about this analysis. Call after the markers are drawn. */
export function configure(next: State): void {
  state = next;
  bind();
}

/** Removes the listeners and any open callout. */
export function dispose(): void {
  closeCallout();
  if (bound) {
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('focusin', onFocusIn, true);
    bound = false;
  }
  state = { items: [], controls: [], level: state.level, reduce: state.reduce };
}

function bind(): void {
  if (bound) return;
  bound = true;
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('focusin', onFocusIn, true);
}

/** Visible page elements whose text matches one of the detected action controls. */
export function controlElements(): HTMLElement[] {
  const labels = state.controls.map((c) => c.label.trim().toLowerCase()).filter(Boolean);
  if (labels.length === 0) return [];
  const out: HTMLElement[] = [];
  for (const node of Array.from(document.querySelectorAll<HTMLElement>(CONTROL_SELECTOR))) {
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const text = (
      node.textContent ||
      (node as HTMLInputElement).value ||
      node.getAttribute('aria-label') ||
      ''
    )
      .trim()
      .toLowerCase();
    if (text && labels.some((l) => text === l || text.includes(l))) out.push(node);
  }
  return out;
}

function distanceToRect(x: number, y: number, r: DOMRect): number {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

function onPointer(e: PointerEvent): void {
  pointer = { x: e.clientX, y: e.clientY };
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!pointer) return;
    for (const el of controlElements()) {
      if (distanceToRect(pointer.x, pointer.y, el.getBoundingClientRect()) <= POINTER_ZONE_PX) {
        void moment(`control:${el.textContent?.trim() ?? ''}`, () => el.getBoundingClientRect(), 'pointer');
        break;
      }
    }
  });
}

function onFocusIn(e: FocusEvent): void {
  const target = e.target as HTMLElement | null;
  if (!target || !controlElements().includes(target)) return;
  void moment(`control:${target.textContent?.trim() ?? ''}`, () => target.getBoundingClientRect(), 'focus');
}

/** "Show on page" for one finding: the moment is the finding itself. */
export function momentForFinding(id: string, markerRect: () => DOMRect | null): void {
  void moment(`finding:${id}`, markerRect, 'show', id);
}

async function readCounters(): Promise<unknown> {
  try {
    return (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  } catch {
    return undefined;
  }
}

async function writeCounters(c: PossessionCounters): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: c });
  } catch {
    // Storage unavailable: the caps still hold for this page load.
  }
}

/**
 * One moment of agreement. Picks the strongest High, verified finding that has a marker, asks the rules
 * module, and draws the callout or haunts the marker when a cap applies.
 */
async function moment(key: string, anchor: () => DOMRect | null, m: Moment, onlyId?: string): Promise<void> {
  if (callout && callout.key === key) return;
  const candidates = state.items
    .filter((i) => i.concern === 'high' && i.verified && hasMark(i.id) && (!onlyId || i.id === onlyId))
    .sort((a, b) => b.confidence - a.confidence);
  const item = candidates[0];
  if (!item) return;

  const counters = countersForDay(await readCounters(), new Date());
  const out = decideEffect(
    { id: item.id, concern: item.concern, verified: item.verified, confidence: item.confidence },
    m,
    { site: siteKey(location.href), counters, shownThisLoad },
  );
  if (out.decision === 'none') return;
  if (out.decision === 'capped') {
    hauntMarker(item.id);
    return;
  }
  shownThisLoad.add(item.id);
  await writeCounters(out.counters);
  openCallout(key, anchor, item);
}

function closeCallout(): void {
  callout?.close();
}

function positionCallout(box: HTMLElement, rect: DOMRect): void {
  const width = CALLOUT_WIDTH;
  const height = box.offsetHeight || 150;
  let left: number;
  let top: number;
  if (window.innerWidth - rect.right >= width + 16) {
    left = rect.right + 8;
    top = rect.top;
  } else if (rect.left >= width + 16) {
    left = rect.left - width - 8;
    top = rect.top;
  } else {
    // No room at the side: below the control, never over it.
    left = rect.left;
    top = rect.bottom + 8;
  }
  left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
  top = Math.min(Math.max(8, top), window.innerHeight - height - 8);
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
}

function openCallout(key: string, anchor: () => DOMRect | null, item: MarkItem): void {
  const lay = overlayLayer();
  if (!lay) return;
  closeCallout();

  const box = document.createElement('div');
  box.className = 'callout';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Specter: before you press this');

  const text = document.createElement('p');
  text.className = 'sentence';
  const section = item.section ? ` (${item.section})` : '';
  text.textContent = `Before you press this: ${item.card.title}${section}`;

  const row = document.createElement('div');
  row.className = 'row';
  const why = document.createElement('button');
  why.type = 'button';
  why.className = 'btn primary';
  why.textContent = 'Why am I seeing this?';
  why.addEventListener('click', () => {
    closeCallout();
    openPopover(item.id);
  });
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'btn';
  dismiss.textContent = 'Dismiss';
  dismiss.addEventListener('click', () => closeCallout());
  row.append(why, dismiss);
  box.append(text, row);
  lay.append(box);

  const rect = anchor();
  if (rect) positionCallout(box, rect);

  // Immersive adds a vignette and ghosts that drift once; both end with the callout.
  const extras: HTMLElement[] = [];
  if (state.level === 'immersive' && !state.reduce && animationsOn()) {
    const vig = document.createElement('div');
    vig.className = 'vig';
    lay.prepend(vig);
    extras.push(vig);
    [4, 11, 18].forEach((top, i) => {
      const ghost = document.createElement('div');
      ghost.className = 'drift';
      ghost.style.top = `${top}%`;
      ghost.style.animationDelay = `${i * 0.7}s`;
      ghost.innerHTML = GHOST_SVG;
      lay.append(ghost);
      extras.push(ghost);
    });
  }

  const release = pushEscape(() => {
    closeCallout();
    return true;
  });
  const timer = window.setTimeout(() => closeCallout(), CALLOUT_HOLD_MS);
  callout = {
    key,
    close: () => {
      release();
      window.clearTimeout(timer);
      box.remove();
      extras.forEach((n) => n.remove());
      callout = null;
    },
  };
  box.querySelector<HTMLButtonElement>('button')?.focus();
}
