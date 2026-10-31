import type { HauntingLevel } from './store/settings';
import type { SidePanelStatus, SidePanelTab } from './store/sidepanel';

/** Full-page extension tabs that open via chrome.tabs.create. */
export type SpecterPage = 'graveyard' | 'options' | 'onboarding' | 'help';

export type { HauntingLevel, SidePanelStatus, SidePanelTab };
