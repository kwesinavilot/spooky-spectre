import { describe, expect, it } from 'vitest';
import { findCandidates, locateQuote, type ExtractedDocument } from '@specter/core';
import {
  analyzeDocument,
  analysisCacheKey,
  estimateCost,
  parseModelReply,
  providerFor,
  PROMPT_VERSION,
  UNKNOWN_PRICE,
  type ChatProvider,
} from '../src';

const TEXT = [
  '4.2 Subscription and renewal',
  'After the trial ends, your subscription renews automatically at $14.99 per month until you cancel. We do not automatically renew free trials.',
  '7 Disputes',
  'Disputes are resolved by binding arbitration.',
].join('\n');

function doc(): ExtractedDocument {
  const h1 = '4.2 Subscription and renewal';
  const s1End = TEXT.indexOf('\n7 Disputes');
  const s2Start = s1End + 1;
  return {
    url: 'https://streamly.example/terms',
    title: 'Streamly Terms',
    kind: 'terms_of_service',
    source: 'page',
    text: TEXT,
    sections: [
      { id: 's-4-2', heading: h1, level: 3, startOffset: 0, endOffset: s1End, anchor: { cssPath: 'h3', quote: { exact: h1, prefix: '', suffix: '' } } },
      { id: 's-7', heading: '7 Disputes', level: 3, startOffset: s2Start, endOffset: TEXT.length, anchor: { cssPath: 'h3', quote: { exact: '7 Disputes', prefix: '', suffix: '' } } },
    ],
    documentHash: 'hash-1',
    completeness: 1,
    completenessReasons: [],
    extractedAt: '2026-11-21T00:00:00.000Z',
  };
}

/** A provider that returns scripted replies, one per call, and records what it was asked. */
function scripted(replies: string[]): ChatProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    id: 'openai',
    calls,
    async complete({ user }) {
      calls.push(user);
      const next = replies.shift();
      if (next === undefined) throw new Error('no reply scripted');
      return next;
    },
  };
}

const goodDraft = {
  category: 'billing',
  summary: 'Renews at $14.99 per month.',
  implication: 'Charges repeat each month until cancelled.',
  evidence: { sectionId: 's-4-2', exactQuote: 'renews automatically at $14.99 per month' },
  concern: 'high',
  confidence: 0.9,
  conditions: [],
  notStated: ['When the trial starts.'],
  suggestedQuestions: [],
};

describe('model reply parsing', () => {
  it('accepts a reply wrapped in a code fence', () => {
    const raw = '```json\n' + JSON.stringify({ findings: [goodDraft] }) + '\n```';
    expect(parseModelReply(raw)?.findings).toHaveLength(1);
  });

  it('rejects text that is not the schema', () => {
    expect(parseModelReply('Sure! Here are the findings.')).toBeNull();
    expect(parseModelReply(JSON.stringify({ findings: [{ ...goodDraft, confidence: 1.5 }] }))).toBeNull();
  });
});

