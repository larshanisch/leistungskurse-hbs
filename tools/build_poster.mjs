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
const pick = (scenes, test) => { for (const s of scenes) { const r = test(s); if (r) return r; } return null; };

function data(film) {
  const c = JSON.parse(fs.readFileSync('content/' + film + '.json', 'utf8'));
  const sc = c.scenes, id = FACH_ID[film] || film;
  const rahmen = pick(sc, (s) => s.chapter === 'Der Rahmen' && s.panel);
  const timeline = pick(sc, (s) => s.band && s.band.type === 'timeline' && s.band);
  const combo = pick(sc, (s) => s.panel && s.panel.type === 'combo' && s.panel);
  const klausur = pick(sc, (s) => s.panel && s.panel.type === 'stats' && s.panel.items.some((i) => /Klausuren pro Halbjahr/.test(i.label)) && s.panel);
  const abiS = sc.find((s) => s.corner === 'Stand Abitur 2028' && s.panel);
  const compare = pick(sc, (s) => s.panel && s.panel.type === 'compare' && s.panel);
  const mitbringen = pick(sc, (s) => s.panel && s.panel.type === 'list' && s.panel.check && s.panel);
  for (const [k, v] of Object.entries({ rahmen, timeline, combo, klausur, abiS, compare, mitbringen }))
    if (!v) throw new Error(film + ': ' + k + ' fehlt in content');
  const ok = combo.items.find((i) => i.ok) || { with: [] }, no = combo.items.find((i) => i.ok === false) || { with: [] };
  const p = partners(id);
  if ([...ok.with].sort().join() !== [...p].sort().join()) throw new Error(film + ': Kombinationstafel ≠ PAIRS (' + p + ')');
  return { film, id, c, name: NAMES[id], what: SUBJ[id].what, rahmen: rahmen.items, timeline: timeline.items, ok: ok.with, no: no.with,
    note: (combo.items.find((i) => i.note) || {}).note, klausur: klausur.items, klausurNotes: klausur.notes || [],
    abi: abiS.panel.items, abiNotes: abiS.panel.notes || [], compare, mitbringen: mitbringen.items };
}

