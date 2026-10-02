// Tongue Twister experiments: the app's analyse() re-implemented with every
// stage switchable, so pitch path, conditioning, declination, window choice and
// scorer can be measured one at a time on the same captures.
//   node twister/ttexp.mjs            # parity check + variant table
import fs from 'node:fs';
import { loadEngine, noise } from '../engine.mjs';
import { TT_RECORDINGS, attemptsOf, loadTwisters } from './ttcorpus.mjs';

const HERE = new URL('../', import.meta.url).pathname;
const ENGINE = HERE + '../tone-trainer.js', TWISTER = HERE + '../tongue-twister.js';
// Speaker centres from py/tt_centre.py (Praat), committed so the bench runs without Python.
const CENTRES = JSON.parse(fs.readFileSync(new URL('./centres.json', import.meta.url)));
const TW = loadTwisters(TWISTER);
export const TONES = ['mid', 'low', 'falling', 'high', 'rising'];
const st = (hz, c) => 12 * Math.log2(hz / c);
const hzOf = (v, c) => c * Math.pow(2, v / 12);
const med = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };

// ---- captures (cached per SR / offset / wordMode) ---------------------------
export async function collect(SRS = [48000, 44100], OFFS = [-2, -1, 0, 1, 2], modes = [false, true]) {
  const items = [];
  for (const SR of SRS) {
    const E = loadEngine(ENGINE, SR, { scripts: [TWISTER] });
    const TTD = E.sandbox.tongueTwisterDsp;
    for (const rec of TT_RECORDINGS) {
      const tw = TW[rec.tw];
      for (const [k, a] of attemptsOf(rec, SR).entries()) {
        const lead = rec.raw ? 0 : Math.round(0.45 * SR), take = noise(lead + a.pcm.length + Math.round(3.6 * SR), 0.0015, k + 11);
        for (let i = 0; i < a.pcm.length; i++) take[lead + i] += a.pcm[i];
        const it = { SR, E, TTD, rec, k, speed: a.speed, tw, caps: {} };
        for (const o of OFFS) for (const wm of modes) {
          const centre = (rec.centreHz || CENTRES[rec.id]) * Math.pow(2, o / 12);
          const res = await E.captureWith(take, cap => ({ centreHint: centre, wordMode: wm, vad: TTD.vadFor(tw),
            onFrame: TTD.paceWatcher(tw.syllables.length, () => { try { cap.stop('done'); } catch (e) {} }) }));
          it.caps[o + ':' + wm] = { centre, res };
        }
        items.push(it);
      }
    }
  }
  return items;
}

