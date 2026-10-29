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
  const items = [{ at: c.ok, ok: true, with: c.order }];
  if (c.no) items.push({ at: c.no, ok: false, with: not });
  if (c.note) items.push({ at: c.note, note: NOTE });
  const panel = { type: 'combo', title: c.title, items };
  const file = 'content/' + f + '.json';
  let s = fs.readFileSync(file, 'utf8');
  const k = s.indexOf('"type": "combo"'); if (k < 0) throw new Error(f + ': kein combo');
  let a = s.lastIndexOf('{', k), depth = 0, e = a;
  for (; e < s.length; e++) { if (s[e] === '{') depth++; else if (s[e] === '}') { depth--; if (!depth) break; } }
  const ind = '        ';
  const txt = '{ "type": "combo", "title": ' + JSON.stringify(c.title) + ', "items": [\n' +
    items.map((it) => ind + JSON.stringify(it).replace(/,"/g, ', "').replace(/":/g, '": ').replace(/\{"/, '{ "').replace(/\}$/, ' }')).join(',\n') + '\n      ] }';
  s = s.slice(0, a) + txt + s.slice(e + 1);
  JSON.parse(s);
  fs.writeFileSync(file, s);
  console.log(f, 'mit', c.order.join(','), '| nicht', not.join(',') || '–');
}
