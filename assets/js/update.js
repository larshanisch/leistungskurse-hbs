// Merkt, wenn auf dem Server eine neuere Fassung liegt als die angezeigte Seite (Entscheidung 92).
// Ursache für alte Seiten: Der Speicher (sw.js) zeigt nach 4 s ohne Antwort die gespeicherte Seite, und ein
// neuer Speicher übernimmt erst nach dem ersten Laden. Darum vergleicht die Seite selbst: GitHub Pages stempelt
// bei jedem Veröffentlichen alle Dateien mit derselben Zeit (Last-Modified, gemessen 29.10.2026); die angezeigte
// Seite kennt ihren Stempel als document.lastModified – auch wenn sie aus dem Speicher kam.
// Startseite und Tafel zeigen dann einen Hinweis zum Antippen; <script … data-auto> (Dauerbetrieb) lädt selbst neu.
(function () {
  'use strict';
  if (location.protocol === 'file:' || !window.fetch) return;
  var AUTO = !!(document.currentScript && document.currentScript.hasAttribute('data-auto'));
  var shown = new Date(document.lastModified).getTime();
  var EVERY = 5 * 60 * 1000;   // Tafeln bleiben den ganzen Tag offen: alle 5 Minuten nachsehen

  function check() {
    // HEAD geht am Speicher vorbei (sw.js bearbeitet nur GET), no-store am Browser-Zwischenspeicher
    fetch(location.pathname, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      var lm = r.ok && r.headers.get('Last-Modified');
      if (!lm || !shown) return;
      if (new Date(lm).getTime() > shown + 1000) newer();
    }).catch(function () { /* kein Netz: dann gilt die gespeicherte Fassung */ });
  }

  function newer() {
    if (AUTO) {
      // höchstens alle 10 Minuten: kommt bei langsamem Netz wieder die gespeicherte Seite, keine Neulade-Schleife
      var KEY = 'tdot-update-reload', last = 0;
      try { last = Number(sessionStorage.getItem(KEY)) || 0; } catch (e) { /* ohne Speicher */ }
      if (Date.now() - last < 10 * 60 * 1000) return;
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ohne Speicher */ }
      location.reload(); return;
    }
    if (document.getElementById('tdotUpdate')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'tdotUpdate';
    b.textContent = 'Neue Fassung verfügbar – tippen zum Aktualisieren';
    b.style.cssText = 'position:fixed;z-index:50;top:14px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 32px);' +
      'padding:0.7em 1.3em;border-radius:999px;border:0;background:#c8d530;color:#16180a;font:700 16px/1.3 "Segoe UI",system-ui,sans-serif;' +
      'box-shadow:0 8px 30px rgba(0,0,0,0.45);cursor:pointer;';
    b.addEventListener('click', function () { location.reload(); });
    document.body.appendChild(b);
  }

  setTimeout(check, 3000);
  setInterval(check, EVERY);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
