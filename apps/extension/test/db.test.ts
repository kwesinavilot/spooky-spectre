import { describe, it, expect } from 'vitest';
import { db } from '@/db/database';
import type { AgreementRecord } from '@specter/core';

const record: AgreementRecord = {
  id: 'a1',
  domain: 'example.com',
  sourceUrl: 'https://example.com/tos',
  title: 'Terms',
  capturedAt: '2024-01-01T00:00:00.000Z',
  documentHash: 'abc123',
  extractedText: 'We may renew your subscription.',
  completeness: 0.95,
  findings: [],
};

describe('Dexie round-trip (TEST-DB-01)', () => {
  it('writes and reads back a structurally equal record', async () => {
    await db.agreements.put(record);
    const got = await db.agreements.get('a1');
    expect(got).toEqual(record);
    await db.agreements.delete('a1');
  });
});
