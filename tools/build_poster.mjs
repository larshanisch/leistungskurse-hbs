import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
// Aufruf: node tools/build_poster.mjs [fach …] [--no-pdf] [--png]
// Info-Poster A4 hoch je Leistungskurs (Entscheidung 115): poster/<fach>.html und poster/<fach>.pdf, dazu poster/planer.* zum Kurswahl-Planer.
// Alle Inhalte kommen aus content/<fach>.json (dieselben Tafeln wie im Film), die Partnerfächer aus der Kombinationstafel,
// geprüft gegen PAIRS in index.html. QR-Codes offline mit assets/js/qr.js, Icons aus assets/js/icons.js.
// --png legt zusätzlich ein Bildschirmfoto poster/<fach>.png zum Prüfen an (wird nicht veröffentlicht).

const BASE = 'https://larshanisch.github.io/leistungskurse-hbs/';
const PLANER = BASE + 'handy.html#planer';   // handy.html reicht den Hash an index.html?alle=1 weiter
const ALL = ['deutsch', 'englisch', 'kunst', 'powi', 'geschichte', 'mathematik', 'biologie', 'chemie', 'planer'];
const FACH_ID = { mathematik: 'mathe' };   // Film-Id → Fach-Id (wie SUBJ.film in index.html)
const NAMES = { englisch: 'Englisch', deutsch: 'Deutsch', kunst: 'Kunst', powi: 'Politik und Wirtschaft', geschichte: 'Geschichte',
  biologie: 'Biologie', chemie: 'Chemie', mathe: 'Mathematik' };
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = path.resolve(process.env.POSTER_PROFILE || '.build_cache/poster_profile');

const args = process.argv.slice(2);
const films = args.filter((a) => !a.startsWith('--'));
const todo = films.length ? films : ALL;
const makePdf = !args.includes('--no-pdf'), makePng = args.includes('--png');

// Bausteine aus dem Browser-Code im Node-Kontext laden
const win = {};
vm.runInNewContext(fs.readFileSync('assets/js/qr.js', 'utf8'), { window: win, TextEncoder });
vm.runInNewContext(fs.readFileSync('assets/js/icons.js', 'utf8'), { window: win, TextEncoder });

// Startseiten-Text und Partner aus index.html (nur lesen)
const idx = fs.readFileSync('index.html', 'utf8');
const PAIRS = eval('(' + idx.match(/var PAIRS = (\{[\s\S]*?\});/)[1] + ')');
const SUBJ = eval('(' + idx.match(/var SUBJ = (\{[\s\S]*?\n {4}\});/)[1] + ')');
const partners = (s) => Object.keys(NAMES).filter((o) => o !== s && ((PAIRS[s] || []).includes(o) || (PAIRS[o] || []).includes(s)));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (id) => win.fachIcon(id);
const POSTER = JSON.parse(fs.readFileSync('content/poster.json', 'utf8'));
const pick = (scenes, test) => { for (const s of scenes) { const r = test(s); if (r) return r; } return null; };

