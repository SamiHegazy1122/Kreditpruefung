/* Minimaler statischer Testserver fuer die E2E-Tests (keine zusaetzliche Dependency). */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = fileURLToPath(new URL('../../', import.meta.url));
const PORT = Number(process.env.PORT ?? 5173);

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer(async (anfrage, antwort) => {
  const pfad = decodeURIComponent(new URL(anfrage.url, 'http://127.0.0.1').pathname);
  const ziel = path.join(WURZEL, pfad === '/' ? 'index.html' : pfad);

  if (!ziel.startsWith(WURZEL)) {
    antwort.writeHead(403).end('Verboten');
    return;
  }
  try {
    const inhalt = await fs.readFile(ziel);
    antwort.writeHead(200, { 'Content-Type': TYPEN[path.extname(ziel)] ?? 'application/octet-stream' });
    antwort.end(inhalt);
  } catch {
    antwort.writeHead(404).end('Nicht gefunden');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Testserver laeuft auf http://127.0.0.1:${PORT}`);
});
