import { describe, expect, it } from 'vitest';
import {
  countersForDay,
  dayKey,
  decideEffect,
  emptyCounters,
  meetsTrigger,
  siteKey,
  type FindingForPossession,
  type PossessionCounters,
} from '../src/possession';

const high: FindingForPossession = { id: 'f1', concern: 'high', verified: true, confidence: 0.9 };
const SITE = 'https://streamly.example';
const none = new Set<string>();
const day = '2026-10-31';

const fresh = (): PossessionCounters => emptyCounters(day);

describe('trigger conditions', () => {
  it('fires for a verified high finding at 0.85 confidence with a moment of agreement', () => {
    expect(meetsTrigger(high, 'pointer')).toBe(true);
    expect(meetsTrigger(high, 'focus')).toBe(true);
    expect(meetsTrigger(high, 'show')).toBe(true);
  });

  it('needs a moment of agreement', () => {
    expect(meetsTrigger(high, null)).toBe(false);
  });

  it('needs High impact', () => {
    expect(meetsTrigger({ ...high, concern: 'medium' }, 'show')).toBe(false);
    expect(meetsTrigger({ ...high, concern: 'low' }, 'show')).toBe(false);
  });

  it('needs verified evidence', () => {
    expect(meetsTrigger({ ...high, verified: false }, 'show')).toBe(false);
  });

  it('needs confidence of 0.85 or more', () => {
    expect(meetsTrigger({ ...high, confidence: 0.85 }, 'show')).toBe(true);
    expect(meetsTrigger({ ...high, confidence: 0.84 }, 'show')).toBe(false);
  });
});

describe('decideEffect', () => {
  it('returns none when the trigger is not met, and changes no counters', () => {
    const c = fresh();
    const out = decideEffect({ ...high, concern: 'low' }, 'show', { site: SITE, counters: c, shownThisLoad: none });
    expect(out.decision).toBe('none');
    expect(out.counters).toBe(c);
  });

  it('possesses once, and counts the site and the day', () => {
    const out = decideEffect(high, 'show', { site: SITE, counters: fresh(), shownThisLoad: none });
    expect(out.decision).toBe('possession');
    expect(out.counters.total).toBe(1);
    expect(out.counters.sites[SITE]).toBe(1);
  });

  it('is capped once per finding per page load', () => {
    const out = decideEffect(high, 'show', { site: SITE, counters: fresh(), shownThisLoad: new Set(['f1']) });
    expect(out.decision).toBe('capped');
  });

  it('is capped once per site per day', () => {
    const counters = { day, total: 1, sites: { [SITE]: 1 } };
    const out = decideEffect({ ...high, id: 'f2' }, 'pointer', { site: SITE, counters, shownThisLoad: none });
    expect(out.decision).toBe('capped');
  });

  it('allows a different site on the same day', () => {
    const counters = { day, total: 1, sites: { [SITE]: 1 } };
    const out = decideEffect({ ...high, id: 'f2' }, 'pointer', {
      site: 'https://other.example',
      counters,
      shownThisLoad: none,
    });
    expect(out.decision).toBe('possession');
    expect(out.counters.total).toBe(2);
  });

  it('is capped at three possessions a day across all sites', () => {
    const counters = { day, total: 3, sites: { a: 1, b: 1, c: 1 } };
    const out = decideEffect({ ...high, id: 'f9' }, 'show', {
      site: 'https://new.example',
      counters,
      shownThisLoad: none,
    });
    expect(out.decision).toBe('capped');
  });

  it('allows the third possession and stops at three', () => {
    let counters = fresh();
    const sites = ['https://a.example', 'https://b.example', 'https://c.example', 'https://d.example'];
    const decisions = sites.map((site, i) => {
      const r = decideEffect({ ...high, id: `f${i}` }, 'show', { site, counters, shownThisLoad: none });
      counters = r.counters;
      return r.decision;
    });
    expect(decisions).toEqual(['possession', 'possession', 'possession', 'capped']);
    expect(counters.total).toBe(3);
  });
});

describe('daily reset', () => {
  it('keeps counters for the same day', () => {
    const now = new Date(2026, 9, 31, 14, 0);
    const stored = { day: '2026-10-31', total: 2, sites: { a: 1 } };
    expect(countersForDay(stored, now)).toEqual({ day: '2026-10-31', total: 2, sites: { a: 1 } });
  });

  it('starts from zero on a new local day', () => {
    const now = new Date(2026, 10, 1, 0, 5);
    const stored = { day: '2026-10-31', total: 3, sites: { a: 1 } };
    expect(countersForDay(stored, now)).toEqual({ day: '2026-11-01', total: 0, sites: {} });
  });

  it('treats missing or broken storage as an empty day', () => {
    const now = new Date(2026, 9, 31, 9, 0);
    expect(countersForDay(undefined, now)).toEqual(emptyCounters('2026-10-31'));
    expect(countersForDay({ day: '2026-10-31', total: 'x' }, now)).toEqual(emptyCounters('2026-10-31'));
  });

  it('formats the local day with a zero-padded month and day', () => {
    expect(dayKey(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });
});

describe('siteKey', () => {
  it('uses the origin only, never the path or query', () => {
    expect(siteKey('https://streamly.example/signup?plan=1#x')).toBe('https://streamly.example');
  });

  it('returns an empty key for a URL it cannot parse', () => {
    expect(siteKey('not a url')).toBe('');
  });
});
