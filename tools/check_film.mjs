// Prüft den Film im echten Browser (Chrome headless): Zustand an gewählten Zeitpunkten,
// optional Bildschirmfotos. Braucht die laufende Vorschau (node tools/serve.mjs).
// Aufruf: node tools/check_film.mjs deutsch [--shots] [t1 t2 ...]
// Das Chrome-Profil liegt unter $TDOT_PROFILE (sonst %TEMP%/tdot-chrome-profile) und wird am Ende gelöscht.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TDOT_PROFILE || path.join(os.tmpdir(), 'tdot-chrome-profile');
const OUT = path.join(ROOT, '.build_cache', 'check');
const args = process.argv.slice(2);
const fach = args.shift() || 'deutsch';
const shots = args.includes('--shots');
const size = (args.find(a => a.startsWith('--size=')) || '--size=1600,900').slice(7);
const times = args.filter(a => /^\d+(\.\d+)?$/.test(a)).map(Number);

global.window = {};
eval(fs.readFileSync(path.join(ROOT, 'assets', 'data', fach + '.js'), 'utf8'));
const film = window.FILMS[fach];

// 1. Datenprüfung ohne Browser: Untertitel decken jeden Satz, keine Überlappung
const problems = [];
for (const sc of film.scenes) {
  for (let i = 1; i < sc.cues.length; i++) if (sc.cues[i].start < sc.cues[i - 1].end - 0.001) problems.push(`Szene ${sc.n}: Untertitel ${i} überlappt`);
  const joined = sc.cues.map(c => c.text).join(' ').replace(/\s+/g, ' ');
  const spoken = sc.sentences.map(s => s.text).join(' ').replace(/\s+/g, ' ');
  if (joined !== spoken) problems.push(`Szene ${sc.n}: Untertitel weichen vom Sprechtext ab`);
  const last = sc.sentences[sc.sentences.length - 1];
  if (last.start + last.dur > sc.duration) problems.push(`Szene ${sc.n}: letzter Satz länger als Szene`);
  for (const s of sc.sentences) if (s.estimated) problems.push(`Szene ${sc.n}: Dauer geschätzt (Aufnahme fehlt)`);
  for (const l of sc.captions || []) if (l.t >= l.end) problems.push(`Szene ${sc.n}: Bildunterschrift „${l.text}“ hat keine Dauer`);
  // Elemente müssen erscheinen, solange die Szene läuft (und vor einer Merkkarte)
  const limit = sc.takeaways ? sc.takeaways.t : sc.duration - 0.4;
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (typeof o.t === 'number' && o.t > limit) problems.push(`Szene ${sc.n}: Element bei ${o.t}s erscheint nach Szenenende/Merkkarte`); Object.values(o).forEach(walk); } };
  walk([sc.panel, sc.band, sc.captions, sc.imageCues]);
  // Bildwechsel brauchen Standzeit bis zum Szenenende
  const ic = sc.imageCues || [];
  if (ic.length && sc.duration - ic[ic.length - 1].t < 2.5) problems.push(`Szene ${sc.n}: letzter Bildwechsel steht nur ${(sc.duration - ic[ic.length - 1].t).toFixed(1)}s`);
}
console.log(problems.length ? 'DATEN: ' + problems.join('\n  ') : 'DATEN: Untertitel und Zeitachse stimmig');

// 2. Browser: Zustand zu Zeitpunkten
const defaults = [];
for (const sc of film.scenes) defaults.push(Math.round((sc.start + Math.min(sc.duration / 2, 8)) * 10) / 10);
const list = times.length ? times : defaults;
fs.mkdirSync(OUT, { recursive: true });

function dom(t) {
  const url = `http://localhost:8317/film.html?fach=${fach}&t=${t}&muted=1`;
  return execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${PROFILE}`, '--mute-audio',
    `--window-size=${size}`, '--virtual-time-budget=3000', '--dump-dom', url], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}
const pick = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const decode = (s) => s && s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

try {
  for (const t of list) {
    const html = dom(t);
    const subsOn = /id="subs" aria-live="off" class="on"|id="subs" class="on"/.test(html);
    const row = {
      t,
      sub: subsOn ? decode(pick(html, /id="subs"[^>]*><span>([^<]*)</)) : '—',
      caption: /id="caption" class="on"/.test(html) ? decode(pick(html, /id="caption"[^>]*><span>([^<]*)</)) : '—',
      shotA: pick(html, /id="shotA"[^>]*style="[^"]*opacity: ([\d.]+)/) + ' ' + pick(html, /id="shotA"[\s\S]*?<img alt="" src="([^"]*)"/),
      shotB: pick(html, /id="shotB"[^>]*style="[^"]*opacity: ([\d.]+)/) + ' ' + pick(html, /id="shotB"[\s\S]*?<img alt="" src="([^"]*)"/),
      chapter: pick(html, /id="chapter"[^>]*style="opacity: ([\d.]+)/),
      card: /class="card on"/.test(html),
      itemsOn: (html.match(/ reveal on"/g) || []).length,
      takeaways: /id="takeaways" class="on"/.test(html)
    };
    console.log(JSON.stringify(row));
    if (shots) {
      const file = path.join(OUT, `${fach}_t${String(t).replace('.', '_')}.png`);
      execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${PROFILE}`, '--mute-audio',
        `--window-size=${size}`, '--virtual-time-budget=3000', `--screenshot=${file}`,
        `http://localhost:8317/film.html?fach=${fach}&t=${t}&muted=1&static=1`], { stdio: 'ignore' });
    }
  }
} finally {
  fs.rmSync(PROFILE, { recursive: true, force: true });
}
