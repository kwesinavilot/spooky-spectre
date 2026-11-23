/**
 * Possession rules (Spec 6 tasks 10 and 11; design steering 5.3). Pure functions, no DOM and no storage,
 * so the caps and trigger conditions can be tested directly. The page code asks `decideEffect` at each
 * moment of agreement and stores the counters it returns.
 *
 * Possession fires only when all four hold: the finding is High impact, verified, at 0.85 confidence or
 * more, and a moment of agreement happens. Caps: once per finding per page load, once per site per day,
 * and three times per day across all sites. Past a cap the same finding is shown as haunting.
 */

import { POSSESSION_CONFIDENCE } from '@specter/core';

/** How the user came to the control: pointer near it, focus on it, or "Show on page" for the finding. */
export type Moment = 'pointer' | 'focus' | 'show';

export const POSSESSION_DAILY_TOTAL = 3;
export const POSSESSION_DAILY_PER_SITE = 1;
/** The pointer zone around a detected control, in CSS pixels (design steering 5.3). */
export const POINTER_ZONE_PX = 120;

/** Counters for one local calendar day. Reset when the day changes. */
export interface PossessionCounters {
  /** Local date, YYYY-MM-DD. */
  day: string;
  total: number;
  /** Possessions per site (origin and host only, never the full URL). */
  sites: Record<string, number>;
}

export interface FindingForPossession {
  id: string;
  concern: 'low' | 'medium' | 'high';
  verified: boolean;
  confidence: number;
}

export type Decision =
  /** Possession fires now. Store the counters that come back. */
  | 'possession'
  /** The trigger was met but a cap applies: show haunting instead. */
  | 'capped'
  /** The trigger was not met: the finding keeps its base effect. */
  | 'none';

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function emptyCounters(day: string): PossessionCounters {
  return { day, total: 0, sites: {} };
}

/**
 * Returns the stored counters for today. Anything stored for an earlier day is dropped, so the caps
 * reset at local midnight without any timer.
 */
export function countersForDay(stored: unknown, now: Date): PossessionCounters {
  const today = dayKey(now);
  const s = stored as Partial<PossessionCounters> | null | undefined;
  if (!s || s.day !== today || typeof s.total !== 'number') return emptyCounters(today);
  return { day: today, total: s.total, sites: { ...(s.sites ?? {}) } };
}

/** The trigger conditions that do not depend on the caps. */
export function meetsTrigger(f: FindingForPossession, moment: Moment | null): boolean {
  return (
    moment !== null &&
    f.concern === 'high' &&
    f.verified === true &&
    f.confidence >= POSSESSION_CONFIDENCE
  );
}

/**
 * Decides the effect for one moment of agreement.
 *
 * - `shownThisLoad` holds the finding ids that have already been possessed on this page load.
 * - The site key is the origin and host, never the path or query.
 */
export function decideEffect(
  f: FindingForPossession,
  moment: Moment | null,
  ctx: { site: string; counters: PossessionCounters; shownThisLoad: ReadonlySet<string> },
): { decision: Decision; counters: PossessionCounters } {
  if (!meetsTrigger(f, moment)) return { decision: 'none', counters: ctx.counters };

  const siteCount = ctx.counters.sites[ctx.site] ?? 0;
  const capped =
    ctx.shownThisLoad.has(f.id) ||
    ctx.counters.total >= POSSESSION_DAILY_TOTAL ||
    siteCount >= POSSESSION_DAILY_PER_SITE;
  if (capped) return { decision: 'capped', counters: ctx.counters };

  return {
    decision: 'possession',
    counters: {
      day: ctx.counters.day,
      total: ctx.counters.total + 1,
      sites: { ...ctx.counters.sites, [ctx.site]: siteCount + 1 },
    },
  };
}

/** Site key for the caps: origin plus host, e.g. "https://streamly.example". Returns "" for odd URLs. */
export function siteKey(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}
