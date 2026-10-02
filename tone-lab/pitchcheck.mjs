// Front-end check: the engine's cleaned contour vs Praat, frame by frame,
// plus the calibrated centre vs a Praat-derived centre. Needs
// `node export-takes.mjs && python3 py/praat_ref.py` first.
//   ENGINE=baseline/v1/tone-trainer.js node pitchcheck.mjs
import fs from 'node:fs';
import path from 'node:path';
import { loadEngine, asTake } from './engine.mjs';
import { SPEAKERS, speakerTokens, calibrationTokens } from './corpus.mjs';
import { calibrate } from './lab.mjs';

const HERE = new URL('./', import.meta.url).pathname;
const ENGINE = path.resolve(HERE, process.env.ENGINE || '../tone-trainer.js');
const VERBOSE = !!process.env.VERBOSE;
const SR = 48000;
const REF = JSON.parse(fs.readFileSync(HERE + 'out/praat-ref.json'));
const E = loadEngine(ENGINE, SR);
const d = E.dsp;
const st = (a, b) => 12 * Math.log2(a / b);
const praatAt = (key, ms) => { const r = REF[key]; const k = Math.round((ms / 1000 - r.t0) / r.dt); return (k >= 0 && k < r.f.length) ? r.f[k] : 0; };

let G = { frames: 0, gross: 0, dropped: 0, words: 0, badCentre: 0 };
for (const sp of SPEAKERS) {
  const toks = speakerTokens(sp, SR);
  const takes = toks.map((t, i) => asTake(t.pcm, SR, t.startMs, t.endMs, { seed: i + 1 }));
  const cal = calibrationTokens(sp, toks);
  const prof = await calibrate(E, cal.map(t => takes[toks.indexOf(t)]));
  const centre = prof ? prof.centerHz : 0;
  // Praat "truth" centre: median Praat F0 of the calibration words.
  const pv = [];
  for (const t of cal) { const r = REF[sp.id + '/' + toks.indexOf(t)]; for (const f of r.f) if (f > 0) pv.push(f); }
  const truth = d.median(pv);
  const off = st(centre, truth);
  if (Math.abs(off) > 2) G.badCentre++;
  let fr = 0, gross = 0, notes = [];
  for (let i = 0; i < toks.length; i++) {
    const r = await E.capture(takes[i], centre);
    const core = d.extractContour(r.frames, r.thresholdRms, centre);
    G.words++;
    if (!core) { notes.push(`#${i} ${toks[i].label}: NO CONTOUR`); continue; }
    let g = 0, n = 0;
    const devs = [];
    for (const p of core) {
      const f = praatAt(sp.id + '/' + i, p.t);
      if (!f) continue;
      n++; const e = st(p.hz, f); if (Math.abs(e) > 3) { g++; devs.push(Math.round(e)); }
    }
    // Praat-voiced span of the loudest stretch vs the engine's span
    const rr = REF[sp.id + '/' + i]; let a = -1, b = -1;
    rr.f.forEach((f, k) => { if (f > 0) { if (a < 0) a = k; b = k; } });
    const pStart = (rr.t0 + a * rr.dt) * 1000, pEnd = (rr.t0 + b * rr.dt) * 1000;
    const cov = (Math.min(core[core.length - 1].t, pEnd) - Math.max(core[0].t, pStart)) / Math.max(1, pEnd - pStart);
    fr += n; gross += g;
    if (g > 0 || cov < 0.6 || VERBOSE) notes.push(`#${i} ${toks[i].label}: ${g}/${n} gross ${devs.length ? '[' + devs.slice(0, 6).join(',') + ']' : ''} coverage ${(cov * 100).toFixed(0)}%`);
  }
  G.frames += fr; G.gross += gross;
  console.log(`${sp.id.padEnd(4)} centre ${centre.toFixed(1)} vs Praat ${truth.toFixed(1)} (${off >= 0 ? '+' : ''}${off.toFixed(2)} st)  gross ${gross}/${fr}  ${notes.join(' | ')}`);
}
console.log(`\nTOTAL gross frames ${G.gross}/${G.frames} (${(100 * G.gross / G.frames).toFixed(2)}%)   centres off by >2 st: ${G.badCentre}/${SPEAKERS.length}`);
