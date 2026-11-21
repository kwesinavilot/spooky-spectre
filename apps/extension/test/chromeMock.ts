/**
 * A small in-memory stand-in for the chrome.* APIs the Spec 2 wiring uses.
 * Only what the tests need; each test calls installChromeMock() for a fresh copy.
 */
type Area = Record<string, unknown>;

function storageArea(data: Area) {
  return {
    async get(key: string) {
      return key in data ? { [key]: data[key] } : {};
    },
    async set(items: Area) {
      Object.assign(data, structuredClone(items));
    },
    async remove(key: string) {
      delete data[key];
    },
  };
}

export interface ChromeMock {
  grantedOrigins: Set<string>;
  registered: Map<string, chrome.scripting.RegisteredContentScript>;
  badges: Map<number, string>;
  session: Area;
  local: Area;
  sent: unknown[];
}

export function installChromeMock(): ChromeMock {
  const state: ChromeMock = {
    grantedOrigins: new Set(),
    registered: new Map(),
    badges: new Map(),
    session: {},
    local: {},
    sent: [],
  };
  const api = {
    permissions: {
      async getAll() {
        return { origins: [...state.grantedOrigins], permissions: [] };
      },
      async contains({ origins = [] }: { origins?: string[] }) {
        return origins.every((o) => state.grantedOrigins.has(o));
      },
      async request({ origins = [] }: { origins?: string[] }) {
        origins.forEach((o) => state.grantedOrigins.add(o));
        return true;
      },
      async remove({ origins = [] }: { origins?: string[] }) {
        origins.forEach((o) => state.grantedOrigins.delete(o));
        return true;
      },
    },
    scripting: {
      async getRegisteredContentScripts({ ids = [] }: { ids?: string[] }) {
        return ids.filter((id) => state.registered.has(id)).map((id) => state.registered.get(id)!);
      },
      async registerContentScripts(scripts: chrome.scripting.RegisteredContentScript[]) {
        for (const s of scripts) {
          if (state.registered.has(s.id)) throw new Error(`Duplicate script ID '${s.id}'`);
          state.registered.set(s.id, s);
        }
      },
      async updateContentScripts(scripts: chrome.scripting.RegisteredContentScript[]) {
        for (const s of scripts) state.registered.set(s.id, { ...state.registered.get(s.id)!, ...s });
      },
      async unregisterContentScripts({ ids = [] }: { ids?: string[] }) {
        ids.forEach((id) => state.registered.delete(id));
      },
    },
    storage: {
      session: storageArea(state.session),
      local: storageArea(state.local),
      onChanged: { addListener() {}, removeListener() {} },
    },
    action: {
      async setBadgeText({ tabId, text }: { tabId: number; text: string }) {
        state.badges.set(tabId, text);
      },
      async setBadgeBackgroundColor() {},
    },
    runtime: {
      async sendMessage(message: unknown) {
        state.sent.push(message);
      },
    },
  };
  (globalThis as unknown as { chrome: unknown }).chrome = api;
  return state;
}
