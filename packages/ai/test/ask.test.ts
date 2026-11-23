import { describe, expect, it } from 'vitest';
import type { RetrievedSection } from '@specter/core';
import { askDocument, buildAskPrompt, parseAskReply, type AskTurn, type ChatProvider } from '../src';

const SECTIONS: RetrievedSection[] = [
  { id: 's-4-2', heading: '4.2 Subscription and renewal', text: 'Your subscription renews automatically each month.' },
  { id: 's-7', heading: '7 Disputes', text: 'Disputes are resolved by binding arbitration.' },
];

const fake = (reply: string): ChatProvider => ({ id: 'openai', complete: async () => reply });

const ask = (reply: string, question = 'Does it renew?') =>
  askDocument({ provider: fake(reply), model: 'm', question, sections: SECTIONS });

describe('Ask Specter replies', () => {
  it('parses JSON, with or without a code fence, and fills the optional fields', () => {
    const json = '{"answer":"Yes.","citations":["s-4-2"],"notStated":false}';
    expect(parseAskReply(json)).toEqual({
      answer: 'Yes.',
      general: null,
      citations: ['s-4-2'],
      notStated: false,
      followUps: [],
    });
    expect(parseAskReply('```json\n' + json + '\n```')?.citations).toEqual(['s-4-2']);
    expect(parseAskReply('not json')).toBeNull();
  });

  it('keeps only citations to sections that were sent', async () => {
    const out = await ask('{"answer":"It renews every month.","citations":["s-4-2","s-99"],"notStated":false}');
    expect(out).toMatchObject({ status: 'answered', answer: 'It renews every month.', citations: ['s-4-2'] });
  });

  it('turns an uncited claim into "The terms do not say." but keeps general background', async () => {
    const out = await ask(
      '{"answer":"It renews yearly.","general":"Auto-renewal usually means you are charged until you cancel.","citations":["s-99"],"notStated":false}',
    );
    expect(out).toEqual({
      status: 'answered',
      answer: 'The terms do not say.',
      general: 'Auto-renewal usually means you are charged until you cancel.',
      citations: [],
      notStated: true,
      followUps: [],
    });
  });

  it('returns a general explanation alongside a cited answer', async () => {
    const out = await ask(
      '{"answer":"Disputes go to arbitration, not court.","general":"Arbitration is a private process where a neutral person decides.","citations":["s-7"],"notStated":false}',
      'What happens in a dispute?',
    );
    expect(out).toMatchObject({ citations: ['s-7'], general: 'Arbitration is a private process where a neutral person decides.' });
  });

  it('keeps up to three distinct follow-ups and drops the question just asked', async () => {
    const out = await ask(
      '{"answer":"Yes.","citations":["s-4-2"],"notStated":false,"followUps":["Does it renew?","How do I cancel?","how do i cancel?","Is there a refund?","Can the price change?"]}',
    );
    expect(out.status === 'answered' && out.followUps).toEqual([
      'How do I cancel?',
      'Is there a refund?',
      'Can the price change?',
    ]);
  });

  it('reports invalid output instead of showing it', async () => {
    expect((await ask('sure, it renews')).status).toBe('invalid_output');
  });

  it('puts the sections, recent turns and the question in the prompt', () => {
    const history: AskTurn[] = Array.from({ length: 6 }, (_, i) => ({ question: `Q${i}`, answer: `A${i}` }));
    const prompt = buildAskPrompt('And if I cancel early?', SECTIONS, history);
    expect(prompt).toContain('[s-4-2]');
    expect(prompt).toContain('[s-7]');
    expect(prompt).toContain('Question: And if I cancel early?');
    // Only the last four turns are sent.
    expect(prompt).not.toContain('Person: Q1');
    expect(prompt).toContain('Person: Q2');
    expect(prompt).toContain('Specter: A5');
  });

  it('says so in the prompt when no section matched', () => {
    expect(buildAskPrompt('Hello?', [])).toContain('No section of the agreement matched');
  });
});
