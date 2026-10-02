// One-time prep: writes every attempt as WAV for Praat -> out/tt/
import fs from 'node:fs';
import { loadEngine } from '../engine.mjs';
import { TT_RECORDINGS, attemptsOf, loadTwisters } from './ttcorpus.mjs';
const OUT = new URL('../out/tt/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const E = loadEngine(new URL('../../tone-trainer.js', import.meta.url).pathname, 48000);
const TW = loadTwisters();
const index = [];
for (const r of TT_RECORDINGS) attemptsOf(r, 48000).forEach((a, k) => {
  const wav = `${r.id}_${k}.wav`;
  fs.writeFileSync(OUT + wav, Buffer.from(E.dsp.encodeWav(a.pcm, 48000)));
  index.push({ id: r.id, k, wav, tones: TW[r.tw].syllables.map(s => s.tone) });
});
fs.writeFileSync(OUT + 'index.json', JSON.stringify(index));
console.log(index.length, 'attempts');
