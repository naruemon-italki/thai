// Runs one engine version over the whole corpus and saves everything the
// metrics need. Usage:
//   node run.mjs                                   # current ../tone-trainer.js
//   ENGINE=baseline/v1/tone-trainer.js LABEL=v1 node run.mjs
// The Challenge file is taken from the same folder as the engine unless
// CHALLENGE is set. Output: out/results-<LABEL>.json
import fs from 'node:fs';
import path from 'node:path';
import { loadEngine, asTake, loadChallengeScorer, bakedExamples } from './engine.mjs';
import { SPEAKERS, SINGLE_WORDS, TONES, singleWord } from './corpus.mjs';
import { calibrate, speakerSet } from './lab.mjs';

const HERE = new URL('./', import.meta.url).pathname;
const ENGINE = path.resolve(HERE, process.env.ENGINE || '../tone-trainer.js');
const CHALLENGE = path.resolve(HERE, process.env.CHALLENGE || path.join(path.dirname(ENGINE), 'tone-challenge.js'));
const LABEL = process.env.LABEL || 'current';
const SRS = (process.env.SRS || '48000,44100').split(',').map(Number);
const OFFS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
const st = (hz, c) => 12 * Math.log2(hz / c);
const r2 = x => Math.round(x * 100) / 100;

async function analyse(E, take, profile) {
  const c = profile.centerHz;
  const r = await E.capture(take, c);
  const core = E.dsp.extractContour(r.frames, r.thresholdRms, c);
  if (!core) return { tone: null, core: null };
  const k = E.dsp.classify(core, c, profile);
  if (!k) return { tone: null, core };
  const tier = E.dsp.confidenceTier ? E.dsp.confidenceTier(k.confidence)
             : (k.confidence >= 0.6 ? 'clear' : k.confidence >= 0.35 ? 'likely' : 'unsure');   // v1 thresholds
  return { tone: k.tone, conf: r2(k.confidence), tier, runnerUp: k.runnerUp,
           probs: k.probs || (k.m && k.m.scores) || null, core,
           semis: core.map(p => r2(st(p.hz, c))), ms: core.map(p => Math.round(p.t)) };
}

const out = { label: LABEL, engine: path.relative(HERE, ENGINE), challenge: path.relative(HERE, CHALLENGE),
              date: new Date().toISOString(), offsets: OFFS, tones: TONES, runs: {} };
const t0 = Date.now();
for (const SR of SRS) {
  const E = loadEngine(ENGINE, SR);
  // Experiment hook: TRIMS=creak,reversal enables only those end-of-word trims.
  if (process.env.TRIMS !== undefined && E.dsp._lab && E.dsp._lab.wordTrims) {
    const on = process.env.TRIMS.split(',');
    for (const k of Object.keys(E.dsp._lab.wordTrims)) E.dsp._lab.wordTrims[k] = on.includes(k);
  }
  const scoreTarget = loadChallengeScorer(CHALLENGE);
  const run = out.runs[SR] = { speakers: {}, examples: [], singles: {} };
  for (const sp of SPEAKERS) {
    const { toks, takes, calTakes, spare, fixed } = speakerSet(sp, SR);
    const profile = fixed || await calibrate(E, calTakes, spare);
    const rec = run.speakers[sp.id] = { group: sp.group, set: sp.set, file: sp.file || sp.suffix, profile, tokens: [] };
    if (!profile) { process.stderr.write(`${SR} ${sp.id}: calibration FAILED\n`); continue; }
    for (let i = 0; i < toks.length; i++) {
      const a = await analyse(E, takes[i], profile);
      const sweep = [];
      for (const o of OFFS) {
        if (o === 0 || process.env.NOSWEEP) { sweep.push(o === 0 ? a.tone : null); continue; }
        sweep.push((await analyse(E, takes[i], { ...profile, centerHz: profile.centerHz * Math.pow(2, o / 12) })).tone);
      }
      const challenge = {};
      if (a.core) for (const target of TONES) {
        const s = scoreTarget(E.dsp, a.core, profile.centerHz, target, profile);
        challenge[target] = { pct: Math.round(s.percent), hit: !!s.isTarget };
      }
      const { core, ...keep } = a;
      rec.tokens.push({ label: toks[i].label, idx: toks[i].idx, file: toks[i].file, ...keep, sweep, challenge });
    }
    process.stderr.write(`${SR} ${sp.id.padEnd(4)} ${profile.centerHz.toFixed(1)} Hz  ` +
      rec.tokens.map(t => (t.tone === t.label ? t.label[0].toUpperCase() : (t.tone ? t.tone[0] : '-'))).join('') + '\n');
  }
  // Baked example buttons: classified exactly as playRefWord does.
  for (const w of bakedExamples(ENGINE)) {
    const k = E.dsp.classify(w.pts.map(p => ({ t: p[0], hz: p[1] })), w.centre, { centerHz: w.centre });
    const tier = k ? (E.dsp.confidenceTier ? E.dsp.confidenceTier(k.confidence) : (k.confidence >= 0.6 ? 'clear' : k.confidence >= 0.35 ? 'likely' : 'unsure')) : null;
    run.examples.push({ id: w.id, label: w.tone, tone: k && k.tone, conf: k && r2(k.confidence), tier });
  }
  // Example-word mp3s analysed live. Source C has three mid words and is
  // calibrated on them; A and B have no mid word and are analysed at 200 Hz.
  const singles = {};
  for (const [id, tone, src] of SINGLE_WORDS) {
    const pcm = singleWord(id, SR);
    singles[id] = { tone, src, take: asTake(pcm, SR, 0, pcm.length / SR * 1000, { padMs: 0, seed: 7 }) };
  }
  const calC = await calibrate(E, ['gin', 'bpai', 'nom'].map(id => singles[id].take), []);
  for (const [id, s] of Object.entries(singles)) {
    const profile = s.src === 'C' ? calC : { centerHz: 200 };
    const { core, ...a } = await analyse(E, s.take, profile);
    run.singles[id] = { label: s.tone, src: s.src, centerHz: profile.centerHz, ...a };
  }
}
fs.mkdirSync(HERE + 'out', { recursive: true });
const file = process.env.OUT || HERE + 'out/results-' + LABEL + '.json';
fs.writeFileSync(file, JSON.stringify(out));
process.stderr.write(`saved ${path.relative(process.cwd(), file)} in ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
