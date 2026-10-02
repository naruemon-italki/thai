// Main experiment: app-faithful calibration + classification + centre sweep.
import fs from 'node:fs';
import { loadEngine, decode, asTake } from './engine.mjs';
import { SPEAKER_FILES, SINGLE_WORDS, TONES, AUDIO, speakerTokens } from './corpus.mjs';

const HERE = new URL('./', import.meta.url).pathname;
const ENGINE = process.env.ENGINE || HERE + '../tone-trainer.js';
const SRS = (process.env.SRS || '48000,44100').split(',').map(Number);
const OFFS = []; for (let o = -3; o <= 3.001; o += 0.25) OFFS.push(+o.toFixed(2));
const st = (hz, c) => 12 * Math.log2(hz / c);

async function analyse(E, take, centre) {
  const r = await E.capture(take, centre);
  const core = E.dsp.extractContour(r.frames, r.thresholdRms, centre);
  if (!core) return { tone: null };
  const c = E.dsp.classify(core, centre);
  return { tone: c.tone, conf: c.confidence, runnerUp: c.runnerUp, scores: c.m.scores, m: c.m,
           semis: core.map(p => +st(p.hz, centre).toFixed(2)), ms: core.map(p => Math.round(p.t)) };
}

// The app's calibration, step for step (onCalCaptureEnd + finalizeCalibration).
async function appCalibrate(E, takes) {
  const medians = [], all = [];
  for (const take of takes) {
    const r = await E.capture(take, 0);                       // centreHint: 0 during calibration
    const hint = medians.length ? E.dsp.median(medians) : 0;  // calHint
    const cleaned = E.dsp.extractContour(r.frames, r.thresholdRms, hint);
    if (!cleaned || cleaned.length < 4) return null;
    const hz = cleaned.map(p => p.hz);
    medians.push(E.dsp.median(hz)); all.push(...hz);
  }
  return { centre: E.dsp.median(medians.slice().sort((a, b) => a - b)), medians };
}

const out = { offsets: OFFS, runs: {} };
for (const SR of SRS) {
  const E = loadEngine(ENGINE, SR);
  const run = out.runs[SR] = { speakers: {}, singles: {} };
  for (const name of Object.keys(SPEAKER_FILES)) {
    const toks = speakerTokens(name, SR);
    const takes = toks.map((t, i) => asTake(t.pcm, SR, t.startMs, t.endMs, { seed: i + 1 }));
    // Calibrate on this speaker's own mid-tone word, said three times (the app
    // asks for three different mid words; we only have one per speaker).
    const cal = await appCalibrate(E, [takes[0], takes[0], takes[0]]);
    const centre = cal.centre;
    const res = [];
    for (let i = 0; i < 5; i++) {
      const a = await analyse(E, takes[i], centre);
      const sweep = [];
      for (const o of OFFS) sweep.push((await analyse(E, takes[i], centre * Math.pow(2, o / 12))).tone);
      res.push({ word: toks[i].word, label: toks[i].tone, ...a, sweep });
    }
    run.speakers[name] = { centre, res };
    process.stderr.write(`${SR} ${name} centre=${centre.toFixed(1)} -> ${res.map(r => r.tone || "-").join(",")}\n`);
  }
  // Single words. Source C has three mid words: calibrate on them exactly as
  // the app would (three different mid words). A and B have no mid word.
  const singles = {};
  for (const [id, tone, src] of SINGLE_WORDS) {
    const pcm = decode(AUDIO + id + '.mp3', SR);
    singles[id] = { tone, src, take: asTake(pcm, SR, 0, pcm.length / SR * 1000, { padMs: 0, seed: 7 }) };
  }
  const calC = await appCalibrate(E, ['gin', 'bpai', 'nom'].map(id => singles[id].take));
  run.singles.calC = calC.centre;
  for (const [id, s] of Object.entries(singles)) {
    const centre = s.src === 'C' ? calC.centre : 200;
    const a = await analyse(E, s.take, centre);
    // Absolute sweep for the tolerance window: 120..300 Hz in quarter tones.
    const sweepHz = [];
    for (let c = 120; c <= 300; c *= Math.pow(2, 0.25 / 12)) sweepHz.push([+c.toFixed(1), (await analyse(E, s.take, c)).tone]);
    run.singles[id] = { label: s.tone, src: s.src, centre, ...a, sweepHz };
  }
  process.stderr.write(`${SR} singles done, C centre ${calC.centre.toFixed(1)}\n`);
}
fs.mkdirSync(HERE + 'out', { recursive: true });
fs.writeFileSync(process.env.OUT || HERE + 'out/results.json', JSON.stringify(out));
