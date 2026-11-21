import { describe, expect, it } from 'vitest';
import { CookieControl, DetectionResult, ExtractedDocument, Section } from '../src/schema';

const anchor = { cssPath: 'main > p', quote: { exact: 'x', prefix: '', suffix: '' } };

describe('Spec 2 schemas (task 1.2)', () => {
  it('accepts a valid detection result', () => {
    const r = DetectionResult.safeParse({
      url: 'https://streamly.example/signup',
      kinds: ['consent_checkbox'],
      signals: [],
      cookieControls: [],
      noRejectControlFound: false,
      actionControls: [],
      links: [{ kind: 'terms', text: 'Terms', url: 'https://streamly.example/terms', isPdf: false }],
      unreadable: [],
      isPdf: false,
      confidence: 0.8,
      detectedAt: '2026-10-31T00:00:00.000Z',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a control label longer than 80 characters', () => {
    const r = CookieControl.safeParse({
      role: 'accept_all',
      label: 'a'.repeat(81),
      certainty: 'detected',
      anchor,
    });
    expect(r.success).toBe(false);
  });

  it('rejects a section whose offsets are out of order', () => {
    const r = Section.safeParse({
      id: 's-1',
      heading: '1. Terms',
      level: 2,
      startOffset: 10,
      endOffset: 2,
      anchor,
    });
    expect(r.success).toBe(false);
  });

  it('rejects completeness above 1', () => {
    const r = ExtractedDocument.safeParse({
      url: 'https://streamly.example/terms',
      title: 'Terms',
      kind: 'terms_of_service',
      source: 'page',
      text: 'Terms',
      sections: [],
      documentHash: 'abc',
      completeness: 1.2,
      completenessReasons: [],
      extractedAt: '2026-10-31T00:00:00.000Z',
    });
    expect(r.success).toBe(false);
  });
});
