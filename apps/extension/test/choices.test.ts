import { describe, expect, it } from 'vitest';
import type { DetectionResult } from '@specter/core';
import { defaultChoice, documentChoices } from '../src/choices';
import { coverageLabel } from '../src/labels';

const base: DetectionResult = {
  url: 'https://streamly.example/signup',
  kinds: [],
  signals: [],
  cookieControls: [],
  noRejectControlFound: false,
  actionControls: [],
  links: [],
  unreadable: [],
  isPdf: false,
  confidence: 0.8,
  detectedAt: '2026-11-21T00:00:00.000Z',
};
const terms = { kind: 'terms' as const, text: 'Terms of Service', url: 'https://streamly.example/terms', isPdf: false };
const privacy = { kind: 'privacy' as const, text: 'Privacy Policy', url: 'https://streamly.example/privacy', isPdf: false };

describe('document choices (task 6.1)', () => {
  it('on a sign-up page, defaults to the single linked terms', () => {
    const r = { ...base, kinds: ['consent_checkbox' as const], links: [terms, privacy] };
    const c = documentChoices(r);
    expect(c.map((x) => x.id)).toEqual(['link:https://streamly.example/terms', 'link:https://streamly.example/privacy']);
    expect(defaultChoice(r, c)).toBe('link:https://streamly.example/terms');
  });

  it('on a terms page, defaults to the page and skips a link back to itself', () => {
    const r = {
      ...base,
      url: 'https://streamly.example/terms',
      kinds: ['terms_of_service' as const],
      links: [terms, privacy],
    };
    const c = documentChoices(r);
    expect(c.map((x) => x.id)).toEqual(['page', 'link:https://streamly.example/privacy']);
    expect(defaultChoice(r, c)).toBe('page');
  });

  it('with a banner and two policies and no clear primary, selects nothing', () => {
    const r = { ...base, url: 'https://gazette.example/', kinds: ['cookie_banner' as const], links: [terms, privacy] };
    const c = documentChoices(r);
    expect(c[0]?.id).toBe('banner');
    expect(defaultChoice(r, c)).toBeNull();
  });

  it('with only a banner, selects it', () => {
    const r = { ...base, kinds: ['cookie_banner' as const] };
    expect(defaultChoice(r, documentChoices(r))).toBe('banner');
  });
});

describe('coverage label (FR-CMP-04)', () => {
  it('says complete only at 1', () => {
    expect(coverageLabel(1)).toEqual({ text: 'Coverage: complete', complete: true });
    expect(coverageLabel(0.999).complete).toBe(false);
    expect(coverageLabel(0.82).text).toBe('Partial coverage: 82% read');
  });
});
