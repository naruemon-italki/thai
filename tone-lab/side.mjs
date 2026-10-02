// Engine contour vs Praat for one word: node side.mjs SPK IDX CENTRE
import fs from 'node:fs';
import { loadEngine, asTake } from './engine.mjs';
import { SPEAKERS, speakerTokens } from './corpus.mjs';
const [spk, idx, centre, eng] = process.argv.slice(2);
const SR = 48000, E = loadEngine(new URL(eng || '../tone-trainer.js', import.meta.url).pathname, SR);
const REF = JSON.parse(fs.readFileSync(new URL('./out/praat-ref.json', import.meta.url)));
const toks = speakerTokens(SPEAKERS.find(s => s.id === spk), SR), i = +idx, t = toks[i];
const r = await E.capture(asTake(t.pcm, SR, t.startMs, t.endMs, { seed: i + 1 }), +centre);
const core = E.dsp.extractContour(r.frames, r.thresholdRms, +centre);
const ref = REF[spk + '/' + i];
const pr = ms => { const k = Math.round((ms / 1000 - ref.t0) / ref.dt); return ref.f[k] || 0; };
console.log(spk, i, t.label, 'core', core.length);
const byT = new Map(core.map(p => [Math.round(p.t), p]));
for (const f of r.frames) {
  const p = byT.get(Math.round(f.t)); const pv = pr(f.t);
  if (!p && !pv) continue;
  console.log(String(Math.round(f.t)).padStart(5), 'eng', p ? Math.round(p.hz).toString().padStart(4) : '   -', ' praat', pv ? Math.round(pv).toString().padStart(4) : '   -', ' rms', (f.rms * 1000).toFixed(0).padStart(4), ' ', (f.cands || []).map(c => Math.round(c.hz) + ':' + c.v.toFixed(2)).join(' '));
}
