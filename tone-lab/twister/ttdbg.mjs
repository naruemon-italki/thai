// Debug one Tongue Twister attempt: capture stop reason, runs, segments, per-syllable verdicts.
//   node twister/ttdbg.mjs moo.ref [attempt] [centreHz] [SR]
import fs from 'node:fs';
import { loadEngine, noise } from '../engine.mjs';
import { TT_RECORDINGS, attemptsOf, loadTwisters } from './ttcorpus.mjs';
const [id, kStr = '0', cStr, srStr = '48000'] = process.argv.slice(2);
const SR = +srStr, HERE = new URL('../', import.meta.url).pathname;
const ENGINE = process.env.ENGINE || HERE + '../tone-trainer.js', TWISTER = process.env.TWISTER || HERE + '../tongue-twister.js';
const rec = TT_RECORDINGS.find(r => r.id === id), tw = loadTwisters(TWISTER)[rec.tw];
const centre = cStr ? +cStr : JSON.parse(fs.readFileSync(new URL('./centres.json', import.meta.url)))[id];
const E = loadEngine(ENGINE, SR, { scripts: [TWISTER] }); const TTD = E.sandbox.tongueTwisterDsp;
const a = attemptsOf(rec, SR)[+kStr];
const lead = Math.round(0.45 * SR); const take = noise(lead + a.pcm.length + Math.round(3.6 * SR), 0.0015, +kStr + 11);
for (let i = 0; i < a.pcm.length; i++) take[lead + i] += a.pcm[i];
const res = await E.captureWith(take, cap => ({ centreHint: centre, vad: TTD.vadFor(tw), onFrame: TTD.paceWatcher(tw.syllables.length, () => cap.stop('done')) }));
const lastT = res.frames[res.frames.length - 1].t;
console.log(`${id}#${kStr} centre ${centre.toFixed(1)} stop=${res.reason} frames=${res.frames.length} (to ${Math.round(lastT)} ms; speech ends ~${Math.round(450 + a.pcm.length / SR * 1000)} ms)`);
const utt = E.dsp.extractUtterance(res.frames, 0, centre);
console.log('runs:', utt.runs.map(r => `${Math.round(r.startMs)}-${Math.round(r.endMs)}`).join(' '));
const out = TTD.analyse(res.frames, 0, centre, tw);
if (!out.ok) { console.log('FAILED', out); process.exit(0); }
console.log(`${out.hits}/${out.count} ${out.percent}%  declination slope ${out.declination.slope.toFixed(4)} icept ${out.declination.icept.toFixed(2)}`);
out.results.forEach((r, i) => {
  const st = r.scored.map(p => (12 * Math.log2(p.hz / centre)).toFixed(1));
  console.log(`  ${tw.syllables[i].rom.padEnd(6)} want ${tw.syllables[i].tone.padEnd(8)} heard ${String(r.heard).padEnd(8)} ${String(r.percent).padStart(3)}%  ${Math.round(r.startMs)}-${Math.round(r.endMs)}  scored st: ${st.join(' ')}`);
});
