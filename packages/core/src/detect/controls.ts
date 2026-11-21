import type { ControlRole, CookieControl } from '../schema';
import { anchorFor } from '../dom/anchors';
import { normalizeInline } from '../dom/text';

type KnownRole = Exclude<ControlRole, 'other'>;

/**
 * Label patterns for cookie controls, checked in this order so that
 * "Accept necessary only" counts as a reject. English only for the MVP;
 * adding a language is a change to this table only.
 */
export const CONTROL_PATTERNS: { role: KnownRole; pattern: RegExp }[] = [
  {
    role: 'reject_optional',
    pattern:
      /\b(reject|decline|refuse|deny|disagree|opt out)\b|\b(necessary|essential|required)( cookies)? only\b|\bonly (necessary|essential|required)\b|\bcontinue without\b/i,
  },
  {
    role: 'manage',
    pattern: /\b(manage|preferences|settings|customi[sz]e|options|choices|choose)\b/i,
  },
  {
    role: 'accept_all',
    pattern: /\b(accept|allow|agree|consent)\b|^(ok|okay|got it|i understand|yes)\b/i,
  },
];

export function classifyControlLabel(label: string): KnownRole | null {
  for (const { role, pattern } of CONTROL_PATTERNS) {
    if (pattern.test(label)) return role;
  }
  return null;
}

export function isControlElement(el: Element): boolean {
  const name = el.localName;
  if (name === 'button' || name === 'a') return true;
  if (el.getAttribute('role') === 'button') return true;
  if (name === 'input') {
    const type = (el.getAttribute('type') ?? '').toLowerCase();
    return type === 'button' || type === 'submit';
  }
  return false;
}

/**
 * The visible label of a control. For <input> buttons only aria-label is read,
 * never the value attribute (FR-PRV-02). Returns null for labels too long to be
 * a button label.
 */
export function controlLabel(el: Element): string | null {
  const aria = el.getAttribute('aria-label');
  if (aria) return normalizeInline(aria).slice(0, 80) || null;
  if (el.localName === 'input') return null;
  const text = normalizeInline(el.textContent ?? '');
  if (!text || text.length > 80) return null;
  return text;
}

export function toCookieControl(el: Element): CookieControl | null {
  const label = controlLabel(el);
  if (!label) return null;
  const role = classifyControlLabel(label);
  const isRealButton = el.localName !== 'a';
  if (!role && !isRealButton) return null;
  return {
    role: role ?? 'other',
    label,
    certainty: isRealButton && role !== null && label.length <= 40 ? 'detected' : 'uncertain',
    anchor: anchorFor(el, { exact: label, prefix: '', suffix: '' }),
  };
}
