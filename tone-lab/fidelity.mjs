// Re-derive each baked TONE_WORDS contour from its mp3 at its baked centre and
// compare against what the previous harness baked into the app.
import fs from 'node:fs';
import { loadEngine, decode, asTake } from './engine.mjs';
import { AUDIO } from './corpus.mjs';
// The baked TONE_WORDS contours were produced by the v1 front end, so the
// check runs the frozen v1 engine by default (ENGINE=... to override).
const ENGINE = process.env.ENGINE || new URL('./baseline/v1/tone-trainer.js', import.meta.url).pathname;
const src = fs.readFileSync(ENGINE, 'utf8');
const words = [...src.matchAll(/\{ id: '(\w+)',\s+tone: '(\w+)'.*?centreHz: ([\d.]+),\s+points: (\[\[.*?\]\]) \}/gs)]
  .map(m => ({ id: m[1], tone: m[2], centre: +m[3], pts: JSON.parse(m[4]) }));
for (const SR of [44100, 48000]) {
  const E = loadEngine(ENGINE, SR);
  let line = `SR ${SR}: `;
  for (const w of words) {
    const pcm = decode(AUDIO + w.id + '.mp3', SR);
    // Feed the file as-is (no added noise) to mimic an offline harness.
    const take = asTake(pcm, SR, 0, pcm.length / SR * 1000, { leadMs: 0, padMs: 0, tailMs: 1500, noiseRms: 0 });
    const r = await E.capture(take, w.centre);
    const core = E.dsp.extractContour(r.frames, r.thresholdRms, w.centre) || [];
    const a = core.map(p => p.hz), b = w.pts.map(p => p[1]);
    // align by best offset
    let best = 1e9, bo = 0;
    for (let o = -10; o <= 10; o++) { let s = 0, n = 0; for (let i = 0; i < b.length; i++) { const j = i + o; if (j >= 0 && j < a.length) { s += Math.abs(12 * Math.log2(a[j] / b[i])); n++; } } if (n > b.length * 0.6 && s / n < best) { best = s / n; bo = o; } }
    const cl = E.dsp.classify(core, w.centre);
    line += `${w.id}(${a.length}/${b.length} d=${best.toFixed(2)} ${cl ? cl.tone.slice(0,3) : '-'}) `;
  }
  console.log(line);
}
