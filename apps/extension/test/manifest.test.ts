import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Reads wxt.config.ts as text so the test does not need to load WXT itself.
const configText = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../wxt.config.ts'),
  'utf8',
);

describe('manifest permissions (task 5.7, FR-ACC-01)', () => {
  it('declares no host_permissions', () => {
    expect(configText).not.toMatch(/\bhost_permissions\s*:/);
  });

  it('lists http and https only under optional_host_permissions, never <all_urls>', () => {
    expect(configText).toMatch(/optional_host_permissions:\s*\['http:\/\/\*\/\*',\s*'https:\/\/\*\/\*'\]/);
    expect(configText).not.toContain('<all_urls>');
  });

  it('asks only for the MVP permissions', () => {
    expect(configText).toMatch(/permissions:\s*\['activeTab',\s*'storage',\s*'sidePanel',\s*'scripting'\]/);
  });
});
