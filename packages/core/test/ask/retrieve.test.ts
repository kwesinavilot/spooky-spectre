import { describe, expect, it } from 'vitest';
import { retrieveForTurn, retrieveSections } from '../../src';

const parts = [
  ['s-1', 'Free trial', 'Your free trial lasts 14 days.'],
  ['s-2', 'Renewal', 'After the trial your subscription renews monthly until you cancel.'],
  ['s-3', 'Disputes', 'Disputes are settled by arbitration.'],
] as const;

const text = parts.map(([, h, t]) => `${h}\n${t}`).join('\n');
let offset = 0;
const sections = parts.map(([id, h, t]) => {
  const start = offset;
  offset += h.length + 1 + t.length + 1;
  return { id, heading: h, startOffset: start, endOffset: start + h.length + 1 + t.length };
});
const doc = { text, sections } as unknown as Parameters<typeof retrieveSections>[0];

describe('retrieval for a conversation turn', () => {
  it('uses the question alone when it matches', () => {
    expect(retrieveForTurn(doc, 'Is there arbitration?', []).map((s) => s.id)).toEqual(['s-3']);
  });

  it('borrows the previous question for a short follow-up', () => {
    const prior = [{ question: 'How long is the trial?', citations: ['s-1'] }];
    expect(retrieveForTurn(doc, 'And then what?', prior).map((s) => s.id)).toContain('s-1');
  });

  it('falls back to the sections the previous answer cited', () => {
    const prior = [{ question: 'Hi', citations: ['s-2'] }];
    expect(retrieveForTurn(doc, 'Why?', prior).map((s) => s.id)).toEqual(['s-2']);
  });

  it('returns nothing on a first question with no matching words', () => {
    expect(retrieveForTurn(doc, 'Hello?', [])).toEqual([]);
  });
});
