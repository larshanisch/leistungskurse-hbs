// Baut die Filmdaten eines Fachs: Sprechtext aus dem Drehbuch, Szenen aus content/<fach>.json,
// Aufnahme-Manifest für schul-medien, Dauer je Satz per ffprobe, Platzhalterbilder.
// Aufruf: node tools/build.mjs deutsch
//
// Zeitanker: Jedes Objekt in einer Szene mit "at": "<Wortstelle>" bekommt "t" (Sekunden ab
// Szenenbeginn) – der Zeitpunkt, an dem die Stimme diese Stelle spricht. Innerhalb einer Liste wird
// fortlaufend gesucht (gleiche Wörter in späteren Einträgen treffen spätere Stellen).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fach = process.argv[2];
if (!fach) { console.error('Fach fehlt: node tools/build.mjs deutsch'); process.exit(1); }

// Zeitraster (Sekunden)
const LEAD = 0.6;        // Bild steht, bevor der erste Satz beginnt
const GAP = 0.45;        // Pause zwischen zwei Sätzen
const TAIL = 1.4;        // Bild steht nach dem letzten Satz
const CHAPTER = 3.0;     // Kapitelkarte
const TAKEAWAYS = 5.0;   // Merkkarte am Szenenende (ohne Sprecher)
const TAKEAWAYS_SPOKEN = 1.6; // gesprochene Merkkarte ("at"): steht so viel länger als TAIL
const EST_CPS = 15.5;    // Schätzung Zeichen/Sekunde, nur solange eine Aufnahme fehlt
const MAX_CUE = 110;     // längere Sätze werden für die Untertitel geteilt
const MIN_HOLD = 2.8;    // Bildwechsel/Bildunterschrift steht mindestens so lange

const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', fach + '.json'), 'utf8'));
const script = fs.readFileSync(path.join(ROOT, content.script), 'utf8');
const mediaDir = path.join(ROOT, 'media', fach);
const audioDir = path.join(mediaDir, 'audio');
const imgDir = path.join(mediaDir, 'img');
fs.mkdirSync(audioDir, { recursive: true });
fs.mkdirSync(imgDir, { recursive: true });

