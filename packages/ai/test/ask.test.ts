import { describe, expect, it } from 'vitest';
import type { RetrievedSection } from '@specter/core';
import { askDocument, buildAskPrompt, parseAskReply, type ChatProvider } from '../src';

const SECTIONS: RetrievedSection[] = [
  { id: 's-4-2', heading: '4.2 Subscription and renewal', text: 'Your subscription renews automatically each month.' } as RetrievedSection,
  { id: 's-7', heading: '7 Disputes', text: 'Disputes are resolved by binding arbitration.' } as RetrievedSection,
];

const fake = (reply: string): ChatProvider => ({ id: 'openai', complete: async () => reply });

const ask = (reply: string) =>
  askDocument({ provider: fake(reply), model: 'm', question: 'Does it renew?', sections: SECTIONS });

describe('Ask Specter replies', () => {
  it('parses JSON, with or without a code fence', () => {
    const json = '{"answer":"Yes.","citations":["s-4-2"],"notStated":false}';
    expect(parseAskReply(json)?.answer).toBe('Yes.');
    expect(parseAskReply('```json\n' + json + '\n```')?.citations).toEqual(['s-4-2']);
    expect(parseAskReply('not json')).toBeNull();
  });

  it('keeps only citations to sections that were sent', async () => {
    const out = await ask('{"answer":"It renews monthly.","citations":["s-4-2","s-99"],"notStated":false}');
    expect(out).toEqual({ status: 'answered', answer: 'It renews monthly.', citations: ['s-4-2'], notStated: false });
  });

  it('turns an answer with no valid citation into "The terms do not say."', async () => {
    const out = await ask('{"answer":"It renews yearly.","citations":["s-99"],"notStated":false}');
    expect(out).toEqual({ status: 'answered', answer: 'The terms do not say.', citations: [], notStated: true });
  });

  it('reports invalid output instead of showing it', async () => {
    expect((await ask('sure, it renews')).status).toBe('invalid_output');
  });

  it('puts every section and the question in the prompt', () => {
    const prompt = buildAskPrompt('Does it renew?', SECTIONS);
    expect(prompt).toContain('[s-4-2]');
    expect(prompt).toContain('[s-7]');
    expect(prompt).toContain('Question: Does it renew?');
  });
});
