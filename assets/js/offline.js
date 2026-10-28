// Vorladen für Tafel und Kiosk: meldet den Service Worker (sw.js) an und legt alle drei Filme
// samt Seiten im Browser ab. Danach laufen sie ohne Netz – auch am nächsten Tag.
// Braucht window.FILMS (assets/data/*.js). Vom USB-Stick (file://) gibt es keinen Service
// Worker; dort liegt ohnehin alles lokal, und es wird nichts geladen.
(function () {
  'use strict';
  const CACHE = 'tdot-filme-v1';           // derselbe Name wie in sw.js
  const PARALLEL = 4;
  const CORE = ['index.html', 'film.html', 'assets/css/film.css', 'assets/js/film.js',
    'assets/data/deutsch.js', 'assets/data/englisch.js', 'assets/data/kunst.js',
    'assets/img/logo_hbs_dunkel.png', 'assets/img/figur_sie.jpg', 'assets/img/figur_er.jpg'];

  function mediaList() {
    const set = new Set();
    Object.values(window.FILMS || {}).forEach((f) => f.scenes.forEach((sc) => {
      [sc.image].concat(sc.imageCues || []).forEach((im) => { set.add(im.src); if (im.bg) set.add(im.bg); });
      sc.sentences.forEach((s) => set.add(s.audio));
    }));
    return [...set];
  }

  // onProgress(done, total, failed); gibt ein Promise mit { ok, failed, total } zurück
  async function preload(onProgress) {
    const report = onProgress || function () {};
    if (!('serviceWorker' in navigator) || !window.caches || location.protocol === 'file:') {
      return { ok: false, reason: 'kein Speicher (z. B. vom USB-Stick)', failed: 0, total: 0 };
    }
    await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    const cache = await caches.open(CACHE);
    const media = mediaList();
    const base = new URL('.', location.href).href;
    const abs = (p) => new URL(p, base).href;

    // Aufnahmen, die nicht mehr verwendet werden, aus dem Speicher nehmen
    const wanted = new Set(media.map(abs));
    for (const req of await cache.keys()) {
      if (req.url.includes('/media/') && !wanted.has(req.url)) await cache.delete(req);
    }

    const jobs = CORE.map((p) => ({ p, always: true })).concat(media.map((p) => ({ p, always: false })));
    let done = 0, failed = 0;
    report(done, jobs.length, failed);
    async function one(job) {
      try {
        // Ton hat eindeutige Dateinamen: was gespeichert ist, bleibt. Bilder, Seiten und Daten
        // werden kurz nachgefragt (bei unveränderten Dateien kommt nur eine kleine Antwort).
        const known = await cache.match(abs(job.p));
        if (!(known && job.p.endsWith('.mp3'))) {
          // Ton immer ganz und frisch holen: Hat der Browser ihn schon einmal in Stücken geladen,
          // käme sonst ein Teilstück (206), und das lässt sich nicht speichern
          const mode = job.p.endsWith('.mp3') ? 'no-store' : 'no-cache';
          const resp = await fetch(abs(job.p), { cache: mode });
          if (resp.status !== 200) throw new Error(resp.status);
          await cache.put(abs(job.p), resp);
        }
      } catch (e) { failed++; }
      done++;
      report(done, jobs.length, failed);
    }
    const queue = jobs.slice();
    await Promise.all(Array.from({ length: PARALLEL }, async () => { while (queue.length) await one(queue.shift()); }));
    return { ok: failed === 0, failed, total: jobs.length };
  }

  // Kleine Anzeige unten links: Fortschritt, dann kurz „gespeichert“, dann weg
  function start() {
    const style = document.createElement('style');
    style.textContent = '#tdotOffline{position:fixed;left:2vh;bottom:2vh;z-index:20;display:flex;align-items:center;gap:1vw;' +
      'padding:1vh 1.4vw;border-radius:999px;background:rgba(11,12,15,0.82);color:#f6f3ee;font:600 1.7vh/1.2 "Segoe UI",system-ui,sans-serif;' +
      'transition:opacity .6s}#tdotOffline .b{width:9vw;height:.7vh;border-radius:.4vh;background:rgba(255,255,255,.2);overflow:hidden}' +
      '#tdotOffline .b i{display:block;height:100%;width:0;background:#c8d530;transition:width .3s}#tdotOffline.done{opacity:0}';
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.id = 'tdotOffline';
    box.innerHTML = '<span class="t">Filme werden gespeichert …</span><span class="b"><i></i></span>';
    document.body.appendChild(box);
    const t = box.querySelector('.t'), bar = box.querySelector('i');
    return preload((done, total) => {
      const p = total ? Math.round(100 * done / total) : 0;
      t.textContent = 'Filme werden für den Betrieb ohne Internet gespeichert … ' + p + ' %';
      bar.style.width = p + '%';
    }).then((r) => {
      if (!r.total) { box.remove(); return r; }
      box.querySelector('.b').remove();
      t.textContent = r.ok ? '✓ Alle Filme gespeichert – sie laufen jetzt auch ohne Internet'
        : 'Nicht alles gespeichert (' + r.failed + ' Dateien) – die Filme laufen trotzdem über das Netz';
      setTimeout(() => box.classList.add('done'), r.ok ? 6000 : 15000);
      return r;
    }).catch(() => { box.remove(); });
  }

  window.TDOT_OFFLINE = { preload, start };
})();
