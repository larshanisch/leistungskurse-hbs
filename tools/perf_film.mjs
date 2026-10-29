// Misst, wie flüssig ein Film läuft: Chrome headless (Software-Grafik wie auf schwachen Tafeln),
// CPU gedrosselt, Film spielt stumm ab einer Stelle; gezählt werden die Abstände der Einzelbilder.
//
//   node tools/perf_film.mjs <fach> [--t=150] [--sec=10] [--cpu=4] [--size=1920,1080] [--css="…"]
//
// --css spritzt zusätzliches CSS ein (zum Vergleichen, z. B. --css="*{backdrop-filter:none!important}").
// Vorschau-Server muss laufen (Port 8317). Profil: $TDOT_PROFILE, wird am Ende gelöscht.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = (process.env.TDOT_PROFILE || path.join(os.tmpdir(), 'tdot-chrome-profile')) + '-perf';
const args = process.argv.slice(2);
const fach = args.find(a => !a.startsWith('--')) || 'englisch';
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const T = Number(opt('t', 150)), SEC = Number(opt('sec', 10)), CPU = Number(opt('cpu', 4));
const [W, H] = opt('size', '1920,1080').split(',').map(Number);
const CSS = opt('css', '');
const DPR = Number(opt('dpr', 1));   // Pixeldichte wie auf 4K-Tafeln (Promethean: 2)

const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${PROFILE}`,
  `--window-size=${W},${H}`, '--autoplay-policy=no-user-gesture-required', '--mute-audio', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] });
const wsBrowser = await new Promise((res, rej) => {
  let buf = '';
  chrome.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) res(m[1]); });
  setTimeout(() => rej(new Error('Chrome meldet keinen DevTools-Port')), 15000);
});
const port = new URL(wsBrowser).port;
const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const wait = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } else events.push(m); });
const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };

try {
  await send('Page.enable');
  await send('Emulation.setCPUThrottlingRate', { rate: CPU });
  if (DPR !== 1) await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
  await send('Page.navigate', { url: `http://localhost:8317/film.html?fach=${fach}&t=${T}&muted=1` });
  await new Promise(r => setTimeout(r, 4000));
  if (CSS) await evalJs(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(CSS)}; document.head.appendChild(s); })()`);
  await send('Performance.enable');
  const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(m => [m.name, m.value]));
  const m0 = await metrics();
  const PROF = args.includes('--profile');
  if (PROF) { await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 }); await send('Profiler.start'); }
  const res = await evalJs(`new Promise((resolve) => {
    window.__film.play();
    const ts = []; const t0 = performance.now(); const film0 = window.__film.time();
    const step = (now) => { ts.push(now); if (now - t0 < ${SEC * 1000}) requestAnimationFrame(step); else resolve({ ts, filmSec: window.__film.time() - film0, stats: window.__film.stats || null }); };
    requestAnimationFrame(step);
  })`);
  const m1 = await metrics();
  const md = (k) => +(m1[k] - m0[k]).toFixed(k.endsWith('Duration') ? 2 : 0);
  console.log('Hauptthread in ' + SEC + ' s:', JSON.stringify({ task_s: md('TaskDuration'), script_s: md('ScriptDuration'),
    style_s: md('RecalcStyleDuration'), layout_s: md('LayoutDuration'), styleCount: md('RecalcStyleCount'), layoutCount: md('LayoutCount') }));
  if (PROF) {
    // Eigenzeit je Funktion aus dem Stichproben-Profil (Top 12)
    const { profile } = (await send('Profiler.stop')).result;
    const self = new Map(); const byId = new Map(profile.nodes.map(n => [n.id, n]));
    const dt = profile.timeDeltas; let total = 0;
    profile.samples.forEach((sid, i) => {
      const n = byId.get(sid); const f = n.callFrame;
      const key = (f.functionName || '(anonym)') + ' ' + (f.url.split('/').pop() || '') + ':' + (f.lineNumber + 1);
      self.set(key, (self.get(key) || 0) + (dt[i] || 0)); total += dt[i] || 0;
    });
    [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
      .forEach(([k, v]) => console.log(String((100 * v / total).toFixed(1)).padStart(5) + ' %  ' + k));
  }
  const d = res.ts.slice(1).map((t, i) => t - res.ts[i]).sort((a, b) => a - b);
  const q = (p) => d[Math.min(d.length - 1, Math.floor(p * d.length))];
  const fps = (d.length / (SEC)).toFixed(1);
  console.log(JSON.stringify({ fach, t: T, cpu: CPU, size: `${W}x${H}`, dpr: DPR, css: CSS || null, fps: Number(fps),
    median_ms: +q(0.5).toFixed(1), p95_ms: +q(0.95).toFixed(1), max_ms: +d[d.length - 1].toFixed(1),
    over50ms: d.filter(x => x > 50).length, filmSec: +res.filmSec.toFixed(1), ton: res.stats }));
} finally {
  ws.close(); chrome.kill();
  await new Promise(r => setTimeout(r, 800));
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch { /* Chrome hält evtl. noch Dateien */ }
}
