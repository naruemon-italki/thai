// Trains the statistical tone model and writes it into ../tone-trainer.js
// (between the @tone-model markers) and model/tone-model.json.
//
//   node train.mjs            # evaluate (leave-one-speaker-out) + write the model
//   node train.mjs --dry      # evaluate only, change nothing
//
// Data: every NATIVE word in the corpus, captured through the engine's own
// front end at 48 kHz and 44.1 kHz (two slightly different contours per word,
// which doubles as augmentation), each speaker calibrated the app's way.
// Features are computed by the engine's own toneFeatures(), so training and
// the app cannot disagree about what a contour "looks like". The learner is
// never used for training.
//
// Augmentation: every native rising tone is also added with its time axis
// warped so the turn up comes earlier (experiments/rise-shape.mjs). Natives
// stay low until ~65% of the word; learners typically turn at 35-50%, which
// a native still hears as rising (the partner heard mistake-1.wav as "dog").
// The copies shape only the rising class: the pooled part of every class's
// covariance is computed from real words alone.
import fs from 'node:fs';
import { loadEngine } from './engine.mjs';
import { SPEAKERS, calibrate, speakerSet } from './lab.mjs';

const HERE = new URL('./', import.meta.url).pathname;
const ENGINE = HERE + '../tone-trainer.js';
const DRY = process.argv.includes('--dry');
const TONES = ['mid', 'low', 'falling', 'high', 'rising'];
const OPTS = { qda: 0.5, shrink: 0.05 };        // chosen by experiments/classifier-search.mjs
const AUG = { tone: 'rising',                    // chosen by experiments/rise-shape.mjs
  gamma: (process.env.AUG_GAMMA ?? '1.4,1.8').split(',').filter(Boolean).map(Number) };   // AUG_GAMMA= : none
// What happened at relative time u now happens at u^gamma (gamma > 1: earlier).
const warpCore = (core, g) => { const t0 = core[0].t, D = core[core.length - 1].t - t0;
  return core.map(p => Object.assign({}, p, { t: t0 + D * Math.pow((p.t - t0) / D, g) })); };
const CAL_SIGMA = { trainer: 0.7, challenge: 1.0 };

// ---- 1. contours -> features ------------------------------------------------
const data = [];
for (const SR of [48000, 44100]) {
  const E = loadEngine(ENGINE, SR);
  for (const sp of SPEAKERS) {
    if (sp.group === 'volume') continue;           // a louder copy of F7, not a new voice
    // Keep unseen voices unseen: the shipped model is trained on the 18 speakers
    // v2 was built from; the sets recorded later stay an honest test.
    if (!process.env.ALL_SPEAKERS && (sp.set === 'holdout' || sp.set === 'new2')) continue;
    const { toks, takes, calTakes, spare, fixed } = speakerSet(sp, SR);
    const profile = fixed || await calibrate(E, calTakes, spare);
    if (!profile) { console.error('calibration failed', sp.id, SR); continue; }
    for (let i = 0; i < toks.length; i++) {
      const r = await E.capture(takes[i], profile.centerHz);
      const core = E.dsp.extractContour(r.frames, r.thresholdRms, profile.centerHz);
      if (!core) { console.error('no contour', sp.id, i, SR); continue; }
      const row = { spk: sp.id, group: sp.group, sr: SR, i, y: TONES.indexOf(toks[i].label) };
      data.push({ ...row, x: E.dsp.toneFeatures(core, profile.centerHz) });
      if (sp.group === 'native' && toks[i].label === AUG.tone)
        for (const g of AUG.gamma) data.push({ ...row, aug: true, x: E.dsp.toneFeatures(warpCore(core, g), profile.centerHz) });
    }
  }
  process.stderr.write(`features @${SR} done\n`);
}
const E = loadEngine(ENGINE, 48000);
const post = (x, sigma, model) => E.dsp.tonePosteriorsX(x, sigma, model);

// ---- 2. fitting --------------------------------------------------------------
let fold = 0;
function fit(rows, temperature = 1) {
  const F = rows[0].x.length;
  const meanOf = rs => TONES.map((_, c) => {
    const r = rs.filter(d => d.y === c);
    return Array.from({ length: F }, (_, f) => r.reduce((a, d) => a + d.x[f], 0) / r.length);
  });
  const real = rows.filter(d => !d.aug);
  const mu = meanOf(rows), muReal = meanOf(real);
  const covOf = c => {
    const r = c < 0 ? real : rows.filter(d => d.y === c), m = c < 0 ? muReal : mu;
    const S = Array.from({ length: F }, () => new Array(F).fill(0));
    for (const d of r) for (let a = 0; a < F; a++) for (let b = 0; b < F; b++) S[a][b] += (d.x[a] - m[d.y][a]) * (d.x[b] - m[d.y][b]);
    return S.map(row => row.map(v => v / r.length));
  };
  const pooled = covOf(-1);
  const tr = pooled.reduce((a, r, i) => a + r[i], 0) / F;
  const cov = TONES.map((_, c) => {
    const Sc = covOf(c);
    return Sc.map((row, a) => row.map((v, b) => {
      const m = (1 - OPTS.qda) * pooled[a][b] + OPTS.qda * v;
      return (1 - OPTS.shrink) * m + (a === b ? OPTS.shrink * tr : 0);
    }));
  });
  return { id: 'fold' + (fold++), mu, cov, temperature, calSigma: CAL_SIGMA };
}
const argmax = a => a.indexOf(Math.max(...a));
const natives = data.filter(d => d.group === 'native');      // incl. the warped copies (training only)
const speakers = [...new Set(natives.map(d => d.spk))];

