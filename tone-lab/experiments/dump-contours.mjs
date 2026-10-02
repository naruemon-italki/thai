// Captures every corpus word through the engine's front end once (both sample
// rates, each speaker calibrated the app's way) and saves the cleaned contours,
// so feature/model experiments can run in seconds.
//   node experiments/dump-contours.mjs [out.json]
import fs from 'node:fs';
import { loadEngine } from '../engine.mjs';
import { SPEAKERS, calibrate, speakerSet } from '../lab.mjs';

const HERE = new URL('../', import.meta.url).pathname;
const ENGINE = process.env.ENGINE || HERE + '../tone-trainer.js';
const OUT = process.argv[2] || HERE + 'out/contours.json';
const rows = [];
for (const SR of [48000, 44100]) {
  const E = loadEngine(ENGINE, SR);
  for (const sp of SPEAKERS) {
    if (sp.group === 'volume') continue;
    const { toks, takes, calTakes, spare, fixed } = speakerSet(sp, SR);
    const profile = fixed || await calibrate(E, calTakes, spare);
    if (!profile) { console.error('calibration failed', sp.id, SR); continue; }
    for (let i = 0; i < toks.length; i++) {
      const r = await E.capture(takes[i], profile.centerHz);
      const core = E.dsp.extractContour(r.frames, r.thresholdRms, profile.centerHz);
      rows.push({ spk: sp.id, group: sp.group, set: sp.set, sr: SR, i, label: toks[i].label, note: toks[i].note || null,
                  centre: profile.centerHz, core: core ? core.map(p => [+p.t.toFixed(1), +p.hz.toFixed(2), +(p.rms || 0).toFixed(5)]) : null });
    }
  }
  process.stderr.write(`@${SR} done\n`);
}
fs.mkdirSync(HERE + 'out', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(rows));
console.log(rows.length, 'words ->', OUT);