const CSS = `
@font-face { font-family: "Outfit"; font-weight: 600; src: url("../assets/fonts/outfit-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Outfit"; font-weight: 700; src: url("../assets/fonts/outfit-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "Source Sans 3"; font-weight: 400; src: url("../assets/fonts/source-sans-3-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "Source Sans 3"; font-weight: 600; src: url("../assets/fonts/source-sans-3-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Source Sans 3"; font-weight: 700; src: url("../assets/fonts/source-sans-3-latin-700-normal.woff2") format("woff2"); }
:root { --ink: #2e2e2e; --soft: #5a5f55; --line: #e4e8dc; --accent: #c8d530; --accent-dark: #6b7414; --head: #1a1a1a;
  --pale: #f8fae6; --no: #c0392b; --sans: "Source Sans 3", "Segoe UI", sans-serif; --display: "Outfit", "Segoe UI", sans-serif; }
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
html { background: #e9e7e2; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: var(--sans); color: var(--ink); font-size: 10.5pt; line-height: 1.3; }
.sheet { width: 210mm; height: 297mm; margin: 0 auto; padding: 10mm 12mm 8mm; background: #fff; overflow: hidden;
  display: flex; flex-direction: column; justify-content: space-between; gap: 3.2mm; position: relative; }
@media screen and (min-width: 820px) { .sheet { margin: 10mm auto; box-shadow: 0 4px 24px rgba(0,0,0,0.15); } }
@media print { html { background: #fff; } }
h1, h2, h3 { font-family: var(--display); color: var(--head); margin: 0; letter-spacing: -0.01em; }
.top { display: flex; align-items: center; justify-content: space-between; border-bottom: 0.3mm solid var(--line); padding-bottom: 3mm; }
.top img { height: 15mm; }
.top p { margin: 0; text-align: right; font-size: 9.5pt; color: var(--accent-dark); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; line-height: 1.5; }
.title { display: flex; align-items: center; gap: 5mm; }
.title .tt { flex: 1; }
.title .logo { height: 16mm; align-self: flex-start; }
.title .ic { flex: none; width: 19mm; height: 19mm; border-radius: 50%; background: var(--accent); color: var(--head); display: grid; place-items: center; }
.title .ic svg { width: 13mm; height: 13mm; }
.title .kick { margin: 0; font-family: var(--display); font-weight: 600; font-size: 13pt; color: var(--accent-dark); }
.title h1 { font-size: 31pt; line-height: 1.02; font-weight: 700; }
.title h1.long { font-size: 27pt; }
.title h1::after { content: ""; display: block; width: 18mm; height: 1.2mm; background: var(--accent); margin-top: 1.6mm; }
.what { margin: 1.5mm 0 0; font-size: 11pt; color: var(--soft); }
/* Rahmen des Kurses als Zahlenleiste (ohne Filmbild, Nutzer 30.10.2026), hell wie hell.css (Nutzer 31.10.2026) */
.stats { display: flex; gap: 3mm; }
.stat { flex: 1 1 auto; background: #fff; border: 0.3mm solid var(--line); border-left: 1.4mm solid var(--accent); border-radius: 2.5mm; padding: 2.4mm 3.4mm; display: flex; align-items: center; gap: 2.4mm; }
.stat:first-child { flex-grow: 2; }
.stat b { font-family: var(--display); font-size: 22pt; color: var(--head); line-height: 1; white-space: nowrap; }
.stat b small { font-size: 10pt; font-weight: 600; margin-right: 0.8mm; }
.stat span { font-size: 10pt; line-height: 1.15; }
.stat span i { display: block; font-style: normal; color: var(--soft); font-size: 8.5pt; }
h2 { font-size: 12.5pt; font-weight: 700; margin-bottom: 1.4mm; display: flex; align-items: center; gap: 2mm; }
h2 .tag, h3 .tag { font-family: var(--sans); font-size: 7.5pt; font-weight: 700; color: var(--accent-dark); background: var(--pale); border: 0.25mm solid #e2e7b8; border-radius: 3mm; padding: 0.3mm 2mm; letter-spacing: 0.04em; }
.q { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm; }
.q div { background: var(--pale); border: 0.25mm solid #e2e7b8; border-radius: 2.5mm; padding: 1.6mm 2.4mm; }
.q b { display: inline-block; font-family: var(--display); font-size: 10pt; background: var(--accent); color: var(--head); border-radius: 1.5mm; padding: 0.2mm 1.8mm; margin-bottom: 1mm; }
.q p { margin: 0; font-size: 10pt; font-weight: 600; color: var(--head); line-height: 1.2; hyphens: manual; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.box { border: 0.3mm solid var(--line); border-radius: 3mm; padding: 2.4mm 3.2mm; }
.rows { margin: 0; padding: 0; list-style: none; display: grid; gap: 1.4mm; }
.rows li { display: grid; grid-template-columns: 13mm 1fr; gap: 2mm; align-items: baseline; }
.rows li > b { font-family: var(--display); font-size: 11.5pt; color: var(--accent-dark); text-align: right; white-space: nowrap; }
.rows li span { font-size: 9.5pt; line-height: 1.2; }
.rows li span i { display: block; font-style: normal; color: var(--soft); font-size: 8.5pt; }
.notes { margin: 1.6mm 0 0; padding: 1.4mm 0 0; border-top: 0.25mm dashed var(--line); list-style: none; font-size: 8.5pt; color: var(--soft); display: grid; gap: 0.6mm; }
.combo { display: flex; flex-wrap: wrap; align-items: center; gap: 1.5mm 1.6mm; }
.ch { margin: 0 0 1mm; font-weight: 700; font-size: 9.5pt; }
.combo + .ch { margin-top: 1.8mm; }
.ch.ok { color: var(--accent-dark); }
.ch.no { color: var(--no); }
.note { margin: 2mm 0 0; font-size: 9.5pt; color: var(--soft); }
.mit { background: var(--pale); border-color: #e2e7b8; }
.mit .check { font-size: 11.5pt; gap: 1.6mm; }
.abi { border-top: 0.3mm solid var(--line); padding-top: 2mm; }
.abi h3 { font-size: 10.5pt; font-weight: 700; display: flex; align-items: center; gap: 2mm; margin-bottom: 0.8mm; }
.abi p { margin: 0; font-size: 8.5pt; line-height: 1.35; color: var(--soft); }
.abi p b { font-family: var(--display); color: var(--head); font-size: 9.5pt; }
.chip { display: inline-flex; align-items: center; gap: 1mm; border-radius: 2mm; padding: 0.6mm 1.8mm 0.6mm 1.2mm; font-size: 9pt; font-weight: 600; }
.chip svg { width: 4.4mm; height: 4.4mm; }
.ok .chip { background: var(--pale); border: 0.3mm solid var(--accent); color: var(--head); }
.no .chip { background: #fdecea; border: 0.3mm solid var(--no); color: #8e2a1f; }   /* „geht nicht mit“ rot (Nutzer 31.10.2026) */
table { width: 100%; border-collapse: collapse; font-size: 9pt; line-height: 1.2; }
th { text-align: left; font-family: var(--display); font-weight: 600; font-size: 9pt; color: var(--soft); padding: 0 1.5mm 0.8mm; }
td { padding: 1mm 1.5mm; border-top: 0.25mm solid var(--line); vertical-align: top; }
td:first-child { font-weight: 700; color: var(--head); width: 20%; }
td:nth-child(2) { width: 34%; }
td:last-child { font-weight: 600; color: var(--head); }
.check { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.6mm; font-size: 9.5pt; }
.check li::before { content: "✓"; color: var(--accent-dark); font-weight: 700; margin-right: 1.8mm; }
.bottom { display: grid; grid-template-columns: 1fr auto; gap: 6mm; align-items: start; }
.qrs { display: flex; gap: 4mm; }
.qr { width: 31mm; text-align: center; }
.qr svg { width: 31mm; height: 31mm; display: block; border: 0.3mm solid var(--line); border-radius: 2mm; }
.qr b { display: block; font-family: var(--display); font-size: 10pt; white-space: nowrap; color: var(--head); margin-top: 1.2mm; }
.qr span { display: block; font-size: 7.5pt; color: var(--soft); word-break: break-all; line-height: 1.15; }
.foot { border-top: 1.2mm solid var(--accent); padding-top: 1.8mm; font-size: 7.5pt; color: var(--soft); display: flex; justify-content: space-between; gap: 4mm; }
`;

