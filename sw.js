// Service Worker: hält die Filme im Browser vor, damit Tafel und Kiosk auch bei langsamem oder
// ausgefallenem Schulnetz laufen. Angemeldet wird er nur von tafel.html und kiosk.html
// (assets/js/offline.js); Handys, die nur die Startseite öffnen, speichern nichts.
//
// - Bilder und Ton (media/…): aus dem Speicher, sonst aus dem Netz (und dann merken).
//   Tonaufnahmen fragt der Browser in Stücken an (Range); die schneidet der Worker aus der
//   gespeicherten Datei zu.
// - Seiten, Skripte, Daten: zuerst aus dem Netz (damit Änderungen ankommen), nach 4 s oder
//   ohne Netz aus dem Speicher.
const CACHE = 'tdot-filme-v1';
const NET_TIMEOUT = 4000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/media/')) e.respondWith(media(req));
  else e.respondWith(page(req));
});

async function media(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req.url);
  const range = req.headers.get('range');
  if (hit) return range ? slice(hit, range) : hit;
  if (range) return fetch(req);              // Teilstück aus dem Netz; gemerkt wird nur Ganzes
  const resp = await fetch(req);
  if (resp.ok && resp.status === 200) cache.put(req.url, resp.clone());
  return resp;
}

async function page(req) {
  const cache = await caches.open(CACHE);
  const fromNet = fetch(req).then((resp) => {
    if (resp.ok && resp.status === 200) cache.put(req, resp.clone());
    return resp;
  });
  const timeout = new Promise((res) => setTimeout(res, NET_TIMEOUT));
  try {
    const resp = await Promise.race([fromNet, timeout]);
    if (resp) return resp;
  } catch (err) { /* kein Netz */ }
  // Seiten auch ohne ?fach=… finden (film.html?fach=kunst&kiosk=1 → film.html)
  const hit = await cache.match(req, { ignoreSearch: true });
  return hit || fromNet;
}

async function slice(resp, range) {
  const buf = await resp.clone().arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? Number(m[1]) : 0, end = m[2] ? Number(m[2]) : buf.byteLength - 1;
  if (!m[1] && m[2]) { start = buf.byteLength - Number(m[2]); end = buf.byteLength - 1; }
  end = Math.min(end, buf.byteLength - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': resp.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}
