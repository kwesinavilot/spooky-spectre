import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { createSidePanelState, type SidePanelState } from '../src/store/sidepanel';

const makeStore = () => create<SidePanelState>((set) => createSidePanelState(set));

describe('side panel navigation', () => {
  it('starts on the Page tab with no drill-in', () => {
    const s = makeStore().getState();
    expect(s.tab).toBe('page');
    expect(s.drill).toBeNull();
  });

  it('back from a drill-in returns to the same tab with its state intact', () => {
    const store = makeStore();
    store.getState().setTab('findings');
    store.getState().setStatus('agreement_detected');
    store.getState().openDrill('settings');
    expect(store.getState().drill).toBe('settings');
    store.getState().back();
    expect(store.getState().tab).toBe('findings');
    expect(store.getState().status).toBe('agreement_detected');
    expect(store.getState().drill).toBeNull();
  });

  it('switching tabs closes any drill-in', () => {
    const store = makeStore();
    store.getState().openDrill('ai');
    store.getState().setTab('ask');
    expect(store.getState().drill).toBeNull();
    expect(store.getState().tab).toBe('ask');
  });
});