// ---- analyse() with switches --------------------------------------------------
// cfg.path     'v1' | 'word'      pitch path inside extractUtterance
// cfg.cond     'tt' | 'raw'       TTD.condition() or the syllable's own points
// cfg.decl     true | false       declination / register correction
// cfg.window   'tt' | 'narrow'    decisiveness-based wide/narrow choice, or narrow only
// cfg.scorer   'rules' | 'model'  the Twister's forked rules (+pool, +sweep) or a Gaussian tone model
// cfg.model    model object for 'model' (defaults to the engine's TONE_MODEL)
// cfg.sigma    calibration tolerance for 'model'
export function analyseX(it, o, cfg) {
  const d = it.E.dsp, TTD = it.TTD, tw = it.tw;
  const { centre: centreHz, res } = it.caps[o + ':' + !!cfg.wordMode];
  if (!res || res.reason === 'nospeech') return { ok: false, reason: 'nospeech' };
  const frames = res.frames;
  const tones = tw.syllables.map(s => s.tone), N = tones.length;
  const wp = cfg.path === 'word' ? true : (cfg.path && typeof cfg.path === 'object' ? cfg.path : false);
  const utt = d.extractUtterance(frames, (res && res.threshold) || 0, centreHz, { wordPath: wp });
  if (!utt) return { ok: false, reason: 'nospeech' };
  const seg = TTD.segment(frames, utt, N);
  if (!seg) return { ok: false, reason: 'tooshort' };
  if (seg.failed) return { ok: false, reason: 'count', heard: seg.found };
  const sylPts = seg.syls.map(s => s.pts);
  const centre = centreHz;
  const dec = cfg.decl === false ? { slope: 0, icept: 0, tRef: 0 } : TTD.declination(sylPts, tones, centre);
  // cond 'word': the syllable's slice of the capture goes through the whole
  // single-word pipeline (extractContour: v2 pitch path, refine, end trims),
  // i.e. each syllable is treated exactly like a word said on its own.
  const wordCore = src => {
    if (!src || !src.length) return [];
    const a = src[0].t - 40, b = src[src.length - 1].t + 40;
    const slice = frames.filter(f => f.t >= a && f.t <= b);
    return d.extractContour(slice, (res && res.threshold) || 0, centreHz) || [];
  };
  const condF = cfg.cond === 'raw' ? (p => p || []) : cfg.cond === 'word' ? wordCore : TTD.condition;
  // cfg.scale: expand the (declination-corrected) contour around the centre,
  // undoing the tonal undershoot of connected speech before a model trained
  // on isolated words judges it.
  const scale = cfg.scale || 1;
  const conditionedCore = src => condF(src).map(p => ({ t: p.t, hz: hzOf(scale * (st(p.hz, centre) - (dec.icept + dec.slope * (p.t - dec.tRef))), centre) }));
  const pool = [];
  for (let i = 0; i < N; i++) for (const p of conditionedCore(sylPts[i])) pool.push(p.hz);
  pool.sort((a, b) => a - b);
  const model = cfg.model || d.TONE_MODEL, sigma = cfg.sigma != null ? cfg.sigma : (model && model.calSigma ? model.calSigma.challenge : 1);
  const probs = c => d.tonePosteriorsX(d.toneFeatures(c, centre), sigma, model).probs;
  const decisive = c => {
    if (!c || c.length < 4) return -1;
    if (cfg.scorer === 'model') { const p = probs(c).slice().sort((a, b) => b - a); return p[0] - p[1]; }
    const sc = TTD.computeScores(c, centre, pool).sc; const ks = Object.keys(sc).sort((x, y) => sc[y] - sc[x]); return sc[ks[0]] - sc[ks[1]];
  };
  const results = []; let hits = 0, sum = 0;
  for (let i = 0; i < N; i++) {
    let core = conditionedCore(sylPts[i]);
    const wide = seg.syls[i].ptsWide;
    if (cfg.window !== 'narrow' && wide && wide.length > sylPts[i].length) {
      const coreW = conditionedCore(wide);
      if (decisive(coreW) > decisive(core)) core = coreW;
    }
    const accepted = [tones[i]].concat(tw.syllables[i].alt ? [tw.syllables[i].alt] : []);
    let best = null;
    for (const acc of accepted) {
      let r;
      if (core.length < 4) r = { percent: 0, tone: null, isTarget: false };
      else if (cfg.scorer === 'model') {
        const p = probs(core), top = p.indexOf(Math.max(...p));
        r = { percent: Math.round(100 * p[TONES.indexOf(acc)]), tone: TONES[top], isTarget: TONES[top] === acc, probs: p };
      } else r = TTD.scoreWithSweep(d, core, centre, acc, pool);
      if (best === null || r.percent > best.percent) best = r;
    }
    if (best.isTarget) hits++;
    sum += Math.round(best.percent);
    results.push({ percent: Math.round(best.percent), heard: best.tone, hit: best.isTarget, core, x: core.length >= 4 ? d.toneFeatures(core, centre) : null, target: tones[i], alt: tw.syllables[i].alt || null });
  }
  return { ok: true, hits, count: N, percent: Math.round(sum / N), results, dec };
}

