// Saves public pages into corpus/ for regression tests (Spec 2 task 7.1).
//   pnpm corpus:add <url> <name> [kind,kind]     save one page
//   pnpm corpus:add --sources                    save every page listed in corpus/sources.json
// Scripts are stripped. Each page is fetched once, without cookies. A manifest
// stub is added for new pages; fill in "mustContain" with 2 to 5 phrases.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../corpus');
const pagesDir = join(root, 'pages');
const manifestPath = join(root, 'manifest.json');

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function savePage(url, name, kinds) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      'accept-language': 'en-GB,en;q=0.9',
    },
  });
  if (!response.ok) throw new Error(`${name}: ${response.status} ${response.statusText}`);
  const html = (await response.text())
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*rel=["']?(preload|modulepreload|prefetch)["']?[^>]*>/gi, '');
  await mkdir(pagesDir, { recursive: true });
  await writeFile(join(pagesDir, `${name}.html`), html, 'utf8');

  const manifest = await readJson(manifestPath, []);
  if (!manifest.some((e) => e.file === `${name}.html`)) {
    manifest.push({
      file: `${name}.html`,
      sourceUrl: response.url || url,
      capturedAt: new Date().toISOString().slice(0, 10),
      expectedKinds: kinds,
      mustContain: [],
    });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
  console.log(`Saved corpus/pages/${name}.html (${Math.round(html.length / 1024)} KB)`);
}

const args = process.argv.slice(2);
if (args[0] === '--sources') {
  const sources = await readJson(join(root, 'sources.json'), []);
  for (const s of sources) {
    try {
      await savePage(s.url, s.name, s.expectedKinds ?? []);
    } catch (err) {
      console.error(`Failed: ${err.message}`);
    }
  }
} else {
  const [url, name, kinds = ''] = args;
  if (!url || !name || !/^[a-z0-9-]+$/.test(name)) {
    console.error('Usage: pnpm corpus:add <url> <name-with-dashes> [expected,kinds]  |  pnpm corpus:add --sources');
    process.exit(1);
  }
  await savePage(url, name, kinds ? kinds.split(',') : []);
}
