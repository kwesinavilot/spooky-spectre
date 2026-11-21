import { DetectionResult, ExtractedDocument } from '@specter/core';
import { CONTENT_SCRIPT_FILE, originPattern } from './access';
import { sendToTab, type ExtractFailure, type ExtractTarget } from './messaging';

export type DetectionReply =
  | { status: 'ok'; result: DetectionResult }
  | { status: 'excluded' }
  | { status: 'no_access' };

/**
 * Makes sure the content script is running in the tab (Spec 2 task 5.6). If it
 * was not registered there, inject it with the access Chrome granted when the
 * user opened the popup (activeTab). Fails with no_access otherwise; the side
 * panel then offers "Allow on this site".
 */
export async function ensureContentScript(tabId: number): Promise<boolean> {
  const pong = await sendToTab(tabId, { type: 'ping' });
  if (pong?.type === 'pong') return true;
  try {
    // Mark this as an on-demand injection, so the late-banner observer stays off.
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        (globalThis as { __specterOnDemand?: boolean }).__specterOnDemand = true;
      },
    });
    await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILE] });
    return true;
  } catch {
    return false;
  }
}

export async function checkPage(tabId: number): Promise<DetectionReply> {
  if (!(await ensureContentScript(tabId))) return { status: 'no_access' };
  // The script detects when the browser is idle; ask until it has an answer.
  for (let i = 0; i < 10; i++) {
    const reply = await sendToTab(tabId, { type: 'get-detection' });
    if (reply?.type === 'detection') {
      if (reply.excluded) return { status: 'excluded' };
      // Checked on receipt: the content script runs inside the page (NFR-02).
      const parsed = reply.result === undefined ? null : DetectionResult.safeParse(reply.result);
      if (parsed?.success) return { status: 'ok', result: parsed.data };
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return { status: 'no_access' };
}

/** Must run from a click: asks Chrome for access to this one site. */
export async function allowSite(url: string): Promise<boolean> {
  return chrome.permissions.request({ origins: [originPattern(url)] });
}

export type ExtractReply =
  | { status: 'ok'; doc: ExtractedDocument }
  | { status: 'failed'; reason: ExtractFailure };

export async function extractFromTab(
  tabId: number,
  target: ExtractTarget,
  requestId: string,
): Promise<ExtractReply> {
  const reply = await sendToTab(tabId, { type: 'extract', requestId, target });
  if (reply?.type === 'extracted' && reply.requestId === requestId) {
    const parsed = ExtractedDocument.safeParse(reply.doc);
    return parsed.success ? { status: 'ok', doc: parsed.data } : { status: 'failed', reason: 'error' };
  }
  if (reply?.type === 'extract-failed') return { status: 'failed', reason: reply.reason };
  return { status: 'failed', reason: 'no_access' };
}