function data(film) {
  const c = JSON.parse(fs.readFileSync('content/' + film + '.json', 'utf8'));
  const sc = c.scenes, id = FACH_ID[film] || film;
  const rahmen = pick(sc, (s) => s.chapter === 'Der Rahmen' && s.panel);
  const combo = pick(sc, (s) => s.panel && s.panel.type === 'combo' && s.panel);
  const klausur = pick(sc, (s) => s.panel && s.panel.type === 'stats' && s.panel.items.some((i) => /Klausuren pro Halbjahr/.test(i.label)) && s.panel);
  const abiS = sc.find((s) => s.corner === 'Stand Abitur 2028' && s.panel);
  for (const [k, v] of Object.entries({ rahmen, combo, klausur, abiS }))
    if (!v) throw new Error(film + ': ' + k + ' fehlt in content');
  const ok = combo.items.find((i) => i.ok) || { with: [] }, no = combo.items.find((i) => i.ok === false) || { with: [] };
  const p = partners(id);
  if ([...ok.with].sort().join() !== [...p].sort().join()) throw new Error(film + ': Kombinationstafel ≠ PAIRS (' + p + ')');
  // Themen im Wortlaut des Erlasses und die eine Klausurersatzleistung stehen in content/poster.json (Entscheidung 125)
  const P = POSTER[film];
  if (P.themen.reduce((n, t) => n + (film === 'englisch' ? 1 : t.felder.length), 0) !== P.anzahl) throw new Error(film + ': Zahl der Themenfelder ≠ ' + P.anzahl);
  const std = rahmen.items.find((i) => /Wochenstunden/.test(i.label));
  // statt der Ersatz-Zeilen des Films: eine Zeile „nur eine einzige“ direkt hinter der Klausurzahl
  // ohne die Vergleiche mit anderen Fächern: ohne den gesprochenen Text unklar (Nutzer 02.11.2026)
  const rest = klausur.items.filter((i) => i.value !== '↔' && !/Kommunikationsprüfung|andere Fächer: GK|Deutsch und Mathematik: auch/.test(i.label));
  const ersatz = { value: '1×', label: 'von Q1 bis Q4 nur eine einzige Klausurersatzleistung', sub: P.ersatz || POSTER.ersatz };
  return { film, id, c, name: NAMES[id], what: SUBJ[id].what, std, themen: P.themen, ok: ok.with, no: no.with,
    note: (combo.items.find((i) => i.note) || {}).note, klausur: [rest[0], ersatz, ...rest.slice(1)], klausurNotes: P.ersatz ? [] : klausur.notes || [],
    abi: abiS.panel.items, abiNotes: abiS.panel.notes || [], abiText: P.abitur, mitbringen: P.mitbringen };
}

