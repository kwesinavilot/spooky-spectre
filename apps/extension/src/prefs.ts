// Subpath import: this file is bundled into the content script (NFR-03).
import { DEFAULT_EXCLUDED_DOMAINS } from '@specter/core/privacy';

/**
 * Preferences the content script and background worker need. They live in
 * chrome.storage.local because content scripts cannot read the extension's
 * IndexedDB (Dexie). Nothing here is page content.
 */
export interface SpecterPrefs {
  /** Built-in plus user-added excluded domains (banks, health, email by default). */
  excludedDomains: string[];
  /** Sites the user paused from the popup while background detection is on. */
  pausedDomains: string[];
  /** One-time consent to read linked policies automatically (Spec 2 requirements section 8). */
  readLinkedPolicies: boolean;
  /** Effect level, readable by the overlay (design steering section 5). */
  effectLevel: 'immersive' | 'subtle' | 'quiet';
  /** Show what will be sent before any AI call (design steering 6C). */
  previewBeforeSending: boolean;
  /** List cookie banner choices on-device. */
  detectCookieBanners: boolean;
  /** Offer to log consent choices that Specter clearly observes. */
  offerConsentLog: boolean;
  /** Set when onboarding finishes or is skipped. */
  onboardingComplete: boolean;
}

export const DEFAULT_PREFS: SpecterPrefs = {
  excludedDomains: [...DEFAULT_EXCLUDED_DOMAINS],
  pausedDomains: [],
  readLinkedPolicies: false,
  effectLevel: 'subtle',
  previewBeforeSending: true,
  detectCookieBanners: true,
  offerConsentLog: false,
  onboardingComplete: false,
};

const KEY = 'specterPrefs';

export async function getPrefs(): Promise<SpecterPrefs> {
  const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<SpecterPrefs> | undefined;
  return { ...DEFAULT_PREFS, ...stored };
}

export async function setPrefs(patch: Partial<SpecterPrefs>): Promise<SpecterPrefs> {
  const next = { ...(await getPrefs()), ...patch };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

/** Domains Specter must not read: excluded plus paused. */
export function blockedDomains(prefs: SpecterPrefs): string[] {
  return [...prefs.excludedDomains, ...prefs.pausedDomains];
}

export function onPrefsChanged(cb: (prefs: SpecterPrefs) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes[KEY]) cb({ ...DEFAULT_PREFS, ...(changes[KEY].newValue ?? {}) });
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
