// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { extractDocument, normalizeInline, type ExtractedDocument } from '../../src';
import { parse, readExample } from '../helpers';

function extract(html: string, url = 'https://streamly.example/terms'): Promise<ExtractedDocument> {
  return extractDocument(parse(html), { kind: 'terms_of_service', source: 'page', url });
}

function checkSectionInvariants(doc: ExtractedDocument) {
  let previousEnd = -1;
  for (const s of doc.sections) {
    const slice = doc.text.slice(s.startOffset, s.endOffset);
    if (s.heading) expect(slice.startsWith(s.heading)).toBe(true);
    expect(s.startOffset).toBeGreaterThan(previousEnd);
    if (previousEnd >= 0) expect(s.startOffset).toBe(previousEnd + 1);
    previousEnd = s.endOffset;
  }
  if (doc.sections.length > 0) {
    expect(doc.sections[0]!.startOffset).toBe(0);
    expect(previousEnd).toBe(doc.text.length);
  }
}

describe('Streamly terms', () => {
  it('uses the heading numbering for section ids (TEST-EXT-04)', async () => {
    const doc = await extract(readExample('streamly/terms-v1.html'));
    const ids = doc.sections.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['s-1', 's-4', 's-4-1', 's-4-2', 's-8']));
    const renewal = doc.sections.find((s) => s.id === 's-4-2')!;
    expect(doc.text.slice(renewal.startOffset, renewal.endOffset)).toContain(
      'Your subscription automatically renews at GHS 120 per month following the trial period.',
    );
    checkSectionInvariants(doc);
  });

  it('leaves out the header navigation and footer', async () => {
    const doc = await extract(readExample('streamly/terms-v1.html'));
    expect(doc.text).not.toContain('Streamly Media Ltd is fictional.');
    expect(doc.text).not.toContain('Help');
    expect(doc.completeness).toBe(1);
    expect(doc.completenessReasons).toEqual([]);
  });

  it('v1 and v2 differ only by the two privacy edits (FR-FIX-02, TEST-EXT-03)', async () => {
    const v1 = await extract(readExample('streamly/terms-v1.html'));
    const v2 = await extract(readExample('streamly/terms-v2.html'));
    expect(v1.documentHash).not.toBe(v2.documentHash);
    expect(v1.sections.map((s) => s.id)).toEqual(v2.sections.map((s) => s.id));
    const expectedV2 = v1.text
      .replace('aggregated viewing data', 'viewing data')
      .replace(
        'advertising partners to show',
        'advertising partners and affiliated companies to show',
      );
    expect(v2.text).toBe(expectedV2);
  });
});

describe('section offsets (TEST-EXT-01, property)', () => {
  const word = fc.constantFrom('renewal', 'billing', 'privacy', 'account', 'refund', 'notice', 'terms');
  const sentence = fc.array(word, { minLength: 1, maxLength: 8 }).map((w) => `${w.join(' ')}.`);
  const section = fc.record({
    level: fc.integer({ min: 1, max: 4 }),
    numbered: fc.boolean(),
    title: fc.array(word, { minLength: 1, maxLength: 3 }).map((w) => w.join(' ')),
    paragraphs: fc.array(sentence, { maxLength: 3 }),
  });

  it('every section starts with its heading and sections tile the text', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(section, { minLength: 1, maxLength: 8 }), fc.boolean(), async (secs, intro) => {
        const body = secs
          .map((s, i) => {
            const heading = s.numbered ? `${i + 1}. ${s.title}` : s.title;
            return `<h${s.level}>${heading}</h${s.level}>${s.paragraphs.map((p) => `<p>${p}</p>`).join('')}`;
          })
          .join('');
        const doc = await extract(`<main>${intro ? '<p>Intro text.</p>' : ''}${body}</main>`);
        checkSectionInvariants(doc);
        const ids = doc.sections.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: 60 },
    );
  });
});

describe('hash stability (TEST-EXT-02, property)', () => {
  const v1 = readExample('streamly/terms-v1.html');

  it('ignores wrappers, classes and whitespace', async () => {
    const original = (await extract(v1)).documentHash;
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.integer({ min: 1, max: 4 }),
        fc.constantFrom('a', 'clause', 'legal-text', 'x1'),
        async (wrap, spaces, cls) => {
          let html = v1.replace(/<p>/g, `<p class="${cls}">`);
          if (wrap) html = html.replace(/<p class=/g, '<div class="w"><p class=').replace(/<\/p>/g, '</p></div>');
          html = html.replace(/(<\/(p|h2|h3|div)>)/g, `$1${' '.repeat(spaces)}\n`);
          expect((await extract(html)).documentHash).toBe(original);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('changes when any single word changes', async () => {
    const base = await extract(v1);
    const words = ['automatically', 'GHS', 'binding', 'royalty-free', 'reasonably'];
    for (const w of words) {
      const changed = await extract(v1.replace(w, `${w}x`));
      expect(changed.documentHash).not.toBe(base.documentHash);
    }
  });
});

describe('completeness (TEST-CMP-01)', () => {
  it('scores below 1 and explains collapsed and "Read more" content', async () => {
    const html = `<main><h1>Terms</h1><p>Visible text about the service.</p>
      <details><summary>Section 2</summary><p>Hidden text inside a closed details element that was not read.</p></details>
      <button aria-expanded="false" aria-controls="more">Read more</button>
      <div id="more" hidden><p>Collapsed text that a Read more button would reveal.</p></div></main>`;
    const doc = await extract(html);
    expect(doc.completeness).toBeLessThan(1);
    const codes = doc.completenessReasons.map((r) => r.code);
    expect(codes).toContain('collapsed_section');
    expect(codes).toContain('read_more');
    expect(doc.completeness).toBeLessThanOrEqual(0.9);
    expect(doc.text).not.toContain('Hidden text inside');
    expect(doc.text).toContain('Section 2');
  });

  it('scores 1 on a fully visible page', async () => {
    const doc = await extract('<main><h1>Terms</h1><p>All of this is visible.</p></main>');
    expect(doc.completeness).toBe(1);
  });

  it('flags pagination and caps the score', async () => {
    const doc = await extract(
      '<main><h1>Terms</h1><p>Part one of the terms.</p><a rel="next" href="/terms?page=2">Next</a></main>',
    );
    expect(doc.completenessReasons.map((r) => r.code)).toContain('pagination');
    expect(doc.completeness).toBeLessThanOrEqual(0.9);
  });
});

describe('normalization (FR-EXT-03)', () => {
  it('applies NFC and collapses whitespace', () => {
    expect(normalizeInline('  Cafe\u0301\u00a0 \n terms\u200b ')).toBe('Caf\u00e9 terms');
  });

  it('joins blocks with single newlines', async () => {
    const doc = await extract('<main><h2>One</h2><p>  a   b </p><ul><li>c</li><li>d</li></ul></main>');
    expect(doc.text).toBe('One\na b\nc\nd');
  });
});

describe('extraction budget (FR-EXT-12, loose ceiling for the test DOM)', () => {
  it('extracts a 20,000-word document', async () => {
    const para = '<p>' + 'clause '.repeat(100) + '</p>';
    const html = `<main>${Array.from({ length: 20 }, (_, i) => `<h2>${i + 1}. Part</h2>${para.repeat(10)}`).join('')}</main>`;
    const t0 = performance.now();
    const doc = await extract(html);
    expect(doc.text.split(/\s+/).length).toBeGreaterThanOrEqual(20000);
    expect(performance.now() - t0).toBeLessThan(3000);
  });
});
