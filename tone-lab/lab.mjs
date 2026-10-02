// Helpers shared by run.mjs, train.mjs and pitchcheck.mjs.
import { asTake } from './engine.mjs';
import { SPEAKERS, speakerTokens, calibrationTokens } from './corpus.mjs';

// The app's calibration. Engines from v2 expose the per-word and final steps
// on toneDsp (calibrationWord / finalizeCalibration), so this mirrors the
// modal exactly, including asking for an extra word when the first three
// disagree. For v1 the logic of onCalCaptureEnd + finalizeCalibration is
// reproduced here.
export async function calibrate(E, takes, spare = []) {
  const d = E.dsp;
  if (d.calibrationWord && d.finalizeCalibration) {
    const words = [];
    const queue = takes.slice(), extra = spare.slice();
    while (queue.length) {
      const r = await E.capture(queue.shift(), 0);
      const w = d.calibrationWord(r.frames, r.thresholdRms, words);
      if (w) words.push(w);
      if (!queue.length) {
        const fin = d.finalizeCalibration(words);
        if (fin && fin.needMore && extra.length) { queue.push(extra.shift()); continue; }
        return fin && fin.profile ? fin.profile : null;
      }
    }
    return null;
  }
  const medians = [];
  for (const take of takes) {
    const r = await E.capture(take, 0);
    const hint = medians.length ? d.median(medians) : 0;
    const cleaned = d.extractContour(r.frames, r.thresholdRms, hint);
    if (!cleaned || cleaned.length < 4) return null;
    medians.push(d.median(cleaned.map(p => p.hz)));
  }
  return { centerHz: d.median(medians.slice().sort((a, b) => a - b)) };
}

// Every speaker's takes (same lead-in noise and seeds everywhere), plus the
// calibration takes and spare mid words for a "say one more" request.
export function speakerSet(sp, SR) {
  const toks = speakerTokens(sp, SR);
  const takes = toks.map((t, i) => asTake(t.pcm, SR, t.startMs, t.endMs, { seed: i + 1 }));
  const calToks = calibrationTokens(sp, toks);
  const calTakes = calToks.map(t => takes[toks.indexOf(t)]);
  const spare = toks.filter(t => t.label === 'mid' && !calToks.includes(t)).map(t => takes[toks.indexOf(t)]);
  return { toks, takes, calTakes, spare };
}

export { SPEAKERS };
