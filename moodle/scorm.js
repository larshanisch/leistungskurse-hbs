/* SCORM 1.2 für das Moodle-Lernpaket „Kursplaner“ (Entscheidung 116).
   Läuft VOR dem Planer-Skript in index.html: schaltet den Moodle-Modus ein (window.TDOT_MOODLE),
   holt den gespeicherten Stand (cmi.suspend_data) zurück in die Adresse und speichert danach jede
   Änderung (window.TDOT_SAVE, aufgerufen von p2SyncUrl).

   Bericht für die Lehrkraft: acht feste Interaktionsplätze, Antworten selbsterklärend (Moodle
   exportiert standardmäßig nur die Antwortspalte). Die Plätze sind der Vertrag mit auswertung.html:

     0 kombination      „Leistungskurse: 1. LK Englisch, 2. LK Deutsch“
     1 pruefungsfaecher „Prüfungsfächer 3. Mathematik, 4. Geschichte, 5. Politik und Wirtschaft“
     2 belegen          „Belegen und Einbringen erfüllt“ / „… noch offen: …“
     3 noten            „Meine Noten: 24 von 40 Halbjahren eingetragen …“ / „Nur Erwartung …“
     4 zulassung        „Zulassung erreicht (LK 160/240, GK 250/360)“
     5 fhr              „Fachhochschulreife (schulischer Teil) erreicht, Note 2,8 (160/285)“
     6 abiturnote       „Abiturnote 2,6 (548/900, Prüfungen geschätzt)“
     7 stand            „Zuletzt bearbeitet am 30.10.2026, Schritt 4“

   Grundlage: moodle-scorm/scripts/scorm_api.js, mit diesen Abweichungen:
   - keine Bewertung (score) – ein Planer hat keine Note, eine 0 in der Bewertungsübersicht verwirrt;
   - Status bleibt immer „incomplete“: sonst bietet Moodle „Neuen Versuch beginnen“ an, und der
     leert den gespeicherten Plan;
   - cmi.core.exit = "suspend" nach JEDEM Speichern, pagehide mit persisted-Prüfung, Rückgaben geprüft. */