// --- Sprechtext je Szene aus dem Drehbuch -------------------------------------------------
function speechByScene(md) {
  const out = new Map();
  let scene = null, inSpeech = false, buf = [];
  const flush = () => { if (scene !== null && buf.length) out.set(scene, buf.join(' ').replace(/\s+/g, ' ').trim()); buf = []; };
  for (const line of md.split('\n')) {
    const m = line.match(/^### Szene (\d+)/);
    if (m) { flush(); scene = Number(m[1]); inSpeech = false; continue; }
    if (/^- \*\*Sprechtext:\*\*/.test(line)) { inSpeech = true; continue; }
    if (inSpeech && /^\s+> /.test(line)) { buf.push(line.replace(/^\s+> /, '')); continue; }
    if (inSpeech && buf.length) { inSpeech = false; }
  }
  flush();
  return out;
}

function splitSentences(text) {
  return text.split(/(?<=[.!?][“"]?)\s+(?=[A-ZÄÖÜ„"])/).map(s => s.trim()).filter(Boolean);
}

// Bevorzugt an Gedankenstrich, Semikolon, Doppelpunkt; Komma kostet einen Aufschlag, ein Komma
// vor einer Aufzählungsfortsetzung („Literatur, Sprache und Medien“) einen größeren.
function splitCue(s) {
  if (s.length <= MAX_CUE) return [s];
  const mid = s.length / 2;
  let best = -1, bestScore = Infinity;
  const re = /(, |; | – |: )/g;
  let m;
  while ((m = re.exec(s))) {
    const cut = m.index + (m[0] === ' – ' ? 0 : 1);
    const rest = s.slice(m.index + m[0].length);
    let penalty = 0;
    if (m[0] === ', ') penalty = 0.12;
    if (m[0] === ', ' && /^[\wäöüÄÖÜß]+( [\wäöüÄÖÜß]+)? (und|oder) /.test(rest)) penalty = 0.5;
    const score = Math.abs(cut - mid) / s.length + penalty;
    if (score < bestScore && cut > 25 && s.length - cut > 25) { bestScore = score; best = cut; }
  }
  if (best < 0) {
    // kein Satzzeichen: vor einem Bindewort nahe der Mitte teilen, notfalls am nächsten Leerzeichen
    const re2 = / (?=(und|oder|über|bis|mit|auf|statt|wie|für) )/g;
    let m2, bestD = Infinity;
    while ((m2 = re2.exec(s))) { const d = Math.abs(m2.index - mid); if (d < bestD && m2.index > 25 && s.length - m2.index > 25) { bestD = d; best = m2.index; } }
    if (best < 0) { best = s.lastIndexOf(' ', Math.round(mid)); if (best < 25) return [s]; }
  }
  // so lange teilen, bis jedes Stück höchstens MAX_CUE Zeichen hat
  return [...splitCue(s.slice(0, best).trim()), ...splitCue(s.slice(best).trim())];
}

const hash = (str) => crypto.createHash('sha1').update(str).digest('hex').slice(0, 8);
const r3 = (x) => Math.round(x * 1000) / 1000;

function probe(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
    return Number(String(out).trim());
  } catch { return null; }
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function placeholderSvg(n, text) {
  const words = text.split(' ');
  const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > 46) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  if (cur.trim()) lines.push(cur.trim());
  const tl = lines.map((l, i) => `<text x="800" y="${470 + i * 52}" font-size="40" text-anchor="middle" fill="#e8dccb">${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
<rect width="1600" height="900" fill="#2a221c"/>
<text x="800" y="390" font-size="30" text-anchor="middle" fill="#c9a77c" letter-spacing="6" font-family="sans-serif">PLATZHALTER · SZENE ${n}</text>
<g font-family="sans-serif">${tl}</g>
</svg>`;
}

// --- Aufbau ---------------------------------------------------------------------------------
const speech = speechByScene(script);
const voiceKey = JSON.stringify(content.voice);
const manifestItems = [];
const report = { scenes: 0, sentences: 0, audioPresent: 0, audioMissing: 0, chars: 0, warnings: [] };
const usedImages = new Set();

function imgPath(name, n, placeholder) {
  if (fs.existsSync(path.join(imgDir, name))) { usedImages.add(name); return `media/${fach}/img/${name}`; }
  const ph = 'ph_' + name.replace(/\.\w+$/, '') + '.svg';
  if (!usedImages.has(ph)) fs.writeFileSync(path.join(imgDir, ph), placeholderSvg(n, placeholder || name), 'utf8');
  usedImages.add(ph);
  report.warnings.push(`Szene ${n}: Bild ${name} fehlt – Platzhalter`);
  return `media/${fach}/img/${ph}`;
}
function resolveImage(img, n) {
  const out = { ...img, src: imgPath(img.src, n, img.placeholder) };
  if (img.bg) out.bg = imgPath(img.bg, n);
  delete out.placeholder; delete out.at;
  return out;
}

let t = 0;
const scenes = [];
for (const sc of content.scenes) {
  const text = speech.get(sc.n);
  if (!text) { report.warnings.push(`Szene ${sc.n}: kein Sprechtext im Drehbuch`); continue; }
  const sentences = splitSentences(text).map((s, i) => {
    const file = `audio/s${String(sc.n).padStart(2, '0')}_${i + 1}_${hash(voiceKey + s)}.mp3`;
    manifestItems.push({ file, text: s });
    const abs = path.join(mediaDir, file);
    let dur = fs.existsSync(abs) ? probe(abs) : null;
    const estimated = dur === null;
    if (estimated) { dur = s.length / EST_CPS; report.audioMissing++; } else report.audioPresent++;
    report.sentences++; report.chars += s.length;
    return { text: s, audio: `media/${fach}/${file}`, dur: r3(dur), estimated };
  });

  // Zeitachse der Szene
  const chapterDur = sc.chapter ? CHAPTER : 0;
  let st = LEAD;
  const cues = [];
  sentences.forEach((s, i) => {
    s.start = r3(st);
    let off = 0;
    for (const p of splitCue(s.text)) {
      const d = s.dur * (p.length / s.text.length);
      cues.push({ text: p, start: r3(st + off), end: r3(st + off + d) });
      off += d;
    }
    st += s.dur + (i < sentences.length - 1 ? GAP : 0);
  });
  const speechEnd = st;
  let duration = st + TAIL;
  if (sc.takeaways) duration += sc.takeaways.at ? TAKEAWAYS_SPOKEN : TAKEAWAYS;
  duration = r3(duration);

  // Wortstelle -> Zeitpunkt
  const full = sentences.map(s => s.text).join(' ');
  const offsets = []; { let o = 0; for (const s of sentences) { offsets.push(o); o += s.text.length + 1; } }
  function timeAt(word, from) {
    const pos = full.indexOf(word, from);
    if (pos < 0) { report.warnings.push(`Szene ${sc.n}: Stelle „${word}“ nicht gefunden`); return { t: 0, pos: from }; }
    let k = offsets.length - 1; while (offsets[k] > pos) k--;
    const s = sentences[k];
    return { t: r3(s.start + s.dur * ((pos - offsets[k]) / s.text.length)), pos };
  }
  // alle "at" in einem Objektbaum auflösen; Listen fortlaufend
  function resolveAts(node) {
    if (Array.isArray(node)) {
      let from = 0;
      return node.map(x => {
        if (x && typeof x === 'object' && typeof x.at === 'string') {
          const r = timeAt(x.at, from); from = r.pos;
          const y = resolveAts({ ...x, at: undefined }); y.t = r.t; delete y.at; return y;
        }
        return resolveAts(x);
      });
    }
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) out[k] = resolveAts(v);
      if (typeof node.at === 'string') { out.t = timeAt(node.at, 0).t; delete out.at; }
      return out;
    }
    return node;
  }
  const spread = (list, from = 0) => { let prev = from; for (const x of list) { x.t = r3(Math.max(x.t, prev + MIN_HOLD)); prev = x.t; } return list; };

  const out = { n: sc.n, chapter: sc.chapter || null, chapterDur, duration, speechEnd: r3(speechEnd), sentences, cues };
  out.image = resolveImage(sc.image, sc.n);

  // Bildwechsel: Mindeststandzeit; Bildunterschriften am selben Wort wandern mit
  const shifted = new Map();
  if (sc.imageCues) {
    const cuesR = resolveAts(sc.imageCues);
    const raw = cuesR.map(c => c.t);
    spread(cuesR);
    raw.forEach((rt, i) => shifted.set(rt, cuesR[i].t));
    out.imageCues = cuesR.map((c, i) => ({ ...resolveImage({ ...sc.imageCues[i], src: sc.imageCues[i].src }, sc.n), t: c.t }));
  }
  if (sc.captions) {
    const cap = resolveAts(sc.captions).map(c => ({ text: c.text, t: shifted.has(c.t) ? shifted.get(c.t) : c.t }));
    spread(cap, -MIN_HOLD);
    cap.forEach((c, i) => { c.end = i < cap.length - 1 ? cap[i + 1].t : r3(speechEnd + 0.8); });
    out.captions = cap;
  }
  for (const k of ['panel', 'band']) if (sc[k]) out[k] = resolveAts(sc[k]);
  if (sc.takeaways) {
    const { at, ...tk } = sc.takeaways;
    out.takeaways = { ...tk, t: at ? timeAt(at, 0).t : r3(speechEnd + 0.6) };
  }
  for (const k of ['title', 'corner', 'endCard', 'logo']) if (sc[k]) out[k] = sc[k];
  out.start = r3(t + chapterDur);
  t += chapterDur + duration;
  scenes.push(out);
  report.scenes++;
}

