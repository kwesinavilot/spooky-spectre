/**
 * SHA-256 of the normalized document text, hex encoded (FR-EXT-07). Because
 * the input is already normalized, layout and whitespace changes do not change
 * the hash and any word change does.
 */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  // Copy into a plain ArrayBuffer so the digest works across realms (tests, workers).
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