function stat(it) {
  const pre = it.prefix ? '<small>' + esc(it.prefix) + '</small>' : '';
  return '<div class="stat"><b>' + pre + esc(it.value) + '</b><span>' + esc(it.label) + (it.sub ? '<i>' + esc(it.sub) + '</i>' : '') + '</span></div>';
}
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
<div class="sheet">
  <div class="title">
    <div class="ic">${icon(d.id)}</div>
    <div class="tt">
      <p class="kick">Leistungskurs · Gymnasiale Oberstufe</p>
      <h1${d.name.length > 14 ? ' class="long"' : ''}>${esc(d.name)}</h1>
      <p class="what">${esc(d.what)}</p>
    </div>
    <img class="logo" src="../assets/img/logo_hbs_frei.png" alt="Heinrich-Böll-Schule Hattersheim">
  </div>
  <div class="stats">${d.rahmen.map(stat).join('')}</div>
  <section>
    <h2>Themen in Q1 bis Q4</h2>
    <div class="q">${d.timeline.map((t) => '<div><b>' + esc(t.label) + '</b><p>' + esc(t.text) + '</p></div>').join('')}</div>
  </section>
  <section><h2>Grundkurs und Leistungskurs</h2>
    <table><tr><th></th>${d.compare.head.map((h) => '<th>' + esc(h) + '</th>').join('')}</tr>
    ${d.compare.items.map((r) => '<tr><td>' + esc(r.label) + '</td><td>' + esc(r.a) + '</td><td>' + esc(r.b) + '</td></tr>').join('')}</table></section>
  <div class="cols">
    <section class="box mit"><h2>Was du mitbringen solltest</h2><ul class="check">${d.mitbringen.map((m) => '<li>' + esc(m.text) + '</li>').join('')}</ul></section>
    <section class="box"><h2>Klausuren</h2><ul class="rows">${d.klausur.map(row).join('')}</ul>${notes(d.klausurNotes)}</section>
  </div>
  <section class="abi"><h3>Abiturprüfung <span class="tag">Stand Abitur 2028</span></h3>
    <p>${d.abi.map((it) => '<b>' + esc(it.value) + '</b> ' + esc(it.label) + (it.sub ? ' (' + esc(it.sub) + ')' : '')).concat(d.abiNotes.map((n) => esc(n.text))).join(' · ')}</p></section>
  <div class="bottom">
    <section><h2>${esc(d.name)} passt zu …</h2>
      <p class="ch ok">✓ geht mit</p><div class="combo ok">${d.ok.map(chip).join('')}</div>
      ${d.no.length ? '<p class="ch no">✗ geht nicht mit</p><div class="combo no">' + d.no.map(chip).join('') + '</div>'
        : '<p class="note">' + esc(d.note) + '</p>'}
    </section>
    <div class="qrs">${qr(filmUrl, 'Film ansehen')}</div>
  </div>
  <div class="foot"><span>Heinrich-Böll-Schule Hattersheim · Tag der offenen Tür</span><span>Angaben zur Abiturprüfung: Stand Abitur 2028 · ohne Gewähr</span></div>
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
.hero .qr { width: 52mm; }
.hero .qr svg { width: 52mm; height: 52mm; background: #fff; }
.hero .qr b { font-size: 13pt; margin-top: 2mm; }
.hero ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 2.4mm; font-size: 11.5pt; }
.hero ol li { display: flex; gap: 2.5mm; align-items: baseline; }
.hero ol i { font-style: normal; flex: none; width: 6.5mm; height: 6.5mm; border-radius: 50%; background: var(--accent); color: var(--head); font-family: var(--display); font-weight: 700; font-size: 10pt; display: grid; place-items: center; }
.steps { display: grid; gap: 3.2mm; }
.step { display: grid; grid-template-columns: 13mm 1fr; gap: 4mm; border: 0.3mm solid var(--line); border-radius: 3mm; padding: 2.6mm 4mm; }
.step > i { font-style: normal; width: 13mm; height: 13mm; border-radius: 50%; background: var(--accent); color: var(--head); font-family: var(--display); font-weight: 700; font-size: 20pt; display: grid; place-items: center; }
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
      <p>Tippe auf die Kombination, die dich interessiert. Du siehst nur Kombinationen, die es an der HBS gibt. Der <span class="pill g">1. Leistungskurs</span> ist dein Tutorium, dazu kommt der <span class="pill b">2. Leistungskurs</span>.</p>
      <p>Der Planer zeigt sofort, welche Fächer auf die Plätze 3 bis 5 kommen müssen und ob es Einschränkungen gibt.</p></div></section>
    <section class="step"><i>2</i><div><h2>Prüfungsfächer</h2>
      <p>Deine beiden Leistungskurse sind die Prüfungsfächer 1 und 2. Tippe auf Platz 3, 4 oder 5 und wähle ein Fach: Platz 3 wird schriftlich geprüft, Platz 4 mündlich, Platz 5 mündlich oder als Präsentation.</p>
      <p>Fächer, die auf einem Platz nicht möglich sind, erscheinen grau; antippen zeigt den Grund. <span class="pill k">Vorschlag einsetzen</span> füllt die freien Plätze mit einer gültigen Wahl.</p></div></section>
    <section class="step"><i>3</i><div><h2>Kurse</h2>
      <p>Stelle für jedes Fach ein, wie viele Kurse du <b>belegst</b> und wie viele du <b>einbringst</b>. Was ohnehin Pflicht ist, steht schon da. Eine Prüfliste zeigt, was noch fehlt; <span class="pill k">Pflicht automatisch auffüllen</span> ergänzt den Rest.</p>
      <p><small>Belegen heißt: einen Kurs ein Halbjahr lang besuchen. Einbringen heißt: Die Note zählt fürs Abitur – genau 32 Kurse, davon 8 Leistungskurse doppelt und 24 Grundkurse.</small></p></div></section>
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

fs.mkdirSync('poster', { recursive: true });
for (const film of todo) {
  const file = path.resolve('poster', film + '.html');
  fs.writeFileSync(file, film === 'planer' ? planerHtml() : html(data(film)));
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
