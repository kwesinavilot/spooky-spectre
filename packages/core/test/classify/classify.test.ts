import { describe, expect, it } from 'vitest';
import { findCandidates, splitClauses, MAX_CANDIDATES, type Candidate } from '../../src/classify';
import type { ExtractedDocument, Section } from '../../src/schema';

/** Builds a document from section bodies, with offsets as the extractor would set them. */
function docFrom(bodies: string[]): Pick<ExtractedDocument, 'text' | 'sections'> {
  let text = '';
  const sections: Section[] = bodies.map((body, i) => {
    const startOffset = text.length;
    text += body;
    return {
      id: `s${i}`,
      heading: `Heading ${i}`,
      level: 2,
      startOffset,
      endOffset: text.length,
      anchor: { cssPath: 'section', quote: { exact: '', prefix: '', suffix: '' } },
    };
  });
  return { text, sections };
}

const categoriesOf = (cs: Candidate[]) => cs.map((c) => c.category);

describe('R1 clause split', () => {
  it('keeps offsets that point back at the clause text', () => {
    const text = 'First clause. Second clause! Third clause?';
    const clauses = splitClauses(text);
    expect(clauses.map((c) => c.text)).toEqual(['First clause.', 'Second clause!', 'Third clause?']);
    for (const c of clauses) expect(text.slice(c.start, c.end)).toBe(c.text);
  });

  it('trims space and drops empty spans', () => {
    const text = '  A cancels.  \n\n   \n B renews.   ';
    const clauses = splitClauses(text);
    expect(clauses.map((c) => c.text)).toEqual(['A cancels.', 'B renews.']);
    for (const c of clauses) expect(text.slice(c.start, c.end)).toBe(c.text);
  });

  it('splits at a line break even without punctuation', () => {
    expect(splitClauses('Item one\nItem two').map((c) => c.text)).toEqual(['Item one', 'Item two']);
  });

  it('known limit: splits after an abbreviation, which only adds a candidate', () => {
    expect(splitClauses('Plans renew, e.g. monthly.').map((c) => c.text)).toEqual(['Plans renew, e.', 'g.', 'monthly.']);
  });
});

describe('R2 categories', () => {
  it('matches word stems, so renew matches renewal', () => {
    const cs = findCandidates(docFrom(['Your renewal is automatic.']));
    expect(categoriesOf(cs)).toContain('billing');
  });

  it('nominates a clause once per category it matches', () => {
    const cs = findCandidates(docFrom(['Your subscription renews, and you may cancel at any time.']));
    expect(categoriesOf(cs).sort()).toEqual(['billing', 'cancellation']);
  });

  it('records the matched keywords in lower case, once each', () => {
    const [c] = findCandidates(docFrom(['We Renew. We renew again.'])).filter((x) => x.category === 'billing');
    expect(c!.keywords).toEqual(['renew']);
  });

  it('covers the wording found in the corpus that the first table missed', () => {
    const cases: [string, string][] = [
      ['The agreement is governed by the laws of California.', 'disputes'],
      ['Disputes are heard under the choice of law provisions.', 'disputes'],
      ['We will not be liable for any indirect loss.', 'liability'],
      ['We will delete your content after you leave.', 'account_control'],
      ['You waive any right of withdrawal for digital content.', 'cancellation'],
      ['We may disclose your data to partners.', 'privacy'],
      ['You consent to receive communications.', 'privacy'],
      ['We may automatically update the service.', 'account_control'],
    ];
    for (const [sentence, category] of cases) {
      expect(categoriesOf(findCandidates(docFrom([sentence])))).toContain(category);
    }
  });
});

describe('R3 negation', () => {
  it('flags a negated clause and still nominates it', () => {
    const cs = findCandidates(docFrom(['We do not automatically renew your subscription.']));
    const billing = cs.find((c) => c.category === 'billing');
    expect(billing).toBeDefined();
    expect(billing!.negated).toBe(true);
  });

  it('does not flag a clause without a negation word', () => {
    const cs = findCandidates(docFrom(['Your subscription renews every month.']));
    expect(cs.every((c) => c.negated === false)).toBe(true);
  });
});

describe('R4 cap and order', () => {
  it('returns at most the limit', () => {
    const bodies = Array.from({ length: 30 }, (_, i) => `Clause ${i} renews.`);
    expect(findCandidates(docFrom(bodies), 5)).toHaveLength(5);
    expect(MAX_CANDIDATES).toBe(40);
  });

  it('keeps the strongest clauses, even when they come late in the document', () => {
    const weak = Array.from({ length: 10 }, (_, i) => `Plan ${i} renews.`);
    const strong = 'Renewal fees, charges and billing renew on each subscription payment.';
    const cs = findCandidates(docFrom([...weak, strong]), 1);
    expect(cs).toHaveLength(1);
    expect(cs[0]!.text).toBe(strong);
  });

  it('returns the kept candidates in document order', () => {
    const cs = findCandidates(docFrom(['First renews. Second renews. Third renews.']), 2);
    expect(cs.map((c) => c.text)).toEqual(['First renews.', 'Second renews.']);
    const starts = cs.map((c) => c.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});

describe('R5 candidate record', () => {
  it('carries section, offsets, category and an id built from them', () => {
    const doc = docFrom(['Intro text.', 'Your plan renews monthly.']);
    const [c] = findCandidates(doc);
    expect(c).toBeDefined();
    expect(c!.sectionId).toBe('s1');
    expect(c!.sectionHeading).toBe('Heading 1');
    expect(doc.text.slice(c!.start, c!.end)).toBe(c!.text);
    expect(c!.id).toBe(`s1:${c!.start}:${c!.category}`);
  });
});

describe('R6 determinism', () => {
  it('gives the same candidates for the same document', () => {
    const doc = docFrom(['Renew monthly. Cancel any time.', 'We may share data with partners. Liability is limited.']);
    expect(findCandidates(doc)).toEqual(findCandidates(doc));
  });
});