(function (W) {
  'use strict';
  W.TDOT_MOODLE = true;
  var LS = 'tdot-moodle-plan';
  var api = null, ok = false, closed = false, start = Date.now();
  var pending = null, timer = null, lastData = null, lastSig = null;
  var log = W.TDOT_SCORM_LOG = [];   // abgelehnte Schreibvorgänge, zum Nachsehen in der Konsole

  function findAPI(w) {
    var n = 0;
    while (w && !w.API && w.parent && w.parent !== w) { if (++n > 50) return null; w = w.parent; }
    return w && w.API ? w.API : null;
  }
  try { api = findAPI(W) || (W.opener ? findAPI(W.opener) : null); } catch (e) { api = null; }

  function call(fn, a, b) {
    if (!api || closed) return '';
    try { return String(b === undefined ? api[fn](a === undefined ? '' : a) : api[fn](a, b)); } catch (e) { return ''; }
  }
  function get(k) { return call('LMSGetValue', k); }
  function set(k, v) {
    var r = call('LMSSetValue', k, String(v));
    if (r !== 'true') log.push(k + ': abgelehnt (' + call('LMSGetLastError') + ')');
    return r === 'true';
  }
  function hhmmss(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60);
  }

  if (api) {
    ok = call('LMSInitialize', '') === 'true';
    if (ok && get('cmi.core.lesson_status') !== 'incomplete') { set('cmi.core.lesson_status', 'incomplete'); call('LMSCommit', ''); }
  }

  // --- Stand zurückholen, bevor der Planer die Adresse liest ---
  var saved = '';
  try { saved = ok ? get('cmi.suspend_data') : (W.localStorage.getItem(LS) || ''); } catch (e) { saved = ''; }
  try {
    var st = saved ? JSON.parse(saved) : null;
    var h = st && st.v === 1 && typeof st.h === 'string' ? st.h : '';
    if (/^#planer\//.test(h) && (!W.location.hash || W.location.hash === '#' || W.location.hash === '#planer')) {
      W.history.replaceState(null, '', W.location.pathname + W.location.search + h);
    }
    if (h) lastData = saved;
  } catch (e) { /* kaputter Stand: leer beginnen */ }
  if (!W.location.hash || W.location.hash === '#') W.history.replaceState(null, '', W.location.pathname + W.location.search + '#planer');

  // --- Bericht: feste Plätze, nie leer ---
  var SLOTS = [
    ['kombination', 'lk', 'noch keine Leistungskurse gewählt'],
    ['pruefungsfaecher', 'pf', 'Prüfungsfächer noch nicht gewählt'],
    ['belegen', 'bel', 'Belegen/Einbringen noch nicht prüfbar (Prüfungsfächer fehlen)'],
    ['noten', 'modus', 'Noten: Schritt 4 noch nicht geöffnet'],
    ['zulassung', 'zul', 'Zulassung: noch nicht berechnet'],
    ['fhr', 'fhr', 'Fachhochschulreife: noch nicht berechnet'],
    ['abiturnote', 'abi', 'Abiturnote: noch nicht berechnet']
  ];
  function items(hash) {
    var R = {};
    try { R = W.TDOT_REPORT ? W.TDOT_REPORT() : {}; } catch (e) { R = {}; }
    var out = SLOTS.map(function (s) {
      var v = R[s[1]] || s[2];
      if (s[1] === 'lk' && R.lk && v.indexOf('noch') !== 0) v = 'Leistungskurse: ' + v;
      return { id: s[0], response: v };
    });
    var d = new Date(), step = (/^#planer\/(\d)/.exec(hash) || [])[1] || '1';
    out.push({ id: 'stand', response: 'Zuletzt bearbeitet am ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ', Schritt ' + step });
    return out;
  }

  function flush() {
    clearTimeout(timer); timer = null;
    if (pending == null) return;
    var h = pending, data = JSON.stringify({ v: 1, h: h });
    if (!ok) { try { W.localStorage.setItem(LS, data); } catch (e) { /* ohne Speicher */ } pending = null; return; }
    if (closed) return;
    var good = true, list = items(h), sig = JSON.stringify(list);
    if (data !== lastData) good = set('cmi.suspend_data', data) && good;
    if (sig !== lastSig) {
      // Plätze dicht ab 0 und immer vollständig: _count beginnt nach jedem Laden wieder bei 0
      list.forEach(function (it, i) {
        var p = 'cmi.interactions.' + i + '.';
        good = set(p + 'id', it.id) && good;
        good = set(p + 'type', 'fill-in') && good;
        good = set(p + 'student_response', it.response.slice(0, 250)) && good;
        good = set(p + 'result', 'neutral') && good;
      });
    }
    set('cmi.core.session_time', hhmmss(Date.now() - start));
    good = set('cmi.core.exit', 'suspend') && good;   // „beim nächsten Öffnen fortsetzen“ – nach JEDEM Speichern
    good = call('LMSCommit', '') === 'true' && good;
    if (good) { lastData = data; lastSig = sig; pending = null; }   // sonst bleibt es offen und wird erneut versucht
  }

  // vom Planer bei jeder Änderung aufgerufen; Regler feuern oft, daher kurz sammeln
  W.TDOT_SAVE = function (h) { pending = h; clearTimeout(timer); timer = setTimeout(flush, 700); };
  W.TDOT_FLUSH = flush;

  var loggedOut = false;
  function leave(e) {
    if (loggedOut) return;
    flush();
    if (e && e.persisted) return;          // Seite kommt evtl. aus dem Zwischenspeicher zurück: angemeldet bleiben
    loggedOut = true;
    if (ok && !closed) { call('LMSFinish', ''); closed = true; }
  }
  W.addEventListener('pagehide', leave);
  W.addEventListener('beforeunload', leave);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  W.addEventListener('load', function () { if (W.TDOT_REPORT) W.TDOT_SAVE(W.location.hash); });   // erster Bericht gleich nach dem Öffnen
})(window);
