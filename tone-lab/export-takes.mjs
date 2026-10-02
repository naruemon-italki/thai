// Writes every corpus word as a WAV exactly as the engine hears it (same
// lead-in noise, padding and seed as run.mjs), plus an index, so external
// tools (Praat) can analyse the identical audio. -> out/takes/
import fs from 'node:fs';
import { loadEngine, asTake } from './engine.mjs';
import { SPEAKERS, speakerTokens } from './corpus.mjs';
const SR = 48000;
const OUT = new URL('./out/takes/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const E = loadEngine(new URL('../tone-trainer.js', import.meta.url).pathname, SR);
const index = [];
for (const sp of SPEAKERS) {
  speakerTokens(sp, SR).forEach((t, i) => {
    const take = asTake(t.pcm, SR, t.startMs, t.endMs, { seed: i + 1 });
    const name = `${sp.id}_${String(i).padStart(2, '0')}_${t.label}.wav`;
    fs.writeFileSync(OUT + name, Buffer.from(E.dsp.encodeWav(take, SR)));
    index.push({ spk: sp.id, i, label: t.label, wav: name });
  });
}
fs.writeFileSync(OUT + 'index.json', JSON.stringify(index));
console.log(index.length, 'takes ->', OUT);
