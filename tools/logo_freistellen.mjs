// Stellt das Schullogo frei: Weiß, das vom Bildrand her zusammenhängt (Hintergrund), wird durchsichtig;
// eingeschlossenes Weiß (die Buchstaben auf den schwarzen Balken) bleibt. Weiche Kanten über die Helligkeit.
//   node tools/logo_freistellen.mjs assets/img/logo_hbs.png assets/img/logo_hbs_frei.png
import { execFileSync } from 'node:child_process';
const [src, out] = process.argv.slice(2);
const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src]).toString().trim();
const [W, H] = probe.split(',').map(Number);
const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 30 });
const px = Buffer.from(raw);
const light = (i) => Math.min(px[i], px[i + 1], px[i + 2]);         // „wie weiß“ ist ein Pixel
const isBg = (p) => { const i = p * 4; return px[i + 3] < 10 || light(i) > 200; };   // durchsichtig oder fast weiß
// Flutfüllung vom Rand aus über alles, was Hintergrund ist
const seen = new Uint8Array(W * H); const stack = [];
for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
while (stack.length) {
  const p = stack.pop(); if (seen[p] || !isBg(p)) continue; seen[p] = 1;
  const x = p % W, y = (p - x) / W;
  if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
}
let n = 0;
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  if (seen[p]) { px[i + 3] = 0; n++; continue; }
  // Kantenpixel neben dem entfernten Hintergrund: Weißanteil herausrechnen (weich, ohne hellen Saum)
  const x = p % W, y = (p - x) / W;
  const nb = (x > 0 && seen[p - 1]) || (x < W - 1 && seen[p + 1]) || (y > 0 && seen[p - W]) || (y < H - 1 && seen[p + W]);
  if (nb && px[i + 3] > 0) {
    const l = light(i) / 255;                       // 1 = weiß, 0 = farbig/schwarz
    const a = Math.max(0, Math.min(1, (1 - l) * 1.6));
    px[i + 3] = Math.round(px[i + 3] * a);
  }
}
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', '-', '-frames:v', '1', '-update', '1', out], { input: px });
console.log(`freigestellt: ${(100 * n / (W * H)).toFixed(1)} % Hintergrund entfernt → ${out}`);