const CSS = `
@font-face { font-family: "Outfit"; font-weight: 600; src: url("../assets/fonts/outfit-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Outfit"; font-weight: 700; src: url("../assets/fonts/outfit-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "Source Sans 3"; font-weight: 400; src: url("../assets/fonts/source-sans-3-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "Source Sans 3"; font-weight: 600; src: url("../assets/fonts/source-sans-3-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Source Sans 3"; font-weight: 700; src: url("../assets/fonts/source-sans-3-latin-700-normal.woff2") format("woff2"); }
:root { --ink: #2e2e2e; --soft: #5a5f55; --line: #e4e8dc; --accent: #c8d530; --accent-dark: #6b7414; --head: #1a1a1a;
  --pale: #f8fae6; --feld-line: #e2e7b8; --on-accent: #1a1a1a; --gruen: #c8d530; --gruen-pale: #f8fae6; --no: #c0392b; --sans: "Source Sans 3", "Segoe UI", sans-serif; --display: "Outfit", "Segoe UI", sans-serif; }
[data-feld="1"] { --accent: #c62f2f; --on-accent: #ffffff; --accent-dark: #9c2222; --pale: #fbeaea; --feld-line: #f0c9c9; }
[data-feld="2"] { --accent: #e0a100; --on-accent: #1a1a1a; --accent-dark: #7f5a00; --pale: #fdf5df; --feld-line: #f0dfa8; }
[data-feld="3"] { --accent: #1f6fb2; --on-accent: #ffffff; --accent-dark: #174f80; --pale: #e8f1f9; --feld-line: #c7dcef; }
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
html { background: #e9e7e2; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: var(--sans); color: var(--ink); font-size: 10.5pt; line-height: 1.3; }
.sheet { width: 210mm; height: 297mm; margin: 0 auto; padding: 9mm 12mm 8mm; background: #fff; overflow: hidden;
  display: flex; flex-direction: column; justify-content: space-between; gap: 2.7mm; position: relative; }
@media screen and (min-width: 820px) { .sheet { margin: 10mm auto; box-shadow: 0 4px 24px rgba(0,0,0,0.15); } }
@media print { html { background: #fff; } }
h1, h2, h3 { font-family: var(--display); color: var(--head); margin: 0; letter-spacing: -0.01em; }
.top { display: flex; align-items: center; justify-content: space-between; border-bottom: 0.3mm solid var(--line); padding-bottom: 3mm; }
.top img { height: 15mm; }
.top p { margin: 0; text-align: right; font-size: 9.5pt; color: var(--accent-dark); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; line-height: 1.5; }
.title { display: flex; align-items: center; gap: 5mm; }
.title .tt { flex: 1; }
.title .logo { height: 16mm; align-self: flex-start; }
.title .ic { flex: none; width: 17mm; height: 17mm; border-radius: 50%; background: var(--accent); color: var(--on-accent); display: grid; place-items: center; }
.title .ic svg { width: 11mm; height: 11mm; }
.title .kick { margin: 0; font-family: var(--display); font-weight: 600; font-size: 13pt; color: var(--accent-dark); }
.title h1 { font-size: 31pt; line-height: 1.02; font-weight: 700; }
.title h1.long { font-size: 27pt; }
.title h1::after { content: ""; display: block; width: 18mm; height: 1.1mm; background: var(--gruen); margin-top: 1.6mm; }
.what { margin: 1.5mm 0 0; font-size: 11pt; color: var(--soft); text-wrap: balance; }
/* Rahmen des Kurses als Zahlenleiste (ohne Filmbild, Nutzer 30.10.2026), hell wie hell.css (Nutzer 31.10.2026) */
.stats { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) max-content; gap: 3mm; }
.stat { background: #fff; border: 0.3mm solid var(--line); border-radius: 2.5mm; padding: 2mm 3.4mm; }
.stat.rat { position: relative; background: var(--gruen); border: 0.3mm solid var(--gruen); padding: 2mm 3.5mm 2mm 7mm; }
/* Pfeil von der Vorgabe auf die Empfehlung (Nutzer 02.11.2026) */
.stat.rat .pfeil { position: absolute; left: -5.2mm; top: 50%; width: 8.5mm; height: 8.5mm; margin-top: -4.25mm; padding: 1.5mm; background: var(--accent); color: var(--on-accent); border: 0.5mm solid #fff; border-radius: 50%; }
.stat.rat b { font-size: 18pt; color: var(--head); }
.stat.rat span { font-size: 10pt; color: var(--head); }
.stat.rat span i { color: var(--head); font-size: 8.8pt; }
.stat b { display: block; font-family: var(--display); font-size: 18pt; color: var(--head); line-height: 1.05; white-space: nowrap; }
.stat b small { font-size: 10pt; font-weight: 600; margin-right: 1mm; }
.stat span { display: block; margin-top: 0.6mm; font-size: 10pt; font-weight: 700; color: var(--head); line-height: 1.15; }
.stat span i { display: block; font-style: normal; font-weight: 400; color: var(--soft); font-size: 8.8pt; margin-top: 0.3mm; }
h2 { font-size: 12.5pt; font-weight: 700; margin-bottom: 1.4mm; display: flex; align-items: center; gap: 2mm; }
h2::before { content: ""; flex: none; width: 1.3mm; height: 4.2mm; background: var(--gruen); border-radius: 0.5mm; }
.noh::before { background: var(--no); }
h2 .tag, h3 .tag { font-family: var(--sans); font-size: 8pt; font-weight: 400; color: var(--soft); letter-spacing: 0; }
.q { display: grid; gap: 0; border-top: 0.6mm solid var(--gruen); }
.q > div { display: grid; grid-template-columns: 9mm 1fr; gap: 2mm; align-items: start; border-bottom: 0.25mm solid var(--line); padding: 1.3mm 0; }
.q > div > b { font-family: var(--display); font-size: 9.5pt; background: var(--accent); color: var(--on-accent); border-radius: 1.5mm; text-align: center; padding: 0.15mm 0; }
.q h3 { font-family: var(--sans); font-size: 10pt; font-weight: 700; line-height: 1.2; letter-spacing: 0; }
.q p { margin: 0.3mm 0 0; font-size: 8.8pt; line-height: 1.22; color: var(--ink); }
.q p b { font-weight: 600; color: var(--accent-dark); }
.mid { display: grid; grid-template-columns: 1fr 34mm 1fr; gap: 3.5mm; align-items: stretch; }
.mid .qrc { display: flex; align-items: center; justify-content: center; }
.mid .qrc .qr b { white-space: nowrap; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.box { border: 0.4mm solid var(--gruen); border-radius: 3mm; padding: 2.4mm 3.2mm; }
.rows { margin: 0; padding: 0; list-style: none; display: grid; gap: 1.1mm; }
.rows li { display: grid; grid-template-columns: 11mm 1fr; gap: 1.5mm; align-items: baseline; }
.rows li > b { font-family: var(--display); font-size: 11.5pt; color: var(--accent-dark); white-space: nowrap; }
.rows li span { font-size: 9.5pt; line-height: 1.2; }
.rows li span i { display: block; font-style: normal; color: var(--soft); font-size: 8.5pt; }
.notes { margin: 1.6mm 0 0; padding: 1.4mm 0 0; border-top: 0.25mm dashed var(--line); list-style: none; font-size: 8.5pt; color: var(--soft); display: grid; gap: 0.6mm; }
.combo { display: flex; flex-wrap: wrap; align-items: center; gap: 1.5mm 1.6mm; }
.ch { margin: 0 0 1mm; font-weight: 700; font-size: 9.5pt; }
.combo + .ch { margin-top: 1.8mm; }
.ch.ok { color: var(--accent-dark); }
.ch.no { color: var(--no); }
.note { margin: 2mm 0 0; font-size: 9.5pt; color: var(--soft); }
.mit { padding: 2.6mm 4mm 3mm; }
.mit .check { grid-template-columns: 1fr 1fr; gap: 2mm 6mm; font-size: 9.8pt; line-height: 1.25; }
.mit .check li b { display: block; font-family: var(--display); font-weight: 600; font-size: 11pt; color: var(--head); margin-bottom: 0.3mm; }


.abi .rows li { grid-template-columns: 15mm 1fr; }   /* „3 aus 4“ braucht mehr Platz als die Zahlen bei den Klausuren */
.abi p { margin: 0 0 1mm; font-size: 8.6pt; line-height: 1.26; color: var(--ink); }
.abi p b { font-family: var(--display); color: var(--head); font-size: 9pt; }
.chip { display: inline-flex; align-items: center; gap: 1mm; border-radius: 2mm; padding: 0.6mm 1.8mm 0.6mm 1.2mm; font-size: 9pt; font-weight: 600; }
.chip svg { width: 4.4mm; height: 4.4mm; }
.ok .chip { background: var(--gruen); border: 0.3mm solid var(--gruen); color: var(--head); }
.no .chip { background: #fff; border: 0.3mm solid var(--no); color: #8e2a1f; }   /* „nicht kombinierbar“ rot (Nutzer 31.10.2026) */
table { width: 100%; border-collapse: collapse; font-size: 9pt; line-height: 1.2; }
th { text-align: left; font-family: var(--display); font-weight: 600; font-size: 9pt; color: var(--soft); padding: 0 1.5mm 0.8mm; }
td { padding: 1mm 1.5mm; border-top: 0.25mm solid var(--line); vertical-align: top; }
td:first-child { font-weight: 700; color: var(--head); width: 20%; }
td:nth-child(2) { width: 34%; }
td:last-child { font-weight: 600; color: var(--head); }
.check { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.6mm; font-size: 9.5pt; }
.check li { position: relative; padding-left: 5mm; }
.check li::before { content: "✓"; position: absolute; left: 0; color: var(--accent); font-weight: 700; }
.kombi.bottom { display: block; }
.kombi.bottom.two { display: grid; grid-template-columns: max-content 1fr; gap: 8mm; }
.noh { color: var(--no); }
.bottom { display: grid; grid-template-columns: 1fr auto; gap: 6mm; align-items: start; }
.qrs { display: flex; gap: 4mm; }
.qr { width: 31mm; text-align: center; }
.qr svg { width: 31mm; height: 31mm; display: block; }
.qr b { display: block; font-family: var(--display); font-size: 10pt; white-space: nowrap; color: var(--head); margin-top: 1.2mm; }
.qr span { display: block; font-size: 7.5pt; color: var(--soft); word-break: break-all; line-height: 1.15; }
.foot { border-top: 1mm solid var(--gruen); padding-top: 1.6mm; font-size: 7.5pt; color: var(--soft); display: flex; justify-content: space-between; gap: 4mm; }
`;

