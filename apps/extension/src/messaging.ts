import type { DetectionResult, ExtractedDocument } from '@specter/core';

/** What the background worker keeps per tab, in chrome.storage.session (FR-PRV-03). */
export interface TabState {
  /** Origin and path of the page the result belongs to. */
  url: string;
  excluded: boolean;
  result?: DetectionResult;
}

/** What the popover on the page shows for a highlighted finding. Plain text only. */
export interface HighlightCard {
  id: string;
  title: string;
  /** "High impact", "Medium impact" or "Low impact". */
  impact: string;
  /** One sentence on what the clause could mean for the reader. */
  sentence: string;
}

export type ExtractTarget = 'page' | 'banner';
export type ExtractFailure = 'excluded' | 'pdf' | 'no_access' | 'nothing_found' | 'error';

/**
 * Typed messages between the content script, background worker, side panel
 * and popup (Spec 2 design section 6). Extract messages carry a requestId so a
 * late answer to an old request is ignored.
 */
export type SpecterMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'get-status' }
  | { type: 'status'; status: string }
  // content script -> background
  | { type: 'detected'; result?: DetectionResult; excluded?: boolean }
  // side panel or popup -> background
  | { type: 'get-tab-state'; tabId: number }
  | { type: 'tab-state'; state: TabState | null }
  // background -> extension pages
  | { type: 'tab-state-changed'; tabId: number }
  // side panel -> content script
  | { type: 'highlight'; quote: string; effect: string; card?: HighlightCard }
  | { type: 'highlighted'; found: boolean }
  // page popover -> side panel: open the finding in the Findings tab
  | { type: 'focus-finding'; id: string }
  | { type: 'clear-highlight' }
  | { type: 'get-detection' }
  | { type: 'detection'; result?: DetectionResult; excluded?: boolean }
  | { type: 'extract'; requestId: string; target: ExtractTarget }
  // content script -> side panel
  | { type: 'extracted'; requestId: string; doc: ExtractedDocument }
  | { type: 'extract-failed'; requestId: string; reason: ExtractFailure };

export async function sendMessage(message: SpecterMessage): Promise<SpecterMessage | undefined> {
  try {
    return (await chrome.runtime.sendMessage(message)) as SpecterMessage | undefined;
  } catch {
    // The receiver may be absent (for example no extension page is open); fail soft.
    return undefined;
  }
}

export async function sendToTab(
  tabId: number,
  message: SpecterMessage,
): Promise<SpecterMessage | undefined> {
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as SpecterMessage | undefined;
  } catch {
    // No content script in that tab yet.
    return undefined;
  }
}

export function onMessage(
  handler: (
    message: SpecterMessage,
    sender: chrome.runtime.MessageSender,
  ) => SpecterMessage | undefined | Promise<SpecterMessage | undefined>,
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message as SpecterMessage, sender);
    if (result instanceof Promise) {
      result.then((r) => sendResponse(r));
      return true;
    }
    sendResponse(result);
    return false;
  });
}
