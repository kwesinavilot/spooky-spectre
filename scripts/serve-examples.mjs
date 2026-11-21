// Serves examples/ on http://localhost:5178 for manual checks in Chrome
// (Spec 2 task 2.5). Node built-ins only; nothing is added to the extension.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../examples');
const port = Number(process.env.PORT ?? 5178);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  let file = normalize(join(root, path));
  // Never serve anything outside examples/.
  if (!file.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
}).listen(port, () => {
  console.log(`Specter demo pages: http://localhost:${port}/streamly/signup.html`);
});
