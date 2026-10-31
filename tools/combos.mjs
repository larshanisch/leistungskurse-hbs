import fs from 'node:fs';
// Aufruf: node tools/combos.mjs – schreibt die Kombinations-Tafel (Szene 3) aller Filme aus PAIRS in index.html neu und prüft, dass
// die Reihenfolge je Film genau die Partner enthält. Danach node tools/build.mjs <fach> für alle Filme. Nach jeder Änderung an PAIRS laufen lassen.
// Entscheidung 111: Kombinationen im Film = nur die Partnerfächer (mit Icons) und was nicht geht; Partner nach PAIRS (index.html)
const ALL = ['englisch', 'deutsch', 'kunst', 'powi', 'geschichte', 'biologie', 'chemie', 'mathe'];
const idx = fs.readFileSync('index.html', 'utf8');
const PAIRS = eval('(' + idx.match(/var PAIRS = (\{[\s\S]*?\});/)[1] + ')');
const partners = (s) => ALL.filter((o) => o !== s && ((PAIRS[s] || []).includes(o) || (PAIRS[o] || []).includes(s)));
const NOTE = 'Mit jedem anderen Leistungskurs an der HBS.';
const FILMS = {
  deutsch:    { s: 'deutsch', title: 'Deutsch passt zu …', ok: 'Deutsch und Englisch', no: 'Deutsch und Kunst', order: ['englisch', 'mathe', 'biologie'] },
  englisch:   { s: 'englisch', title: 'Englisch passt zu …', ok: 'mit Deutsch', note: 'vielen anderen', order: ['deutsch', 'kunst', 'powi', 'geschichte', 'biologie', 'chemie', 'mathe'] },
  kunst:      { s: 'kunst', title: 'Kunst passt zu …', ok: 'Kunst mit Englisch', no: 'Kunst mit Deutsch', order: ['englisch', 'mathe', 'biologie'] },
  powi:       { s: 'powi', title: 'Politik und Wirtschaft passt zu …', ok: 'kombinierst', no: 'Mathematik.', order: ['englisch', 'biologie', 'chemie', 'mathe'] },
  geschichte: { s: 'geschichte', title: 'Geschichte passt zu …', ok: 'kombinierst', no: 'Mathematik.', order: ['englisch', 'biologie', 'mathe'] },
  mathematik: { s: 'mathe', title: 'Mathematik passt zu …', ok: 'Deutsch, Englisch und Kunst', note: 'Biologie und Chemie', order: ['deutsch', 'englisch', 'kunst', 'powi', 'geschichte', 'biologie', 'chemie'] },
  biologie:   { s: 'biologie', title: 'Biologie passt zu …', ok: 'Deutsch, Englisch und Kunst', note: 'Chemie und Mathematik', order: ['deutsch', 'englisch', 'kunst', 'powi', 'geschichte', 'chemie', 'mathe'] },
  chemie:     { s: 'chemie', title: 'Chemie passt zu …', ok: 'Englisch', no: 'Politik und Wirtschaft', order: ['englisch', 'biologie', 'mathe', 'powi'] }
};
for (const [f, c] of Object.entries(FILMS)) {
  const p = partners(c.s), not = ALL.filter((o) => o !== c.s && !p.includes(o));
  if ([...c.order].sort().join() !== [...p].sort().join()) throw new Error(f + ': Reihenfolge ' + c.order + ' ≠ Partner ' + p);
  if (!!c.no !== not.length > 0) throw new Error(f + ': „geht nicht“ passt nicht zu ' + not);
  const file = 'content/' + f + '.json';
  let s = fs.readFileSync(file, 'utf8');
  const k = s.indexOf('"type": "combo"'); if (k < 0) throw new Error(f + ': kein combo');
  // „geht mit“ steht schon ab dem ersten Satz der Szene (Nutzer 31.10.2026: länger sichtbar, Entscheidung 120):
  // Anker = die ersten vier Wörter des Sprechtexts dieser Szene im Drehbuch
  const n = [...s.slice(0, k).matchAll(/"n": (\d+)/g)].pop()[1];
  const sec = fs.readFileSync('drehbuch/' + f + '.md', 'utf8').split(/\n(?=### )/).find((x) => new RegExp('^### Szene ' + n + '\\b').test(x));
  if (!sec) throw new Error(f + ': Szene ' + n + ' nicht im Drehbuch');
  const first = sec.split('\n').filter((l) => l.startsWith('  > ')).map((l) => l.slice(4)).join(' ').split(/\s+/).slice(0, 4).join(' ');
  const items = [{ at: first, ok: true, with: c.order }];
  if (c.no) items.push({ at: c.no, ok: false, with: not });
  if (c.note) items.push({ at: c.note, note: NOTE });
  let a = s.lastIndexOf('{', k), depth = 0, e = a;
  for (; e < s.length; e++) { if (s[e] === '{') depth++; else if (s[e] === '}') { depth--; if (!depth) break; } }
  const ind = '        ';
  const txt = '{ "type": "combo", "title": ' + JSON.stringify(c.title) + ', "items": [\n' +
    items.map((it) => ind + JSON.stringify(it).replace(/,"/g, ', "').replace(/":/g, '": ').replace(/\{"/, '{ "').replace(/\}$/, ' }')).join(',\n') + '\n      ] }';
  s = s.slice(0, a) + txt + s.slice(e + 1);
  // Tafel steht nach dem letzten Satz noch 4 s (Feld „hold“ der Szene, tools/build.mjs)
  if (!/"hold": \d/.test(s.slice(s.lastIndexOf('"n": ' + n, a), a))) s = s.replace('"panel": { "type": "combo"', '"hold": 4,\n      "panel": { "type": "combo"');
  JSON.parse(s);
  fs.writeFileSync(file, s);
  console.log(f, 'mit', c.order.join(','), '| nicht', not.join(',') || '–');
}
