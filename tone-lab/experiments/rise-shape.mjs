// Can the model learn that an EARLIER rise from a low start is still the
// rising tone, without losing any native word? Uses the contours saved by
// experiments/dump-contours.mjs; every variant is judged leave-one-speaker-out
// on all native speakers, then (trained on all of them) on the learner's words.
//   node experiments/dump-contours.mjs && node experiments/rise-shape.mjs
//   RG='1.6;1.4,1.8' WT=0.5 node experiments/rise-shape.mjs   # chosen warps; also at half weight
//
// Native rising tones stay low until ~65% of the word; the learner's turn up
// at 35-50%, and the v2 model called them high. Adding copies of the native
// rising tones with the turn moved earlier (u -> u^gamma) fixes that. What
// the search found (October 2026, 23 native speakers, 145 words):
// - Copies of rising only, with the pooled covariance taken from real words
//   (so no other tone's model moves): unseen-speaker accuracy 138/145 for
//   every gamma tried, as without augmentation; with the calibration off by
//   +-1 st nothing is lost up to gamma 1.8; gamma 2 starts reading native high
//   tones as rising at +1 st. Chosen: 1.4 and 1.8 (turn at ~55% and ~46%).
// - Letting the copies into the pooled covariance, or warping every tone,
//   moved low/mid/falling decisions too (native words lost even at +-1 st).
// - Warping later (gamma < 1) is not a fix: it made the learner's rises
//   look even more like high.
import fs from 'node:fs';
import { loadEngine } from '../engine.mjs';

const HERE = new URL('../', import.meta.url).pathname;
const E = loadEngine(process.env.ENGINE || HERE + '../tone-trainer.js', 48000);
const R = JSON.parse(fs.readFileSync(process.env.CONTOURS || HERE + 'out/contours.json'));
const TONES = ['mid', 'low', 'falling', 'high', 'rising'];
const CAL = { trainer: 0.7, challenge: 1.0 };
const asCore = c => c.map(p => ({ t: p[0], hz: p[1] }));

// Time-warp a contour: what happened at relative time u now happens at
// u^gamma, so gamma > 1 moves the turn EARLIER (a native rising tone that
// turned up at 65% of the word now turns at 0.65^2 = 42%), gamma < 1 later.
function warpCore(core, gamma) {
  const t0 = core[0].t, D = core[core.length - 1].t - t0;
  return core.map(p => ({ t: t0 + D * Math.pow((p.t - t0) / D, gamma), hz: p.hz }));
}

let fold = 0;
function fit(rows, opts) {
  const F = rows[0].x.length;
  const meanOf = keep => TONES.map((_, c) => { const r = rows.filter(d => d.y === c && keep(d));
    return Array.from({ length: F }, (_, f) => r.reduce((a, d) => a + d.x[f] * (d.w || 1), 0) / r.reduce((a, d) => a + (d.w || 1), 0)); });
  const mu = meanOf(() => true), muReal = opts.poolReal ? meanOf(d => !d.aug) : mu;
  // Augmented copies (d.aug) shape only their own class; the pooled part of
  // every class's covariance comes from real words alone (opts.poolReal).
  const covOf = c => { const r = rows.filter(d => (c < 0 && !(opts.poolReal && d.aug)) || d.y === c); let W = 0;
    const S = Array.from({ length: F }, () => new Array(F).fill(0));
    const m = c < 0 ? muReal : mu;
    for (const d of r) { const w = d.w || 1; W += w; for (let a = 0; a < F; a++) for (let b = 0; b < F; b++) S[a][b] += w * (d.x[a] - m[d.y][a]) * (d.x[b] - m[d.y][b]); }
    return S.map(row => row.map(v => v / W)); };
  const pooled = covOf(-1), tr = pooled.reduce((a, r, i) => a + r[i], 0) / F;
  const cov = TONES.map((_, c) => covOf(c).map((row, a) => row.map((v, b) => {
    const m = (1 - opts.qda) * pooled[a][b] + opts.qda * v; return (1 - opts.shrink) * m + (a === b ? opts.shrink * tr : 0); })));
  return { id: 'f' + (fold++), mu, cov, temperature: 1, calSigma: CAL };
}
const argmax = a => a.indexOf(Math.max(...a));
const post = (x, m, s = CAL.trainer) => E.dsp.tonePosteriorsX(x, s, m).probs;

const base = R.filter(r => r.core).map(r => ({ ...r, y: TONES.indexOf(r.label), core: asCore(r.core) }));
const natives = base.filter(r => r.group === 'native');
const speakers = [...new Set(natives.map(d => d.spk))];
const learners = base.filter(r => r.group === 'learner' && r.sr === 48000);

