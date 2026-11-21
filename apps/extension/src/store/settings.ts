import { create } from 'zustand';
import { DEFAULT_EXCLUDED_DOMAINS, type TokenName } from '@specter/core';
import { db } from '../db/database';

export type HauntingLevel = 'immersive' | 'subtle' | 'quiet';

const SETTINGS_KEY = 'settings';

/** The slice of settings persisted to the Dexie `settings` store (FR-DB-04). */
interface PersistedSettings {
  hauntingLevel: HauntingLevel;
  reduceMotion: boolean;
  excludedDomains: string[];
  providerId: string | null;
  onboardingComplete: boolean;
}

export interface SettingsState extends PersistedSettings {
  setHauntingLevel: (level: HauntingLevel) => void;
  setReduceMotion: (value: boolean) => void;
  setProviderId: (id: string | null) => void;
  setExcludedDomains: (domains: string[]) => void;
  completeOnboarding: () => void;
}

/** FR-TOK-06: honour the user agent's reduced-motion preference by default. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const useSettings = create<SettingsState>((set) => ({
  // Subtle is the default effect level (design steering section 5).
  hauntingLevel: 'subtle',
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

let hydrated = false;

/**
 * Reads the persisted settings (if any) into the store. Each surface calls
 * this once on mount, before first paint, via `mount.tsx` (design section 8).
 */
export async function hydrateSettings(): Promise<void> {
  const row = await db.settings.get(SETTINGS_KEY);
  const saved = (row?.value ?? {}) as Partial<PersistedSettings>;
  useSettings.setState({
    hauntingLevel: saved.hauntingLevel ?? 'subtle',
    reduceMotion: saved.reduceMotion ?? prefersReducedMotion(),
    excludedDomains: saved.excludedDomains ?? [...DEFAULT_EXCLUDED_DOMAINS],
    providerId: saved.providerId ?? null,
    onboardingComplete: saved.onboardingComplete ?? false,
  });
  hydrated = true;
}

/** Persists the current settings slice to the Dexie `settings` store. */
async function persist(): Promise<void> {
  const { hauntingLevel, reduceMotion, excludedDomains, providerId, onboardingComplete } =
    useSettings.getState();
  await db.settings.put({
    key: SETTINGS_KEY,
    value: { hauntingLevel, reduceMotion, excludedDomains, providerId, onboardingComplete },
  });
}

// Persist on every change once hydration has run, so the hydrate itself
// does not trigger a redundant write. Cross-surface live sync arrives later.
useSettings.subscribe(() => {
  if (hydrated) void persist();
});

export type { TokenName };
