// Tongue Twister bench: every native attempt goes through the app's own
// Twister capture (its VAD policy and pace watcher, no wordMode), then
// TTD.analyse() exactly as onCaptureEnd calls it. Usage (from tone-lab/):
//   node twister/ttrun.mjs                          # current ../tone-trainer.js + ../tongue-twister.js
//   ENGINE=baseline/v1/tone-trainer.js TWISTER=baseline/tt-v1/tongue-twister.js LABEL=tt-v1 node twister/ttrun.mjs
// Output: out/tt-results-<LABEL>.json
import fs from 'node:fs';
import path from 'node:path';
import { loadEngine, noise } from '../engine.mjs';
import { TT_RECORDINGS, attemptsOf, loadTwisters } from './ttcorpus.mjs';

const HERE = new URL('../', import.meta.url).pathname;
const ENGINE = path.resolve(HERE, process.env.ENGINE || '../tone-trainer.js');
const TWISTER = path.resolve(HERE, process.env.TWISTER || '../tongue-twister.js');
const LABEL = process.env.LABEL || 'current';
const SRS = (process.env.SRS || '48000,44100').split(',').map(Number);
const OFFS = (process.env.OFFS || '-2,-1,0,1,2').split(',').map(Number);
// Speaker centres from py/tt_centre.py (Praat), committed so the bench runs without Python.
const CENTRES = JSON.parse(fs.readFileSync(new URL('./centres.json', import.meta.url)));
const TW = loadTwisters(TWISTER);
const READS_RMS = fs.readFileSync(TWISTER, 'utf8').includes('res.thresholdRms');

// What the learner's phone delivers: tap, ~0.45 s of room, the sentence, and
// room noise until the pace watcher decides they have finished.
function asTtTake(pcm, sr, seed) {
  const lead = Math.round(0.45 * sr), tail = Math.round(3.6 * sr);
  const out = noise(lead + pcm.length + tail, 0.0015, seed);
  for (let i = 0; i < pcm.length; i++) out[lead + i] += pcm[i];
  return out;
}

const out = { label: LABEL, engine: path.relative(HERE, ENGINE), twister: path.relative(HERE, TWISTER),
              date: new Date().toISOString(), offsets: OFFS, runs: {} };
const t0 = Date.now();
for (const SR of SRS) {
  const E = loadEngine(ENGINE, SR, { scripts: [TWISTER] });
  const TTD = E.sandbox.tongueTwisterDsp;
  const run = out.runs[SR] = [];
  for (const rec of TT_RECORDINGS) {
    const tw = TW[rec.tw];
    const N = tw.syllables.length;
    for (const [k, a] of attemptsOf(rec, SR).entries()) {
      // An app export already IS a capture (lead-in included); only add room
      // noise after it so the pace watcher can end the capture as it did.
      const take = rec.raw ? (() => { const t = noise(a.pcm.length + Math.round(3.6 * SR), 0.0015, k + 11); t.set(a.pcm); return t; })()
                           : asTtTake(a.pcm, SR, k + 11);
      const row = { id: rec.id, k, kind: rec.kind, speed: a.speed, tw: rec.tw,
                    targets: tw.syllables.map(s => s.alt ? s.tone + '|' + s.alt : s.tone), byOffset: {} };
      for (const o of OFFS) {
        const centre = (rec.centreHz || CENTRES[rec.id]) * Math.pow(2, o / 12);
        const res = await E.captureWith(take, cap => ({
          centreHint: centre, vad: TTD.vadFor(tw),
          onFrame: TTD.paceWatcher(N, () => { try { cap.stop('done'); } catch (e) {} })
        }));
        let r;
        if (!res || res.reason === 'nospeech') r = { ok: false, reason: 'nospeech' };
        // Exactly as that version's onCaptureEnd: v1 read the non-existent
        // res.threshold (always 0); later versions read res.thresholdRms.
        else r = TTD.analyse(res.frames, (READS_RMS ? (res.thresholdRms || res.threshold) : res.threshold) || 0, centre, tw);
        row.byOffset[o] = r.ok
          ? { ok: true, percent: r.percent, hits: r.hits, count: r.count, stop: res.reason,
              syl: r.results.map(s => ({ p: s.percent, heard: s.heard, hit: s.isTarget })) }
          : { ok: false, reason: r.reason, heard: r.heard, stop: res && res.reason };
      }
      run.push(row);
      const z = row.byOffset[0];
      process.stderr.write(`${SR} ${rec.id.padEnd(12)}#${k}${a.speed ? '(' + a.speed + ')' : ''}  ` +
        (z.ok ? `${z.hits}/${z.count} ${z.percent}%  ` + z.syl.map((s, i) => s.hit ? tw.syllables[i].tone[0].toUpperCase() : (s.heard ? s.heard[0] : '-')).join('') : 'FAILED ' + z.reason + (z.heard ? ' heard ' + z.heard : '')) + '\n');
    }
  }
}
fs.mkdirSync(HERE + 'out', { recursive: true });
fs.writeFileSync(process.env.OUT || HERE + `out/tt-results-${LABEL}.json`, JSON.stringify(out));
process.stderr.write(`saved in ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