// ---- 3. leave-one-speaker-out ---------------------------------------------
function loso(temperature) {
  const rows = [];
  for (const spk of speakers) {
    const model = fit(natives.filter(d => d.spk !== spk), temperature);
    for (const d of natives.filter(d => d.spk === spk && !d.aug)) rows.push({ d, model });
  }
  return rows;
}
// Temperature: minimise held-out negative log-likelihood (48k words only).
let bestT = 1, bestNll = Infinity;
for (let T = 0.75; T <= 3.01; T += 0.25) {
  const rows = loso(T).filter(r => r.d.sr === 48000);
  const nll = rows.reduce((a, r) => a - Math.log(Math.max(1e-9, post(r.d.x, CAL_SIGMA.trainer, r.model).probs[r.d.y])), 0);
  if (nll < bestNll) { bestNll = nll; bestT = T; }
}
const rows = loso(bestT);
const evalAt = (sr, shift) => rows.filter(r => r.d.sr === sr).filter(r => {
  const x = r.d.x.slice(); x[0] -= shift;
  return argmax(post(x, CAL_SIGMA.trainer, r.model).probs) === r.d.y;
}).length;
const n48 = rows.filter(r => r.d.sr === 48000).length;
const shifts = [-2, -1, 0, 1, 2];
const evalSummary = {
  method: 'leave-one-speaker-out, ' + speakers.length + ' native speakers, ' + n48 + ' words',
  accuracy48k: shifts.map(s => evalAt(48000, s)),
  accuracy44k: evalAt(44100, 0),
  shifts,
};
// Reliability of the stated confidence on unseen speakers (48k): of the
// answers given at >= c, how many were right?
const rel = [0.95, 0.8, 0.55].map(c => {
  const sel = rows.filter(r => r.d.sr === 48000).map(r => post(r.d.x, CAL_SIGMA.trainer, r.model).probs).map((p, i, arr) => p)
    .map((p, i) => ({ p, y: rows.filter(r => r.d.sr === 48000)[i].d.y })).filter(o => Math.max(...o.p) >= c);
  return { atLeast: c, right: sel.filter(o => argmax(o.p) === o.y).length, of: sel.length };
});
evalSummary.reliability = rel;
console.log(`temperature ${bestT}`);
console.log('reliability (unseen speakers):', rel.map(r => `>=${r.atLeast}: ${r.right}/${r.of}`).join('  '));
console.log(`LOSO @48k by calibration error ${shifts.map((s, k) => (s > 0 ? '+' : '') + s + ':' + evalSummary.accuracy48k[k]).join(' ')} /${n48}   @44.1k ${evalSummary.accuracy44k}/${n48}`);
for (const r of rows.filter(r => r.d.sr === 48000)) {
  const p = post(r.d.x, CAL_SIGMA.trainer, r.model).probs; const k = argmax(p);
  if (k !== r.d.y) console.log(`   miss ${r.d.spk}#${r.d.i} ${TONES[r.d.y]} -> ${TONES[k]} (${(p[k] * 100).toFixed(0)}%)`);
}

// ---- 4. final model on all natives -------------------------------------------
const final = fit(natives, bestT);
const r4 = v => Math.round(v * 1e4) / 1e4;
const MODEL = {
  id: 'tm-' + new Date().toISOString().slice(0, 10) + (AUG.gamma.length ? '-rw' + AUG.gamma.join('-') : ''),
  tones: TONES,
  features: 'DCT 0-3 of the semitone contour (re calibrated centre), 20 time-normalised points',
  trainedOn: `${natives.filter(d => !d.aug).length} contours = ${natives.filter(d => !d.aug).length / 2} native words x (48k, 44.1k), ${speakers.length} speakers`,
  augmentation: `+${natives.filter(d => d.aug).length} ${AUG.tone} contours time-warped u -> u^${AUG.gamma.join('/')} (the rise comes earlier)`,
  mu: final.mu.map(r => r.map(r4)),
  cov: final.cov.map(m => m.map(r => r.map(r4))),
  temperature: bestT,
  calSigma: CAL_SIGMA,
  eval: evalSummary,
};
const learner = data.filter(d => d.group === 'learner' && d.sr === 48000);
console.log('learner (intended -> model):', learner.map(d => { const p = post(d.x, CAL_SIGMA.trainer, final).probs; return TONES[d.y][0].toUpperCase() + '>' + TONES[argmax(p)][0]; }).join(' '));

if (!DRY) {
  fs.mkdirSync(HERE + 'model', { recursive: true });
  fs.writeFileSync(HERE + 'model/tone-model.json', JSON.stringify(MODEL, null, 1));
  let src = fs.readFileSync(ENGINE, 'utf8');
  const a = src.indexOf('/* @tone-model:begin */'), b = src.indexOf('/* @tone-model:end */');
  if (a < 0 || b < 0) throw new Error('markers not found in tone-trainer.js');
  const json = JSON.stringify(MODEL).replace(/,"/g, ', "');
  src = src.slice(0, a) + '/* @tone-model:begin */\n  const TONE_MODEL = ' + json + ';\n  ' + src.slice(b);
  fs.writeFileSync(ENGINE, src);
  console.log('model written to tone-trainer.js and model/tone-model.json');
}
