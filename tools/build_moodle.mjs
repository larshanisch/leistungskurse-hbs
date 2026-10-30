// Baut das Moodle-Lernpaket „Kursplaner“ (SCORM 1.2, Entscheidung 116).
// Aufruf: node tools/build_moodle.mjs  →  dist/moodle/ (zum Ansehen) und dist/Kursplaner_HBS_Moodle_v<VERSION>.zip
//
// Die Paketseite wird aus index.html abgeleitet – Regeln, Texte und Rechner gibt es nur einmal.
// moodle/scorm.js setzt window.TDOT_MOODLE: nur der Planer, Schritt 4 „Noten“ an, eigene Noten erlaubt,
// Stand in cmi.suspend_data, Bericht in acht festen Interaktionsplätzen (siehe Kopf von scorm.js).
// Jede Ersetzung muss genau passen, sonst bricht das Skript ab (geänderte index.html → hier nachziehen).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const VERSION = '1.0';
const STAND = '30.10.2026';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT = path.join(ROOT, 'dist', 'moodle');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let s = rd('index.html');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('index.html hat sich geändert, nicht gefunden: ' + a.slice(0, 70)); s = s.replace(a, () => b); };
const cut = (re, n) => { const m = s.match(re); if (!m || m.length !== n) throw new Error('erwartet ' + n + '× ' + re); s = s.replace(re, ''); };

// Filme, QR-Code, Offline-Speicher und Update-Meldung gehören nicht ins Paket
cut(/<script src="assets\/data\/[a-z]+\.js"><\/script>\n/g, 8);
cut(/<script src="assets\/js\/(qr|offline|update)\.js"><\/script>\n/g, 3);
rep('<script src="assets/js/icons.js"></script>', '<script src="scorm.js"></script>\n<script src="assets/js/icons.js"></script>');
rep('<title>Leistungskurse an der Heinrich-Böll-Schule</title>', '<title>Kursplaner · Heinrich-Böll-Schule</title>');
rep('<p class="kicker">Gymnasiale Oberstufe · Tag der offenen Tür</p>', '<p class="kicker">Gymnasiale Oberstufe · Kursplaner</p>');
rep('<h1>Leistungskurse an der HBS</h1>', '<h1>Kurswahl und Abitur planen</h1>');
const lead = s.match(/<p class="lead">[\s\S]*?<\/p>/);
if (!lead) throw new Error('lead');
s = s.replace(lead[0], () => '<p class="lead">Plane deine Leistungskurse, Prüfungsfächer und Kurse – und rechne aus, wie es mit Zulassung, ' +
  'schulischem Teil der Fachhochschulreife und Abiturnote aussieht.</p>');
const modes = s.match(/\s*<span class="modes">[\s\S]*?<\/span><\/footer>/);
if (!modes) throw new Error('footer');
s = s.replace(modes[0], () => '\n    · Lernpaket ' + VERSION + ', Stand ' + STAND +
  ' · <a class="linkish" href="auswertung.html" target="_blank" rel="noopener">Auswertung für Lehrkräfte</a><span class="modes" hidden></span></footer>');   // .modes liest das Planer-Skript
// kein Rückweg zur Startseite: im Paket gibt es nur den Planer
rep('</head>', '<style>#v-planer .bar .back { display: none; } footer a.linkish { color: inherit; font-weight: 700; }</style>\n</head>');

// --- Dateien zusammenstellen ---
fs.rmSync(OUT, { recursive: true, force: true });
const files = {};
const put = (rel, data) => { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); files[rel] = true; };
put('index.html', s);
put('scorm.js', rd('moodle/scorm.js'));
put('auswertung.html', rd('moodle/auswertung.html'));
for (const f of ['assets/css/hell.css', 'assets/css/planer.css', 'assets/js/icons.js', 'assets/img/logo_hbs_frei.png']) put(f, fs.readFileSync(path.join(ROOT, f)));
for (const f of fs.readdirSync(path.join(ROOT, 'assets/fonts'))) put('assets/fonts/' + f, fs.readFileSync(path.join(ROOT, 'assets/fonts', f)));

// Prüfen: jeder lokale Verweis in den Seiten und Stilen muss im Paket liegen (exakte Schreibweise)
const missing = [];
for (const rel of Object.keys(files).filter((f) => /\.(html|css)$/.test(f))) {
  const t = fs.readFileSync(path.join(OUT, rel), 'utf8');
  const refs = [...t.matchAll(/(?:src|href)="([^"#?:]+)"|url\("?([^")]+)"?\)/g)].map((m) => m[1] || m[2])
    .filter((u) => u && !/^(https?:|data:|mailto:|')/.test(u) && !u.includes("'") && !u.includes('+'));
  for (const u of refs) { const p = path.posix.normalize(path.posix.join(path.posix.dirname(rel), u)); if (!files[p]) missing.push(rel + ' → ' + u); }
}
if (missing.length) throw new Error('Fehlende Dateien:\n  ' + missing.join('\n  '));

// --- Manifest: ein SCO, keine masteryscore (Status bleibt „incomplete“, siehe scorm.js) ---
const list = Object.keys(files).sort();
const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="de.hbs-hattersheim.kursplaner" version="${VERSION}"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG">
    <organization identifier="ORG">
      <title>Kursplaner</title>
      <item identifier="ITEM1" identifierref="RES1" isvisible="true">
        <title>Kursplaner</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html">
${list.map((f) => '      <file href="' + f + '"/>').join('\n')}
    </resource>
  </resources>
</manifest>
`;
put('imsmanifest.xml', manifest);

// --- Zip: Inhalt an der Wurzel, Schrägstriche vorwärts (Moodle lehnt sonst ab) ---
function zip(entries) {
  const parts = [], central = []; let off = 0;
  const dosTime = 0, dosDate = ((2026 - 1980) << 9) | (10 << 5) | 30;
  for (const [name, data] of entries) {
    const nb = Buffer.from(name, 'utf8'), crc = zlib.crc32(data), comp = zlib.deflateRawSync(data, { level: 9 });
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt16LE(dosTime, 10); h.writeUInt16LE(dosDate, 12); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, nb, comp);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(dosTime, 12); c.writeUInt16LE(dosDate, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20);
    c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, nb);
    off += 30 + nb.length + comp.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}
const names = ['imsmanifest.xml', ...list];
const zipName = 'Kursplaner_HBS_Moodle_v' + VERSION + '.zip';
const buf = zip(names.map((n) => [n, fs.readFileSync(path.join(OUT, n))]));
fs.writeFileSync(path.join(ROOT, 'dist', zipName), buf);
console.log('Paket: dist/' + zipName + ' · ' + names.length + ' Dateien · ' + (buf.length / 1024).toFixed(0) + ' KB');