function stat(it) {
  const pre = it.prefix ? '<small>' + esc(it.prefix) + '</small>' : '';
  return '<div class="stat"><b>' + pre + esc(it.value) + '</b><span>' + esc(it.label) + (it.sub ? '<i>' + esc(it.sub) + '</i>' : '') + '</span></div>';
}
// Rechtliche Vorgabe groß, Empfehlung der HBS noch größer und farbig gefüllt (Nutzer 02.11.2026, OAVO § 13 Abs. 2, Entscheidung 26)
const rat = '<div class="stat"><b><small>mind.</small>5 Punkte</b><span>Rechtliche Vorgabe<i>am Ende der Einführungsphase</i></span></div>' +
  '<div class="stat rat"><svg class="pfeil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15"/><path d="M13 6l6 6-6 6"/></svg><b>besser deutlich mehr</b><span>als 5 Punkte – Empfehlung der HBS<i>denn die Anforderungen im Leistungskurs steigen</i></span></div>';
const row = (it) => '<li><b>' + esc(it.value) + '</b><span>' + esc(it.label) + (it.sub ? '<i>' + esc(it.sub) + '</i>' : '') + '</span></li>';
const notes = (ns) => ns.length ? '<ul class="notes">' + ns.map((n) => '<li>' + esc(n.text) + '</li>').join('') + '</ul>' : '';
const chip = (id) => '<span class="chip">' + icon(id) + esc(NAMES[id]) + '</span>';
const qr = (url, label) => '<div class="qr">' + win.qrSvg(url, 300) + '<b>' + esc(label) + '</b></div>';