export function score(items, cfg, { offsets = [0], srs = null, filter = () => true } = {}) {
  const out = { hit: 0, n: 0, failed: 0, perfect: 0, attempts: 0 };
  for (const it of items) {
    if (srs && !srs.includes(it.SR)) continue;
    if (!filter(it)) continue;
    for (const o of offsets) {
      const r = analyseX(it, o, cfg);
      out.attempts++;
      if (!r.ok) { out.failed++; out.n += it.tw.syllables.length; continue; }
      out.hit += r.hits; out.n += r.count; if (r.hits === r.count) out.perfect++;
    }
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('ttexp.mjs')) {
  const items = await collect();
  // 1. parity: all-v1 switches must reproduce TTD.analyse exactly.
  let same = 0, diff = 0;
  for (const it of items) {
    const { centre, res } = it.caps['0:false'];
    const a = it.TTD.analyse(res.frames, res.threshold || 0, centre, it.tw);
    const b = analyseX(it, 0, { path: 'v1', cond: 'tt', decl: true, window: 'tt', scorer: 'rules' });
    const ka = a.ok ? a.results.map(r => r.percent + r.heard).join() : a.reason, kb = b.ok ? b.results.map(r => r.percent + r.heard).join() : b.reason;
    if (ka === kb) same++; else { diff++; console.log('PARITY DIFF', it.SR, it.rec.id, it.k, ka, '|', kb); }
  }
  console.log(`parity with the app's analyse(): ${same} identical, ${diff} different\n`);
  const main = it => it.speed !== 'fast';
  const V = {
    'v1 (app today)':                     { path: 'v1', cond: 'tt', decl: true, window: 'tt', scorer: 'rules' },
    'v2 pitch path':                      { path: 'word', cond: 'tt', decl: true, window: 'tt', scorer: 'rules' },
    'v2 pitch path + wide band':          { path: 'word', wordMode: true, cond: 'tt', decl: true, window: 'tt', scorer: 'rules' },
    'v2 pitch + v2 model':                { path: 'word', wordMode: true, cond: 'tt', decl: true, window: 'tt', scorer: 'model' },
    'v2 pitch + v2 model, no TT condition': { path: 'word', wordMode: true, cond: 'raw', decl: true, window: 'tt', scorer: 'model' },
    'v2 pitch + v2 model, no declination':  { path: 'word', wordMode: true, cond: 'tt', decl: false, window: 'tt', scorer: 'model' },
    'v2 pitch + v2 model, narrow window':   { path: 'word', wordMode: true, cond: 'tt', decl: true, window: 'narrow', scorer: 'model' },
    'v1 pitch + v2 model':                { path: 'v1', cond: 'tt', decl: true, window: 'tt', scorer: 'model' },
    'each syllable as a word + v2 model': { path: 'word', wordMode: true, cond: 'word', decl: true, window: 'narrow', scorer: 'model' },
    '  same, no declination':             { path: 'word', wordMode: true, cond: 'word', decl: false, window: 'narrow', scorer: 'model' },
    '  same, trainer tolerance (0.7)':    { path: 'word', wordMode: true, cond: 'word', decl: true, window: 'narrow', scorer: 'model', sigma: 0.7 },
  };
  for (const sc of [1.5, 2, 2.5]) {
    V[`scale ${sc}: v2 pitch + TT cond + v2 model`] = { path: 'word', wordMode: true, cond: 'tt', decl: true, window: 'tt', scorer: 'model', scale: sc };
    V[`scale ${sc}: each syllable as word + v2 model`] = { path: 'word', wordMode: true, cond: 'word', decl: true, window: 'tt', scorer: 'model', scale: sc };
  }
  if (process.env.ONLY) for (const k of Object.keys(V)) if (!k.includes(process.env.ONLY)) delete V[k];
  console.log('variant'.padEnd(40), '@48k', '      @44.1k', '     ±1 st (both)', ' ±2 st (both)', ' fast(both)');
  for (const [name, cfg] of Object.entries(V)) {
    const a = score(items, cfg, { srs: [48000], filter: main }), b = score(items, cfg, { srs: [44100], filter: main });
    const r1 = score(items, cfg, { offsets: [-1, 1], filter: main }), r2 = score(items, cfg, { offsets: [-2, 2], filter: main });
    const f = score(items, cfg, { filter: it => it.speed === 'fast' });
    const p = x => `${x.hit}/${x.n}`.padEnd(9) + `${(100 * x.hit / x.n).toFixed(1)}%`;
    console.log(name.padEnd(40), p(a).padEnd(16), p(b).padEnd(16), p(r1).padEnd(16), p(r2).padEnd(15), `${f.hit}/${f.n}`);
  }
}
