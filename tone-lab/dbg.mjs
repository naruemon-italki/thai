// Debug one word: frame-by-frame pitch/energy and the runs the engine builds.
import { loadEngine, asTake } from './engine.mjs';
import { SPEAKERS, speakerTokens } from './corpus.mjs';
const [spk, idx, centre = '0', eng = '../tone-trainer.js'] = process.argv.slice(2);
const SR = 48000, E = loadEngine(new URL(eng, import.meta.url).pathname, SR);
const sp = SPEAKERS.find(s => s.id === spk);
const toks = speakerTokens(sp, SR); const i = +idx; const t = toks[i];
const take = asTake(t.pcm, SR, t.startMs, t.endMs, { seed: i + 1 });
const r = await E.capture(take, +centre);
console.log(spk, t.label, t.file, 'reason', r.reason, 'thr', r.thresholdRms.toFixed(4), 'frames', r.frames.length);
let line = '';
for (const f of r.frames) {
  if (f.t < 300) continue;
  const c = (f.cands || []).slice(0, 3).map(c => Math.round(c.hz) + ':' + c.v.toFixed(2)).join(',');
  line += `${Math.round(f.t)} ${f.hz ? Math.round(f.hz) : '-'} ${(f.rms * 1000).toFixed(1)} [${c}]\n`;
}
console.log(line);
const core = E.dsp.extractContour(r.frames, r.thresholdRms, +centre);
console.log('core', core && core.length, core && Math.round(core[0].t), core && Math.round(core[core.length - 1].t), core && core.map(p => Math.round(p.hz)).join(' '));
