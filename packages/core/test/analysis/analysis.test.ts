import { describe, expect, it } from 'vitest';
import {
  checkFigures,
  effectFor,
  findCandidates,
  locateQuote,
  splitClauses,
  validateFinding,
  type ExtractedDocument,
} from '../../src';

/** Builds a small document by hand, so every offset in the tests is explicit. */
function makeDoc(sections: { id: string; heading: string; body: string }[]): ExtractedDocument {
  let text = '';
  const built = sections.map((s, i) => {
    if (i > 0) text += '\n';
    const block = `${s.heading}\n${s.body}`;
    const startOffset = text.length;
    text += block;
    return { id: s.id, heading: s.heading, level: 2, startOffset, endOffset: text.length, anchor: { cssPath: 'h2', quote: { exact: s.heading, prefix: '', suffix: '' } } };
  });
  return {
    url: 'https://streamly.example/terms',
    title: 'Terms',
    kind: 'terms_of_service',
    source: 'page',
    text,
    sections: built,
    documentHash: 'hash',
    completeness: 1,
    completenessReasons: [],
    extractedAt: '2026-11-21T00:00:00.000Z',
  };
}

const renewal = makeDoc([
  { id: 's-4-2', heading: '4.2 Subscription and renewal', body: 'After the trial ends, your subscription renews automatically at $14.99 per month until you cancel. We do not automatically renew free trials.' },
  { id: 's-7', heading: '7 Disputes', body: 'Disputes are resolved by binding arbitration.' },
]);

describe('splitClauses', () => {
  it('keeps offsets into the same text', () => {
    const text = 'First clause.  Second one!\nThird.';
    for (const c of splitClauses(text)) {
      expect(text.slice(c.start, c.end)).toBe(c.text);
    }
    expect(splitClauses(text).map((c) => c.text)).toEqual(['First clause.', 'Second one!', 'Third.']);
  });
});

describe('candidate nomination (Spec 3)', () => {
  it('nominates billing for the renewal clause, with offsets into the document', () => {
    const candidates = findCandidates(renewal);
    const billing = candidates.find((c) => c.category === 'billing' && c.text.startsWith('After the trial'));
    expect(billing).toBeDefined();
    expect(renewal.text.slice(billing!.start, billing!.end)).toBe(billing!.text);
    expect(billing!.sectionId).toBe('s-4-2');
    expect(billing!.keywords).toEqual(expect.arrayContaining(['renews', 'trial']));
  });

  it('still nominates a negated clause, and flags it as negated instead of dropping it', () => {
    const candidates = findCandidates(renewal);
    const negated = candidates.find((c) => c.text === 'We do not automatically renew free trials.');
    expect(negated).toBeDefined();
    expect(negated!.negated).toBe(true);
    expect(negated!.category).toBe('billing');
  });

  it('nominates each category it covers', () => {
    const cats = [...new Set(findCandidates(renewal).map((c) => c.category))];
    expect(cats).toEqual(expect.arrayContaining(['billing', 'disputes']));
  });

  it('caps the number of candidates sent to the model', () => {
    const many = makeDoc([{ id: 's-1', heading: '1 Fees', body: Array.from({ length: 60 }, () => 'Fees are charged monthly.').join(' ') }]);
    expect(findCandidates(many, 40)).toHaveLength(40);
  });
});

describe('quote location and verification (Spec 5)', () => {
  it('locates a verbatim quote inside its section', () => {
    const loc = locateQuote(renewal, 's-4-2', 'renews automatically at $14.99 per month');
    expect(loc).not.toBeNull();
    expect(renewal.text.slice(loc!.startOffset, loc!.endOffset)).toBe('renews automatically at $14.99 per month');
  });

  it('refuses a quote that is in another section', () => {
    expect(locateQuote(renewal, 's-4-2', 'Disputes are resolved by binding arbitration.')).toBeNull();
  });

  it('rejects a fabricated quote', () => {
    const loc = locateQuote(renewal, 's-4-2', 'Refunds are available within 30 days.');
    expect(loc).toBeNull();
    const result = validateFinding(
      {
        summary: 'Refunds are available.',
        implication: 'You can get money back.',
        evidence: { sectionId: 's-4-2', exactQuote: 'Refunds are available within 30 days.', startOffset: 0, endOffset: 33 },
      },
      renewal,
    );
    expect(result.verified).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('quote_not_found');
  });

  it('rejects offsets that do not match the quote', () => {
    const quote = 'renews automatically at $14.99 per month';
    const real = locateQuote(renewal, 's-4-2', quote)!;
    const result = validateFinding(
      { summary: 'Renews monthly.', implication: 'Charges continue.', evidence: { sectionId: 's-4-2', exactQuote: quote, startOffset: real.startOffset + 1, endOffset: real.endOffset + 1 } },
      renewal,
    );
    expect(result.verified).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('offsets_mismatch');
  });

  it('accepts a correct finding', () => {
    const quote = 'renews automatically at $14.99 per month';
    const loc = locateQuote(renewal, 's-4-2', quote)!;
    const result = validateFinding(
      { summary: 'Renews at $14.99 per month.', implication: 'Charges repeat monthly.', evidence: { sectionId: 's-4-2', exactQuote: quote, ...loc } },
      renewal,
    );
    expect(result.verified).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects a summary whose amount is not in the quote', () => {
    const quote = 'renews automatically at $14.99 per month';
    const loc = locateQuote(renewal, 's-4-2', quote)!;
    const issues = checkFigures({
      summary: 'Renews at $19.99 per month.',
      implication: 'Charges repeat.',
      evidence: { sectionId: 's-4-2', exactQuote: quote, ...loc },
    });
    expect(issues.map((i) => i.code)).toEqual(['amount_not_in_quote']);
  });

  it('rejects a date that is not in the quote, and accepts one that is', () => {
    const quote = 'Effective May 4, 2026, the fee is $5.';
    const bad = checkFigures({ summary: 'Starts 1 June 2026.', implication: 'x', evidence: { sectionId: 's', exactQuote: quote, startOffset: 0, endOffset: quote.length } });
    expect(bad.map((i) => i.code)).toContain('date_not_in_quote');
    const good = checkFigures({ summary: 'Effective May 4, 2026.', implication: 'x', evidence: { sectionId: 's', exactQuote: quote, startOffset: 0, endOffset: quote.length } });
    expect(good).toEqual([]);
  });
});

describe('effects (design steering 5.2, 5.3)', () => {
  it('is whisper for low concern and for anything unverified', () => {
    expect(effectFor('low', 'billing', true, 0.9)).toBe('whisper');
    expect(effectFor('high', 'billing', false, 0.99)).toBe('whisper');
  });

  it('is hand for medium financial or privacy findings, haunting for other medium findings', () => {
    expect(effectFor('medium', 'cancellation', true, 0.6)).toBe('hand');
    expect(effectFor('medium', 'privacy', true, 0.6)).toBe('hand');
    expect(effectFor('medium', 'disputes', true, 0.6)).toBe('haunting');
  });

  it('is possession only for high, verified, confidence 0.85 or more', () => {
    expect(effectFor('high', 'billing', true, 0.85)).toBe('possession');
    expect(effectFor('high', 'billing', true, 0.84)).toBe('haunting');
  });
});
