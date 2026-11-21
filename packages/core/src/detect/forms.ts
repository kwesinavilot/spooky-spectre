import type { ActionControl } from '../schema';
import { anchorFor } from '../dom/anchors';
import { visibleText } from '../dom/text';
import { controlLabel } from './controls';
import { toPolicyLink } from './links';

/**
 * Sign-up checkbox next to a terms or privacy link (FR-DET-05). Only the links'
 * text and href are read; the checkbox state is never read.
 */
export function hasConsentCheckbox(elements: Element[], pageUrl: string): boolean {
  for (const el of elements) {
    if (el.localName !== 'input' || (el.getAttribute('type') ?? '').toLowerCase() !== 'checkbox') {
      continue;
    }
    const root = el.getRootNode() as Document | ShadowRoot;
    const id = el.getAttribute('id');
    const label =
      el.closest('label') ??
      (id && /^[\w-]+$/.test(id) ? root.querySelector(`label[for="${id}"]`) : null) ??
      el.parentElement;
    if (!label) continue;
    const links = Array.from(label.querySelectorAll('a[href]'));
    if (
      links.some((a) => {
        const link = toPolicyLink(a, pageUrl);
        return link !== null && (link.kind === 'terms' || link.kind === 'privacy');
      })
    ) {
      return true;
    }
  }
  return false;
}

const BILLING_PATTERNS = [
  /\bfree trial\b|\btrial\b/i,
  /\bauto-?renew|\brenew(s|al|ed|ing)?\b/i,
  /\brecurring\b|\bbilled\b|\bmonthly\b|\bannually\b/i,
  /\bper (month|year|week)\b|\/\s?(mo|month|yr|year)\b/i,
  /\bsubscription\b|\bsubscribe\b/i,
  /\bcancel/i,
];

const SIGNUP_BUTTON =
  /\b(start|subscribe|sign up|join|buy|pay|checkout|check out|continue|try|register|order|place order)\b/i;

/** Submit controls of sign-up and payment forms (FR-DET-14). Labels only; never values. */
export function findActionControls(elements: Element[]): ActionControl[] {
  const out: ActionControl[] = [];
  for (const form of elements) {
    if (form.localName !== 'form') continue;
    const submit = form.querySelector('button:not([type]), button[type="submit"], input[type="submit"]');
    if (!submit) continue;
    const label = controlLabel(submit);
    if (!label) continue;
    out.push({
      kind: 'submit',
      label,
      anchor: anchorFor(submit, { exact: label, prefix: '', suffix: '' }),
    });
  }
  return out.slice(0, 5);
}

/**
 * Payment or sign-up form with renewal, trial, billing or cancellation wording
 * near the submit control (FR-DET-06). Reads only attribute names/types and
 * visible text outside form controls and labels; never field values.
 */
export function hasSubscriptionTerms(elements: Element[]): boolean {
  for (const form of elements) {
    if (form.localName !== 'form') continue;
    const submit = form.querySelector(
      'button:not([type]), button[type="submit"], input[type="submit"]',
    );
    if (!submit) continue;
    const signupish =
      form.querySelector(
        'input[type="email"], input[type="password"], [autocomplete^="cc-"], [autocomplete*=" cc-"]',
      ) !== null || SIGNUP_BUTTON.test(submit.textContent ?? '');
    if (!signupish) continue;
    const next = form.nextElementSibling;
    const text = `${visibleText(form, 4000, { skipLabels: true })} ${
      next ? visibleText(next, 1000) : ''
    }`;
    const hits = BILLING_PATTERNS.filter((p) => p.test(text)).length;
    if (hits >= 2) return true;
  }
  return false;
}