// --- Ausgabe ---------------------------------------------------------------------------------
const v = content.voice;
const manifest = { categories: { narration: { kind: 'tts', voice_id: v.voice_id, items: manifestItems } } };
fs.writeFileSync(path.join(mediaDir, 'audio_manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const credits = fs.existsSync(path.join(ROOT, 'content', fach + '_credits.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'content', fach + '_credits.json'), 'utf8')) : [];
const film = { id: content.id, title: content.title, accent: content.accent, total: r3(t), credits, scenes };
fs.mkdirSync(path.join(ROOT, 'assets', 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'assets', 'data', fach + '.js'),
  '// Erzeugt von tools/build.mjs – nicht von Hand ändern.\nwindow.FILMS = window.FILMS || {};\nwindow.FILMS[' + JSON.stringify(fach) + '] = ' + JSON.stringify(film, null, 1) + ';\n', 'utf8');

const wanted = new Set(manifestItems.map(i => path.basename(i.file)));
const stale = fs.readdirSync(audioDir).filter(f => !wanted.has(f));
const staleImg = fs.readdirSync(imgDir).filter(f => !usedImages.has(f));

const mm = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
console.log(`${content.title}: ${report.scenes} Szenen, ${report.sentences} Sätze, ${report.chars} Zeichen`);
console.log(`Stimme: ${v.name} · Modell ${v.model || 'eleven_multilingual_v2'} · ${v.format}`);
console.log(`Aufnahmen: ${report.audioPresent} vorhanden, ${report.audioMissing} fehlen${report.audioMissing ? ' (Dauer geschätzt)' : ''}`);
console.log(`Gesamtdauer: ${mm(t)} min${report.audioMissing ? ' (teilweise geschätzt)' : ' (gemessen)'}`);
console.log(`Vertonen: media_speak_batch mit media/${fach}/audio_manifest.json, voices = {"narration": ${JSON.stringify({ voice_id: v.voice_id, model: v.model, format: v.format, ...(v.settings ? { settings: v.settings } : {}) })}}`);
if (stale.length) console.log('Nicht mehr verwendete Aufnahmen:', stale.join(', '));
if (staleImg.length) console.log('Nicht mehr verwendete Bilder:', staleImg.join(', '));
for (const w of report.warnings) console.log('WARNUNG', w);
