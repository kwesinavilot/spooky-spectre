import { create } from 'zustand';

export type SidePanelStatus = 'idle' | 'detected' | 'analyzing' | 'results';
export type SidePanelTab = 'findings' | 'evidence' | 'ask';

export interface SidePanelState {
  status: SidePanelStatus;
  activeTab: SidePanelTab;
  setStatus: (status: SidePanelStatus) => void;
  setActiveTab: (tab: SidePanelTab) => void;
}

export const useSidePanel = create<SidePanelState>((set) => ({
  status: 'idle',
  activeTab: 'findings',
  setStatus: (status) => set({ status }),
  setActiveTab: (activeTab) => set({ activeTab }),
}));