function variant(name, { aug = () => [], qda = 0.5, shrink = 0.05, poolReal = false }) {
  const feat = (r, core = r.core) => E.dsp.toneFeatures(core, r.centre);
  const trainRows = rs => rs.flatMap(r => [{ x: feat(r), y: r.y }, ...aug(r).map(a => ({ x: feat(r, a.core), y: r.y, w: a.w, aug: true }))]);
  const shifts = [-2, -1, 0, 1, 2], acc = { 48000: shifts.map(() => 0), 44100: 0 }, miss = [], ok = {};
  let n48 = 0;
  for (const spk of speakers) {
    const m = fit(trainRows(natives.filter(d => d.spk !== spk)), { qda, shrink, poolReal });
    for (const d of natives.filter(d => d.spk === spk)) {
      const x = feat(d);
      if (d.sr === 44100) { if (argmax(post(x, m)) === d.y) acc[44100]++; continue; }
      n48++;
      shifts.forEach((s, k) => { const xs = x.slice(); xs[0] -= s; const good = argmax(post(xs, m)) === d.y; if (good) acc[48000][k]++;
        ok[d.spk + '#' + d.i + '@' + s] = good ? true : TONES[argmax(post(xs, m))]; });
      const p = post(x, m); if (argmax(p) !== d.y) miss.push(`${d.spk}#${d.i} ${d.label[0]}>${TONES[argmax(p)][0]}`);
    }
  }
  // The shipped model is trained on v2's 18 speakers (FINAL_ALL=1: all of them).
  const full = fit(trainRows(natives.filter(d => process.env.FINAL_ALL || !['holdout', 'new2'].includes(d.set))), { qda, shrink, poolReal });
  const inMiss = natives.filter(d => d.sr === 48000 && argmax(post(feat(d), full)) !== d.y);
  const inShift = [-2, -1, 1, 2].map(s => natives.filter(d => { const x = feat(d); x[0] -= s; return argmax(post(x, full)) === d.y; }).length);
  const unsure = natives.filter(d => d.sr === 48000 && argmax(post(feat(d), full)) === d.y && Math.max(...post(feat(d), full)) < 0.55);
  const lv = learners.map(d => { const p = post(feat(d), full); const k = argmax(p);
    return `${d.spk === 'L1app' ? 'app' + d.i : d.i}:${d.label[0].toUpperCase()}>${TONES[k][0]}${Math.round(100 * p[k])}`; });
  console.log(`${name.padEnd(28)} LOSO48 ${shifts.map((s, k) => acc[48000][k]).join('/')} of ${n48}  44k ${acc[44100]}   miss: ${miss.join(', ')}`);
  console.log(`${''.padEnd(28)} shipped model: 48k ${natives.filter(d => d.sr === 48000).length - inMiss.length} right (both rates at -2/-1/+1/+2: ${inShift.join('/')}), miss ${inMiss.map(d => d.spk + '#' + d.i + ' ' + d.label[0] + '>' + TONES[argmax(post(feat(d), full))][0]).join(', ')}; right but <55%: ${unsure.map(d => d.spk + '#' + d.i).join(', ') || 'none'}`);
  console.log(`${''.padEnd(28)} learner ${lv.join(' ')}`);
  if (BASE) { const ch = Object.keys(ok).filter(k => (ok[k] === true) !== (BASE[k] === true));
    if (ch.length) console.log(`${''.padEnd(28)} vs v2: ` + ch.map(k => (ok[k] === true ? '+' : '-') + k + (ok[k] === true ? '' : '>' + ok[k][0])).join(' ')); }
  return ok;
}
let BASE = null;

const W = gammas => r => gammas.map(g => ({ core: warpCore(r.core, g) }));
const onlyRising = f => r => r.label === 'rising' ? f(r) : [];
const weighted = (f, w) => r => f(r).map(a => ({ ...a, w }));
BASE = variant('v2 (no augmentation)', {});
for (const gs of (process.env.RG || '1.4;1.6;1.8;2;1.4,1.8;1.6,2').split(';').filter(Boolean).map(g => g.split(',').map(Number))) {
  variant('rising earlier x' + gs.join(','), { aug: onlyRising(W(gs)), poolReal: true });
  if (process.env.WT) variant('  .. weight ' + process.env.WT, { aug: onlyRising(weighted(W(gs), +process.env.WT)), poolReal: true });
}
