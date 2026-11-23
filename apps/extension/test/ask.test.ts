import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { excerptItemFor, excerptStart } from '../src/showOnPage';
import { createSidePanelState, type SidePanelState } from '../src/store/sidepanel';

describe('Explain hand-off', () => {
  it('opens Ask with the question filled in, then clears it', () => {
    const store = create<SidePanelState>((set) => createSidePanelState(set));
    store.getState().openDrill('settings');
    store.getState().askAbout('Explain this clause: Renews monthly');
    expect(store.getState().tab).toBe('ask');
    expect(store.getState().drill).toBeNull();
    expect(store.getState().askDraft).toBe('Explain this clause: Renews monthly');
    store.getState().clearAskDraft();
    expect(store.getState().askDraft).toBeNull();
  });
});

describe('cited excerpts', () => {
  it('collapses whitespace and cuts long sections at a word boundary', () => {
    const text = 'Your   subscription\nrenews ' + 'automatically '.repeat(30);
    const start = excerptStart(text);
    expect(start.length).toBeLessThanOrEqual(160);
    expect(start.startsWith('Your subscription renews automatically')).toBe(true);
    expect(start.endsWith('automatically')).toBe(true);
  });

  it('marks a cited excerpt as unverified, low concern and out of Possession', () => {
    const item = excerptItemFor({ id: 's-4-2', heading: '4.2 Renewal', text: 'Renews monthly.' });
    expect(item.id).toBe('ask:s-4-2');
    expect(item.verified).toBe(false);
    expect(item.concern).toBe('low');
    expect(item.confidence).toBe(0);
    expect(item.quote).toBe('Renews monthly.');
  });
});
