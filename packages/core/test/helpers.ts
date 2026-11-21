import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const examplesDir = fileURLToPath(new URL('../../../examples/', import.meta.url));

export function readExample(path: string): string {
  return readFileSync(`${examplesDir}${path}`, 'utf8');
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