describe('analyzeDocument (Spec 5)', () => {
  it('accepts a verified finding and locates its quote itself', async () => {
    const d = doc();
    const out = await analyzeDocument({
      provider: scripted([JSON.stringify({ findings: [goodDraft] })]),
      model: 'm',
      doc: d,
      candidates: findCandidates(d),
    });
    expect(out.status).toBe('ok');
    expect(out.findings).toHaveLength(1);
    const f = out.findings[0]!;
    expect(f.verified).toBe(true);
    expect(f.effect).toBe('possession');
    expect(d.text.slice(f.evidence.startOffset, f.evidence.endOffset)).toBe(f.evidence.exactQuote);
  });

  it('rejects a fabricated quote, asks once for a correction, and counts what stays rejected', async () => {
    const d = doc();
    const fabricated = { ...goodDraft, evidence: { sectionId: 's-4-2', exactQuote: 'Refunds are available within 30 days.' } };
    const provider = scripted([
      JSON.stringify({ findings: [fabricated] }),
      JSON.stringify({ findings: [{ ...fabricated, summary: 'Refunds exist.' }] }),
    ]);
    const out = await analyzeDocument({ provider, model: 'm', doc: d, candidates: findCandidates(d) });
    expect(out.findings).toHaveLength(0);
    expect(out.rejected).toBe(1);
    expect(out.corrected).toBe(0);
    expect(out.reasons.join(' ')).toMatch(/not in that section/);
    expect(provider.calls).toHaveLength(2);
    expect(provider.calls[1]).toMatch(/could not be verified/);
  });

  it('counts a draft as corrected when the retry gives a verifiable quote', async () => {
    const d = doc();
    const fabricated = { ...goodDraft, evidence: { sectionId: 's-4-2', exactQuote: 'renews automatically at $19.99 per month' } };
    const provider = scripted([
      JSON.stringify({ findings: [fabricated] }),
      JSON.stringify({ findings: [goodDraft] }),
    ]);
    const out = await analyzeDocument({ provider, model: 'm', doc: d, candidates: findCandidates(d) });
    expect(out.findings).toHaveLength(1);
    expect(out.corrected).toBe(1);
    expect(out.rejected).toBe(0);
  });

  it('never shows a summary amount that the quote does not contain', async () => {
    const d = doc();
    const wrongAmount = { ...goodDraft, summary: 'Renews at $19.99 per month.' };
    const out = await analyzeDocument({
      provider: scripted([JSON.stringify({ findings: [wrongAmount] }), JSON.stringify({ findings: [] })]),
      model: 'm',
      doc: d,
      candidates: findCandidates(d),
    });
    expect(out.findings).toHaveLength(0);
    expect(out.rejected).toBe(1);
  });

  it('retries once for invalid JSON, then reports invalid output', async () => {
    const d = doc();
    const out = await analyzeDocument({
      provider: scripted(['not json', 'still not json']),
      model: 'm',
      doc: d,
      candidates: findCandidates(d),
    });
    expect(out.status).toBe('invalid_output');
  });

  it('skips the model entirely when nothing was nominated', async () => {
    const d = { ...doc(), text: 'Thank you for visiting.', sections: [] };
    const provider = scripted([]);
    const out = await analyzeDocument({ provider, model: 'm', doc: d, candidates: [] });
    expect(out.status).toBe('no_candidates');
    expect(provider.calls).toHaveLength(0);
  });

  it('sends only candidate sections and their neighbours, never the whole browsing context', async () => {
    const d = doc();
    const provider = scripted([JSON.stringify({ findings: [] })]);
    await analyzeDocument({ provider, model: 'm', doc: d, candidates: findCandidates(d) });
    expect(provider.calls[0]).toContain('[s-4-2]');
    expect(provider.calls[0]).toContain('renews automatically');
    // The prompt is built from the document, never from anything else on the browser.
    expect(provider.calls[0]).not.toContain('localStorage');
  });
});

describe('locateQuote sanity', () => {
  it('is exact, including the dollar sign', () => {
    const d = doc();
    expect(locateQuote(d, 's-4-2', 'renews automatically at $14.99')).not.toBeNull();
    expect(locateQuote(d, 's-4-2', 'renews automatically at 14.99')).toBeNull();
  });
});

describe('providers (Spec 4)', () => {
  it('sends the key in a header, never in the URL, and reads the reply', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      seen = { url: String(url), init: init ?? {} };
      return new Response(
        JSON.stringify({
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          model: 'claude-x',
          content: [{ type: 'text', text: '{"findings":[]}' }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as unknown as typeof fetch;
    const reply = await providerFor('anthropic', fetchImpl).complete({ model: 'claude-x', system: 's', user: 'u', apiKey: 'sk-secret' });
    expect(reply).toBe('{"findings":[]}');
    expect(seen!.url).not.toContain('sk-secret');
    expect(new Headers(seen!.init.headers).get('x-api-key')).toBe('sk-secret');
  });

  it('maps 401 to invalid_key and 429 to rate_limited', async () => {
    const make = (status: number) => (async () => new Response('{}', { status })) as unknown as typeof fetch;
    await expect(providerFor('openai', make(401)).complete({ model: 'm', system: 's', user: 'u', apiKey: 'k' })).rejects.toMatchObject({ code: 'invalid_key' });
    await expect(providerFor('openai', make(429)).complete({ model: 'm', system: 's', user: 'u', apiKey: 'k' })).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('reports a local Ollama that is not running as not_running', async () => {
    const down = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    await expect(providerFor('ollama', down).complete({ model: 'llama', system: 's', user: 'u' })).rejects.toMatchObject({ code: 'not_running' });
  });
});

describe('cost and cache', () => {
  it('says the price is not set rather than inventing one', () => {
    const e = estimateCost('x'.repeat(4000), UNKNOWN_PRICE);
    expect(e.cost).toBeNull();
    expect(e.label).toMatch(/Price not set/);
    expect(e.inputTokens).toBe(1000);
  });

  it('computes cost from configured prices', () => {
    const e = estimateCost('x'.repeat(4000), { inputPerMillion: 3, outputPerMillion: 15 }, 0);
    expect(e.cost).toBeCloseTo(0.003, 6);
  });

  it('keys the cache by document, model and prompt version', () => {
    expect(analysisCacheKey('h', 'm', PROMPT_VERSION)).not.toBe(analysisCacheKey('h', 'm', 'analysis-v2'));
    expect(analysisCacheKey('h', 'a', PROMPT_VERSION)).not.toBe(analysisCacheKey('h', 'b', PROMPT_VERSION));
  });
});
