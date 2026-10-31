/**
 * Minimal typed message bus between the side panel, background and content script.
 * Only ping/pong and get-status are defined here; analysis messages arrive in later specs.
 */
export type SpecterMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'get-status' }
  | { type: 'status'; status: string };

export async function sendMessage<T extends SpecterMessage>(
  message: T,
): Promise<SpecterMessage | undefined> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch {
    // The receiver may be absent (e.g. content script not injected yet); fail soft.
    return undefined;
  }
}

export function onMessage(
  handler: (message: SpecterMessage) => SpecterMessage | undefined | Promise<SpecterMessage | undefined>,
): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const result = handler(message as SpecterMessage);
    if (result instanceof Promise) {
      result.then((r) => sendResponse(r));
      return true;
    }
    sendResponse(result);
    return false;
  });
}
