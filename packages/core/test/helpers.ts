import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// happy-dom replaces the global URL class, so build the path with node:path
// from the file path string instead of `new URL(..., import.meta.url)`.
const examplesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../examples');

export function readExample(path: string): string {
  return readFileSync(resolve(examplesDir, path), 'utf8');
}

/** Parses HTML into a standalone Document (no scripts run, no window). */
export function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

export function loadExample(path: string): Document {
  return parse(readExample(path));
}

export const DEMO_PAGES: { path: string; url: string }[] = [
  { path: 'streamly/signup.html', url: 'https://streamly.example/signup' },
  { path: 'streamly/terms-v1.html', url: 'https://streamly.example/terms' },
  { path: 'streamly/terms-v2.html', url: 'https://streamly.example/terms' },
  { path: 'cookies/index.html', url: 'https://gazette.example/' },
  { path: 'cookies/no-reject.html', url: 'https://gazette.example/no-reject' },
  { path: 'benign/terms.html', url: 'https://lantern.example/terms' },
];
