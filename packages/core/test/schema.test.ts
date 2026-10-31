import { describe, it, expect } from 'vitest';
import { ClauseFinding, AgreementRecord, Evidence } from '../src/schema';

const validEvidence = {
  sectionId: 's1',
  exactQuote: 'we may renew',
  startOffset: 0,
  endOffset: 12,
};

const validFinding = {
  id: 'f1',
  category: 'billing',
  summary: 'Renews automatically',
  implication: 'You may be charged again',
  evidence: validEvidence,
  concern: 'low',
  confidence: 0.5,
  conditions: [],
  notStated: [],
  suggestedQuestions: [],
  effect: 'whisper',
  verified: true,
} as const;

describe('ClauseFinding (TEST-SCHEMA-01)', () => {
  it('parses a valid finding', () => {
    expect(ClauseFinding.safeParse(validFinding).success).toBe(true);
  });

  it('rejects confidence out of range', () => {
    const r = ClauseFinding.safeParse({ ...validFinding, confidence: 1.5 });
    expect(r.success).toBe(false);
  });
});

describe('Evidence (TEST-SCHEMA-03)', () => {
  it('rejects startOffset greater than endOffset', () => {
    const r = Evidence.safeParse({ ...validEvidence, startOffset: 20, endOffset: 5 });
    expect(r.success).toBe(false);
  });
});

describe('AgreementRecord consent (TEST-SCHEMA-02)', () => {
  const base = {
    id: 'a1',
    domain: 'example.com',
    sourceUrl: 'https://example.com/tos',
    title: 'Terms',
    capturedAt: '2024-01-01T00:00:00.000Z',
    documentHash: 'abc123',
    extractedText: 'body',
    completeness: 0.9,
    findings: [],
  } as const;

  it('parses with a valid consent record', () => {
    const r = AgreementRecord.safeParse({
      ...base,
      consent: {
        action: 'accepted',
        observedAt: '2024-01-01T00:00:00.000Z',
        evidenceType: 'observed_click',
      },
    });
    expect(r.success).toBe(true);
  });

  it('rejects an invalid evidenceType', () => {
    const r = AgreementRecord.safeParse({
      ...base,
      consent: {
        action: 'accepted',
        observedAt: '2024-01-01T00:00:00.000Z',
        evidenceType: 'guessed',
      },
    });
    expect(r.success).toBe(false);
  });
});
