import { beforeEach, describe, expect, it } from 'vitest';
import { installChromeMock, type ChromeMock } from './chromeMock';
import {
  ALL_SITES,
  DETECT_SCRIPT_ID,
  disableBackground,
  enableBackground,
  enableSite,
  excludeMatchesFor,
  listEnabledSites,
  syncRegistrations,
} from '../src/access';
import { setPrefs } from '../src/prefs';

let chromeMock: ChromeMock;
beforeEach(() => {
  chromeMock = installChromeMock();
});

describe('syncRegistrations (task 5.7)', () => {
  it('registers nothing when no host access is granted (FR-ACC-01)', async () => {
    await syncRegistrations();
    expect(chromeMock.registered.size).toBe(0);
  });

  it('registers for all sites once background detection is granted (FR-ACC-04)', async () => {
    await enableBackground();
    const script = chromeMock.registered.get(DETECT_SCRIPT_ID)!;
    expect(script.matches).toEqual(ALL_SITES);
    expect(script.runAt).toBe('document_idle');
    expect(script.excludeMatches).toContain('*://*.chase.com/*');
  });

  it('unregisters when access is revoked, even outside Specter (FR-ACC-05)', async () => {
    await enableBackground();
    // Simulate the user removing access in Chrome's own settings.
    ALL_SITES.forEach((o) => chromeMock.grantedOrigins.delete(o));
    await syncRegistrations();
    expect(chromeMock.registered.has(DETECT_SCRIPT_ID)).toBe(false);
  });

  it('turning background detection off removes the registration', async () => {
    await enableBackground();
    await disableBackground();
    expect(chromeMock.registered.size).toBe(0);
  });

  it('registers only for sites enabled one by one (FR-ACC-07)', async () => {
    await enableSite('https://streamly.example/signup');
    expect(chromeMock.registered.get(DETECT_SCRIPT_ID)!.matches).toEqual(['https://streamly.example/*']);
    expect(await listEnabledSites()).toEqual(['https://streamly.example/*']);
  });

  it('keeps excluded and paused domains out of the registration', async () => {
    await setPrefs({ excludedDomains: ['bank.example'], pausedDomains: ['quiet.example'] });
    await enableBackground();
    const ex = chromeMock.registered.get(DETECT_SCRIPT_ID)!.excludeMatches!;
    expect(ex).toEqual(expect.arrayContaining(['*://bank.example/*', '*://*.quiet.example/*']));
  });
});

describe('excludeMatchesFor', () => {
  it('covers the domain and its subdomains, dropping www', () => {
    expect(excludeMatchesFor(['www.mybank.example'])).toEqual([
      '*://mybank.example/*',
      '*://*.mybank.example/*',
    ]);
  });
});
