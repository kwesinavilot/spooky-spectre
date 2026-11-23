import { create } from 'zustand';

/** Bottom-nav tabs (design steering 6C). History opens the Graveyard instead of a tab. */
export type SidePanelTab = 'page' | 'findings' | 'ask';
/** Drill-in screens that replace the body and show a back arrow. */
export type DrillIn = 'settings' | 'ai';
/** Page tab state; grows in Spec 2 Phase 6 (design steering section 8). */
export type SidePanelStatus = 'idle' | 'agreement_detected' | 'extracting' | 'unsupported_page';

export interface SidePanelState {
  tab: SidePanelTab;
  drill: DrillIn | null;
  status: SidePanelStatus;
  /** A question waiting in the Ask box, set by "Explain" on a finding. Cleared once the Ask tab takes it. */
  askDraft: string | null;
  setTab: (tab: SidePanelTab) => void;
  /** Opens Ask with the question filled in. The user still presses Ask; nothing is sent. */
  askAbout: (question: string) => void;
  clearAskDraft: () => void;
  openDrill: (drill: DrillIn) => void;
  /** Back from a drill-in returns to the tab the user was on, with its state intact. */
  back: () => void;
  setStatus: (status: SidePanelStatus) => void;
}

export const createSidePanelState = (
  set: (partial: Partial<SidePanelState>) => void,
): SidePanelState => ({
  tab: 'page',
  drill: null,
  status: 'idle',
  askDraft: null,
  setTab: (tab) => set({ tab, drill: null }),
  askAbout: (question) => set({ tab: 'ask', drill: null, askDraft: question }),
  clearAskDraft: () => set({ askDraft: null }),
  openDrill: (drill) => set({ drill }),
  back: () => set({ drill: null }),
  setStatus: (status) => set({ status }),
});

export const useSidePanel = create<SidePanelState>((set) => createSidePanelState(set));
