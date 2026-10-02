// Guard for the DEFAULT sentence path (sentence capture without wordMode,
// extractUtterance with no options): it must give IDENTICAL output under two
// engine versions. Since Twister v2 the Twister itself opts into
// toneDsp.sentencePath; its results are measured by twister/ttrun.mjs.
//   node twister-invariance.mjs [engineA] [engineB]
import { loadEngine, decode, noise } from './engine.mjs';
import { SPEAKERS, AUDIO } from './corpus.mjs';
const HERE = new URL('./', import.meta.url).pathname;
const A = process.argv[2] || HERE + 'baseline/v1/tone-trainer.js', B = process.argv[3] || HERE + '../tone-trainer.js';
let same = 0, diff = 0;
for (const SR of [48000, 44100]) {
  const EA = loadEngine(A, SR), EB = loadEngine(B, SR);
  for (const sp of SPEAKERS.filter(s => s.kind === '5tone')) {
    const pcm = decode(AUDIO + sp.file + '.mp3', SR);
    const take = new Float32Array(pcm.length + SR * 2); take.set(noise(SR * 2, 0.0015, 3)); take.set(pcm, Math.round(SR * 0.4));
    for (let k = 0; k < take.length; k++) take[k] += 0; // (noise only in the lead-in/tail)
    const centre = 200;
    const vad = { multiSegment: true, minCaptureMs: pcm.length / SR * 1000 + 300, maxCaptureMs: 20000 };
    const ra = await EA.capture(take, centre, { wordMode: false, vad });
    const rb = await EB.capture(take, centre, { wordMode: false, vad });
    const ua = EA.dsp.extractUtterance(ra.frames, ra.thresholdRms, centre);
    const ub = EB.dsp.extractUtterance(rb.frames, rb.thresholdRms, centre);
    const ok = JSON.stringify(ua) === JSON.stringify(ub) && JSON.stringify(ra.frames.map(f => [f.t, f.hz, f.rms])) === JSON.stringify(rb.frames.map(f => [f.t, f.hz, f.rms]));
    if (ok) same++; else { diff++; console.log('DIFFERENT', SR, sp.id); }
  }
}
console.log(`Tongue Twister path: ${same} identical, ${diff} different`);