const MEASURE = `<script>
  // Prüfung für build_poster.mjs: passt alles aufs Blatt? (Abstand zwischen Inhalt und Fußzeile, Überläufe in Zeilen)
  document.fonts.ready.then(function () {
    var sheet = document.querySelector('.sheet'), foot = document.querySelector('.foot'), r = sheet.getBoundingClientRect(), bad = [];
    var fr = foot.getBoundingClientRect();
    document.querySelectorAll('.sheet *').forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') bad.push(el.className || el.tagName);
      if (b.width && (b.right > r.right + 0.5 || b.bottom > r.bottom + 0.5)) bad.push('außen:' + (el.className || el.tagName));
    });
    var bot = document.querySelector('.bottom'), pre = bot.previousElementSibling.getBoundingClientRect();
    document.body.setAttribute('data-fit', JSON.stringify({ luftMm: +((bot.getBoundingClientRect().top - pre.bottom) * 25.4 / 96).toFixed(1),
      fussUnten: +((r.bottom - fr.bottom) * 25.4 / 96).toFixed(1), fonts: document.fonts.check('12px "Source Sans 3"') && document.fonts.check('600 12px Outfit'), bad: bad }));
  });
</script>`;

function html(d) {
  const filmUrl = BASE + 'film.html?fach=' + d.film;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Poster · ${esc(d.c.title)}</title>
<!-- erzeugt von tools/build_poster.mjs aus content/${d.film}.json – nicht von Hand ändern -->
<style>${CSS}</style>
</head>
<body>
<div class="sheet" data-feld="${SUBJ[d.id].field}">
  <div class="title">
    <div class="ic">${icon(d.id)}</div>
    <div class="tt">
      <p class="kick">Leistungskurs · Aufgabenfeld ${[, 'I', 'II', 'III'][SUBJ[d.id].field]}</p>
      <h1${d.name.length > 14 ? ' class="long"' : ''}>${esc(d.name)}</h1>
      <p class="what">${esc(d.what)}</p>
    </div>
    <img class="logo" src="../assets/img/logo_hbs_frei.png" alt="Heinrich-Böll-Schule Hattersheim">
  </div>
  <div class="stats">${rat}${stat(d.std)}</div>
  <section>
    <h2>Themen in Q1 bis Q4 <span class="tag">verbindliche Themenfelder nach Abiturerlass · Stand Abitur 2028</span></h2>
    <div class="q">${d.themen.map((t) => '<div><b>' + esc(t.q) + '</b><div><h3>' + esc(t.titel) + '</h3><p>' + t.felder.map((f) => esc(f).replace(/^(Q\d\.\d)/, '<b>$1</b>')).join(' · ') + '</p></div></div>').join('')}</div>
  </section>
  <section class="box mit"><h2>Was du mitbringen solltest</h2><ul class="check">${d.mitbringen.map((m) => '<li><b>' + esc(m[0]) + '</b>' + esc(m[1]) + '</li>').join('')}</ul></section>
  <div class="mid">
    <section class="box"><h2>Klausuren</h2><ul class="rows">${d.klausur.map(row).join('')}</ul>${notes(d.klausurNotes)}</section>
    <div class="qrc">${qr(filmUrl, 'Film ansehen')}</div>
    <section class="box abi"><h2>Abiturprüfung <span class="tag">Stand Abitur 2028</span></h2>
      ${d.abiText ? d.abiText.map((l) => '<p>' + l + '</p>').join('') : '<ul class="rows">' + d.abi.map(row).join('') + '</ul>' + notes(d.abiNotes)}</section>
  </div>
  <div class="bottom kombi${d.no.length ? ' two' : ''}">
    <section><h2>Kombinierbar mit</h2><div class="combo ok">${d.ok.map(chip).join('')}</div>${d.no.length ? '' : '<p class="note">' + esc(d.note) + '</p>'}</section>
    ${d.no.length ? '<section><h2 class="noh">Nicht kombinierbar mit</h2><div class="combo no">' + d.no.map(chip).join('') + '</div></section>' : ''}
  </div>
  <div class="foot"><span>Heinrich-Böll-Schule Hattersheim · Tag der offenen Tür</span><span>Stand Abitur 2028 · ohne Gewähr</span></div>
</div>
${MEASURE}
</body>
</html>
`;
}

// Poster zum Kurswahl-Planer (Nutzer 31.10.2026): QR-Code und Erklärung in drei Schritten. Texte nach der Oberfläche in index.html
// (Schrittnamen, Knöpfe „Vorschlag einsetzen“, „Pflicht automatisch auffüllen“, „Für später merken“, Hinweis „Ohne Gewähr“).
const PCSS = `
.lead { margin: 0; font-size: 12pt; line-height: 1.4; color: var(--ink); }
.hero { display: grid; grid-template-columns: 1fr auto; gap: 7mm; align-items: center; background: var(--pale); border: 0.3mm solid #e2e7b8; border-radius: 4mm; padding: 4mm 6mm; }
.hero .qr { width: 47mm; }
.hero .qr svg { width: 47mm; height: 47mm; background: #fff; }
.hero .qr b { font-size: 13pt; margin-top: 2mm; }
.hero ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 2.4mm; font-size: 11.5pt; }
.hero ol li { display: flex; gap: 2.5mm; align-items: baseline; }
.hero ol i { font-style: normal; flex: none; width: 6.5mm; height: 6.5mm; border-radius: 50%; background: var(--gruen); color: var(--head); font-family: var(--display); font-weight: 700; font-size: 10pt; display: grid; place-items: center; }
.steps { display: grid; gap: 3.2mm; }
.step { display: grid; grid-template-columns: 13mm 1fr; gap: 4mm; border: 0.3mm solid var(--line); border-radius: 3mm; padding: 2.6mm 4mm; }
.step h2::before { display: none; }
.step > i { font-style: normal; width: 13mm; height: 13mm; border-radius: 50%; background: var(--gruen); color: var(--head); font-family: var(--display); font-weight: 700; font-size: 18pt; display: grid; place-items: center; }
.step h2 { margin-bottom: 1mm; }
.step p { margin: 0 0 1.2mm; font-size: 10.5pt; line-height: 1.35; }
.step p:last-child { margin-bottom: 0; }
.step small { font-size: 9pt; color: var(--soft); }
.pill { display: inline-block; border-radius: 1.5mm; padding: 0 1.6mm; font-weight: 700; font-size: 9.5pt; }
.pill.g { background: var(--accent); color: var(--head); }
.pill.b { background: #8db8ea; color: #10325c; }
.pill.k { background: #fff; border: 0.3mm solid #1a1a1a; }
.cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.cols2 p { margin: 0; font-size: 10pt; line-height: 1.35; }
.fine2 { font-size: 9pt; color: var(--soft); line-height: 1.35; margin: 0; }
`;
function planerHtml() {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Poster · Kurswahl-Planer</title>
<!-- erzeugt von tools/build_poster.mjs – nicht von Hand ändern -->
<style>${CSS}${PCSS}</style>
</head>
<body>
<div class="sheet">
  <div class="title">
    <div class="tt">
      <p class="kick">Gymnasiale Oberstufe · Leistungskurse</p>
      <h1>Kurswahl durchspielen</h1>
      <p class="what">Der Kurswahl-Planer der HBS auf deinem Handy</p>
    </div>
    <img class="logo" src="../assets/img/logo_hbs_frei.png" alt="Heinrich-Böll-Schule Hattersheim">
  </div>
  <p class="lead">Welche zwei Leistungskurse passen zusammen? Welche Fächer kommen als Prüfungsfächer dazu? Und welche Kurse musst du belegen und einbringen? Mit dem Planer probierst du deine Kurswahl in drei Schritten aus.</p>
  <div class="hero">
    <div>
      <ol>
        <li><i>1</i><span>QR-Code mit der Kamera deines Handys scannen.</span></li>
        <li><i>2</i><span>Der Planer öffnet sich im Browser – ohne App und ohne Anmeldung.</span></li>
        <li><i>3</i><span>Schritt für Schritt wählen. Oben siehst du jederzeit, was noch fehlt.</span></li>
      </ol>
    </div>
    ${qr(PLANER, 'Planer öffnen')}
  </div>
  <div class="steps">
    <section class="step"><i>1</i><div><h2>Leistungskurse</h2>
      <p>Tippe auf die Kombination, die dich interessiert. Du siehst nur Kombinationen, die es an der HBS gibt. Der Planer zeigt sie als <span class="pill g">1. Leistungskurs</span> und <span class="pill b">2. Leistungskurs</span>. Einer der beiden Leistungskurse ist dein Tutorium. Welcher das wird, legt die Oberstufenleitung fest.</p>
      <p>Der Planer zeigt sofort, welche Fächer auf die Plätze 3 bis 5 kommen müssen und ob es Einschränkungen gibt.</p></div></section>
    <section class="step"><i>2</i><div><h2>Prüfungsfächer</h2>
      <p>Deine beiden Leistungskurse sind die Prüfungsfächer 1 und 2. Tippe auf Platz 3, 4 oder 5 und wähle ein Fach: Platz 3 wird schriftlich geprüft, Platz 4 mündlich, Platz 5 mündlich oder als Präsentation.</p>
      <p>Fächer, die auf einem Platz nicht möglich sind, erscheinen grau; antippen zeigt den Grund. <span class="pill k">Vorschlag einsetzen</span> füllt die freien Plätze mit einer gültigen Wahl.</p></div></section>
    <section class="step"><i>3</i><div><h2>Kurse</h2>
      <p>Stelle für jedes Fach ein, wie viele Kurse du <b>belegst</b> und wie viele du <b>einbringst</b>. Was ohnehin Pflicht ist, steht schon da. Eine Prüfliste zeigt, was noch fehlt; <span class="pill k">Pflicht automatisch auffüllen</span> ergänzt den Rest.</p>
      <p><small>Belegen heißt: einen Kurs ein Halbjahr lang besuchen. Einbringen heißt: Die Note zählt fürs Abitur – genau 32 Kurse, davon 8 Leistungskurse doppelt und 24 Grundkurse. Die LUSD berechnet automatisch die besten Kurse, die du einbringen kannst.</small></p></div></section>
  </div>
  <div class="cols2">
    <section><h2>Für später merken</h2>
      <p>Auf deinem Handy kannst du deinen Plan teilen, drucken oder auf dem Gerät merken. Gespeichert wird nur im Link bzw. auf diesem Gerät – nichts geht an die Schule oder ins Internet.</p></section>
    <section><h2>Ohne Gewähr</h2>
      <p>Dieser Planer ist eine Orientierungshilfe und kann Fehler enthalten. Es gelten immer die aktuellen amtlichen Vorgaben; im Zweifel berät dich deine Tutorin oder dein Tutor.</p></section>
  </div>
  <div class="bottom"><p class="fine2">Zu jedem Leistungskurs gibt es einen kurzen Film – den QR-Code dazu findest du auf dem Poster des Fachs.</p><div></div></div>
  <div class="foot"><span>Heinrich-Böll-Schule Hattersheim · Tag der offenen Tür</span><span>Grundlage: OAVO § 13, § 24, § 26 mit Anlage 7</span></div>
</div>
${MEASURE}
</body>
</html>
`;
}

// Windows sperrt die Datei gelegentlich kurz (errno -4094, zweimal gemessen 02.11.2026): bis zu fünfmal im Abstand von 2 s versuchen
function writeRetry(file, text) {
  for (let i = 0; ; i++) {
    try { fs.writeFileSync(file, text); return; }
    catch (e) { if (i >= 4) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000); }
  }
}
fs.mkdirSync('poster', { recursive: true });
for (const film of todo) {
  const file = path.resolve('poster', film + '.html');
  writeRetry(file, film === 'planer' ? planerHtml() : html(data(film)));
  const url = 'file:///' + file.replace(/\\/g, '/');
  const common = ['--headless', '--disable-gpu', '--no-first-run', '--user-data-dir=' + PROFILE, '--virtual-time-budget=5000'];
  if (makePdf) execFileSync(CHROME, [...common, '--no-pdf-header-footer', '--print-to-pdf=' + path.resolve('poster', film + '.pdf'), url], { stdio: 'ignore' });
  if (makePng) execFileSync(CHROME, [...common, '--hide-scrollbars', '--force-device-scale-factor=2', '--window-size=794,1123',
    '--screenshot=' + path.resolve('poster', film + '.png'), url + '?static=1'], { stdio: 'ignore' });
  let pages = '';
  if (makePdf) pages = ' · ' + (fs.readFileSync(path.resolve('poster', film + '.pdf'), 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length + ' Seite(n)';
  const dom = execFileSync(CHROME, [...common, '--window-size=794,1123', '--dump-dom', url], { encoding: 'utf8' });
  const fit = JSON.parse((dom.match(/data-fit="([^"]*)"/) || [, 'null'])[1].replace(/&quot;/g, '"'));
  console.log(film + ': poster/' + film + '.html' + (makePdf ? ' + .pdf' : '') + pages + ' · Messung ' + JSON.stringify(fit));
}
fs.rmSync(PROFILE, { recursive: true, force: true });   // Browserprofil nicht liegen lassen
