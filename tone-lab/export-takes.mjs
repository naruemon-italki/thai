import fs from 'node:fs';
import { loadEngine, decode, asTake } from './engine.mjs';
import { SPEAKER_FILES, speakerTokens, SINGLE_WORDS, AUDIO } from './corpus.mjs';
const SR = 48000;
const OUT = new URL('./out/', import.meta.url).pathname;
const E = loadEngine(new URL('../tone-trainer.js', import.meta.url).pathname, SR);
fs.mkdirSync(OUT + 'takes', { recursive: true });
const R = JSON.parse(fs.readFileSync(OUT + 'results.json')).runs[SR];
const wav = (pcm) => { const b = Buffer.from(E.dsp.encodeWav(pcm, SR)); return b; };
const meta = [];
for (const name of Object.keys(SPEAKER_FILES)) {
  const toks = speakerTokens(name, SR);
  toks.forEach((t, i) => {
    const take = asTake(t.pcm, SR, t.startMs, t.endMs, { seed: i + 1 });
    const f = OUT + `takes/${name}_${i}_${t.tone}.wav`;
    fs.writeFileSync(f, wav(take));
    const r = R.speakers[name].res[i];
    meta.push({ file: f, speaker: name, label: t.tone, centre: R.speakers[name].centre, engine: r.ms.map((ms, k) => [ms, R.speakers[name].centre * Math.pow(2, r.semis[k] / 12)]), detected: r.tone });
  });
}
for (const [id, tone, src] of SINGLE_WORDS) {
  const pcm = decode(AUDIO + id + '.mp3', SR);
  const take = asTake(pcm, SR, 0, pcm.length / SR * 1000, { padMs: 0, seed: 7 });
  const f = OUT + `takes/single_${id}_${tone}.wav`;
  fs.writeFileSync(f, wav(take));
  const s = R.singles[id];
  meta.push({ file: f, speaker: 'single_' + src, label: tone, centre: s.centre, engine: s.ms.map((ms, k) => [ms, s.centre * Math.pow(2, s.semis[k] / 12)]), detected: s.tone });
}
fs.writeFileSync(OUT + 'takes/meta.json', JSON.stringify(meta));
console.log(meta.length, 'takes written');
