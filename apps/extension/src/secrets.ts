/**
 * Single helper for reading/writing secrets in chrome.storage.local only.
 * No other module touches storage for keys, and nothing here is logged (FR-PRIV-03/04).
 */
export async function getSecret(key: string): Promise<string | null> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as string | undefined) ?? null;
}

export async function setSecret(key: string, value: string): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function clearSecret(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}
