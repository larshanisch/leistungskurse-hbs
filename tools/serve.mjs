// Kleiner Webserver für die Vorschau: node tools/serve.mjs [port] [KB/s]
// Mit KB/s drosselt er jede Antwort auf diese Geschwindigkeit (Test für langsames Schulnetz).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8317;
const RATE = Number(process.argv[3]) || 0;   // KB/s je Antwort, 0 = ungedrosselt
const slow = () => new Transform({
  transform(chunk, enc, done) { setTimeout(() => done(null, chunk), (chunk.length / 1024 / RATE) * 1000); }
});
const send = (stream, res) => (RATE ? stream.pipe(slow()).pipe(res) : stream.pipe(res));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };

http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('nicht gefunden'); }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0, end = range[2] ? Number(range[2]) : st.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      return send(fs.createReadStream(file, { start, end, highWaterMark: 16384 }), res);
    }
    // Zeitstempel wie GitHub Pages (assets/js/update.js vergleicht ihn mit der angezeigten Seite)
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Last-Modified': st.mtime.toUTCString(), 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    send(fs.createReadStream(file, { highWaterMark: 16384 }), res);
  });
}).listen(PORT, () => console.log(`Vorschau: http://localhost:${PORT}/`));
