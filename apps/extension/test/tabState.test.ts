import { beforeEach, describe, expect, it } from 'vitest';
import type { DetectionResult } from '@specter/core';
import { installChromeMock, type ChromeMock } from './chromeMock';
import { handleBackgroundMessage, handleTabRemoved, handleTabUpdated } from '../src/backgroundHandlers';
import { getTabState } from '../src/tabState';

const result: DetectionResult = {
  url: 'https://streamly.example/signup',
  kinds: ['consent_checkbox', 'subscription_terms'],
  signals: [],
  cookieControls: [],
  noRejectControlFound: false,
  actionControls: [],
  links: [],
  unreadable: [],
  isPdf: false,
  confidence: 0.8,
  detectedAt: '2026-11-21T00:00:00.000Z',
};

const sender = { tab: { id: 7, url: 'https://streamly.example/signup?ref=ad' } as chrome.tabs.Tab, frameId: 0 };

let chromeMock: ChromeMock;
beforeEach(() => {
  chromeMock = installChromeMock();
});

describe('tab state (task 5.4, FR-PRV-03)', () => {
  it('stores the detection result per tab, without the query string, and shows the dot badge', async () => {
    await handleBackgroundMessage({ type: 'detected', result }, sender);
    const state = await getTabState(7);
    expect(state?.url).toBe('https://streamly.example/signup');
    expect(state?.result?.kinds).toEqual(['consent_checkbox', 'subscription_terms']);
    expect(chromeMock.badges.get(7)).toBe(' ');
    expect(chromeMock.sent).toContainEqual({ type: 'tab-state-changed', tabId: 7 });
  });

  it('never shows a number on the badge, and clears it when nothing is found', async () => {
    await handleBackgroundMessage({ type: 'detected', result: { ...result, kinds: [] } }, sender);
    expect(chromeMock.badges.get(7)).toBe('');
  });

  it('ignores reports from frames other than the top frame', async () => {
    await handleBackgroundMessage({ type: 'detected', result }, { ...sender, frameId: 3 });
    expect(await getTabState(7)).toBeNull();
  });

  it('clears the state when the tab navigates to another URL', async () => {
    await handleBackgroundMessage({ type: 'detected', result }, sender);
    await handleTabUpdated(7, { url: 'https://streamly.example/signup?step=2' });
    expect(await getTabState(7)).not.toBeNull(); // same page, different query
    await handleTabUpdated(7, { url: 'https://streamly.example/account' });
    expect(await getTabState(7)).toBeNull();
    expect(chromeMock.badges.get(7)).toBe('');
  });

  it('clears the state when the tab closes', async () => {
    await handleBackgroundMessage({ type: 'detected', result }, sender);
    await handleTabRemoved(7);
    expect(await getTabState(7)).toBeNull();
  });

  it('answers get-tab-state', async () => {
    await handleBackgroundMessage({ type: 'detected', excluded: true }, sender);
    const reply = await handleBackgroundMessage({ type: 'get-tab-state', tabId: 7 }, {});
    expect(reply).toEqual({
      type: 'tab-state',
      state: { url: 'https://streamly.example/signup', excluded: true, result: undefined },
    });
    expect(chromeMock.badges.get(7)).toBe('');
  });
});
