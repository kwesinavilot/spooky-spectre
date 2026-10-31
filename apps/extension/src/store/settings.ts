import { create } from 'zustand';
import { DEFAULT_EXCLUDED_DOMAINS, type TokenName } from '@specter/core';

export type HauntingLevel = 'immersive' | 'subtle' | 'quiet';

export interface SettingsState {
  hauntingLevel: HauntingLevel;
  reduceMotion: boolean;
  excludedDomains: string[];
  providerId: string | null;
  onboardingComplete: boolean;
  setHauntingLevel: (level: HauntingLevel) => void;
  setReduceMotion: (value: boolean) => void;
  setProviderId: (id: string | null) => void;
  setExcludedDomains: (domains: string[]) => void;
  completeOnboarding: () => void;
}

export const useSettings = create<SettingsState>((set) => ({
  hauntingLevel: 'immersive',
  reduceMotion: false,
  excludedDomains: [...DEFAULT_EXCLUDED_DOMAINS],
  providerId: null,
  onboardingComplete: false,
  setHauntingLevel: (hauntingLevel) => set({ hauntingLevel }),
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  setProviderId: (providerId) => set({ providerId }),
  setExcludedDomains: (excludedDomains) => set({ excludedDomains }),
  completeOnboarding: () => set({ onboardingComplete: true }),
}));

export type { TokenName };
