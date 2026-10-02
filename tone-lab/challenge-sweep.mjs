// Does the Challenge's ±1.5 st centre sweep let a WRONG level tone pass?
import fs from 'node:fs';
import { loadEngine } from './engine.mjs';
const OUT = new URL('./out/', import.meta.url).pathname;
const E = loadEngine(new URL('../tone-trainer.js', import.meta.url).pathname, 48000);
const R = JSON.parse(fs.readFileSync(OUT + 'results.json')).runs['48000'];
const SWEEP = [0, -0.5, 0.5, -1.0, 1.0, -1.5, 1.5], MAXP = 4;
function sweepScore(core, c, target) {   // verbatim logic of scoreWithCentreSweep
  let best = null, bestAdj = -1;
  for (const s of SWEEP) { const r = E.dsp.scoreAttempt(core, c * Math.pow(2, s / 12), target);
    const adj = r.percent - Math.abs(s) / 1.5 * MAXP; if (best === null || adj > bestAdj) { best = r; bestAdj = adj; } }
  return { ...best, percent: Math.max(0, Math.min(100, bestAdj)) };
}
const LEVEL = ['mid', 'low', 'high'];
let rows = [];
const stat = { trueNo: [], trueSw: [], wrongNo: [], wrongSw: [], wrongAccNo: 0, wrongAccSw: 0, nWrong: 0, trueAccNo: 0, trueAccSw: 0, nTrue: 0 };
for (const [name, sp] of Object.entries(R.speakers)) for (const r of sp.res) {
  const core = r.semis.map((v, k) => ({ t: r.ms[k], hz: sp.centre * Math.pow(2, v / 12) }));
  for (const target of LEVEL) {
    const a = E.dsp.scoreAttempt(core, sp.centre, target), b = sweepScore(core, sp.centre, target);
    if (target === r.label) { stat.nTrue++; stat.trueNo.push(a.percent); stat.trueSw.push(b.percent); stat.trueAccNo += a.isTarget; stat.trueAccSw += b.isTarget; }
    else if (LEVEL.includes(r.label)) { stat.nWrong++; stat.wrongNo.push(a.percent); stat.wrongSw.push(b.percent); stat.wrongAccNo += a.isTarget; stat.wrongAccSw += b.isTarget;
      if (b.isTarget) rows.push(`${name} said ${r.label} (${r.word}), target ${target}: ${a.percent}% -> ${b.percent.toFixed(0)}% with sweep (accepted)`); }
  }
}
const mean = a => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(0);
console.log(`Correct level tone (n=${stat.nTrue}): judged correct ${stat.trueAccNo} -> ${stat.trueAccSw} with sweep; mean score ${mean(stat.trueNo)}% -> ${mean(stat.trueSw)}%`);
console.log(`WRONG level tone   (n=${stat.nWrong}): wrongly accepted ${stat.wrongAccNo} -> ${stat.wrongAccSw} with sweep; mean score ${mean(stat.wrongNo)}% -> ${mean(stat.wrongSw)}%`);
rows.forEach(r => console.log('  ' + r));
