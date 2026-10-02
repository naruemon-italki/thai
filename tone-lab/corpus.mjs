import { decode, splitWords } from './engine.mjs';

// The mp3s live in the repository root.
export const AUDIO = new URL('../', import.meta.url).pathname;
export const TONES = ['mid', 'low', 'falling', 'high', 'rising'];

export const SPEAKER_FILES = {
  Female1_paa: { words: ['paa', 'pàa', 'pâa', 'páa', 'pǎa'] },
  Female2_paa: { words: ['paa', 'pàa', 'pâa', 'páa', 'pǎa'] },
  Female3_maa: { words: ['maa', 'màa', 'mâa', 'máa', 'mǎa'] },
  Female4_mixed: { words: ['gin', 'pèt', 'pîi', 'rót', 'hǐw'] },
  Female5_dtaa: { words: ['dtaa', 'dtàa', 'dtâa', 'dtáa', 'dtǎa'] },
  Female6_mai: { words: ['mai', 'mài', 'mâi', 'mái', 'mǎi'] },
  Male1_gee: { words: ['gee', 'gèe', 'gêe', 'gée', 'gěe'] },
  Male2_gai: { words: ['gai', 'gài', 'gâi', 'gái', 'gǎi'] },
  Male3_maa: { words: ['maa', 'màa', 'mâa', 'máa', 'mǎa'] },
  // Noisy recording: the energy splitter breaks the falling tone's quiet tail
  // off, so the cut points are given by hand (checked against the envelope).
  Male4_mai: { words: ['mai', 'mài', 'mâi', 'mái', 'mǎi'],
               segs: [[370, 1260], [1660, 2070], [2820, 3730], [3930, 4370], [5040, 5630]] },
};

// Single native words used by the Trainer's example buttons. `src` groups
// files that share an encoder setting (a proxy for "same recording session").
export const SINGLE_WORDS = [
  ['gin', 'mid', 'C'], ['bpai', 'mid', 'C'], ['nom', 'mid', 'C'],
  ['gai', 'low', 'C'], ['yoo', 'low', 'C'], ['pet', 'low', 'B'], ['sip', 'low', 'A'],
  ['chuu', 'falling', 'B'], ['chop', 'falling', 'C'], ['baan', 'falling', 'C'], ['haa', 'falling', 'C'],
  ['rak', 'high', 'C'], ['rot', 'high', 'A'], ['maah', 'high', 'A'], ['neua', 'high', 'A'],
  ['moo', 'rising', 'C'], ['chan', 'rising', 'B'], ['maar', 'rising', 'C'], ['suay', 'rising', 'B'],
];

export function speakerTokens(name, sr) {
  const pcm = decode(AUDIO + name + '.mp3', sr);
  const def = SPEAKER_FILES[name];
  const segs = def.segs ? def.segs.map(([a, b]) => ({ startMs: a, endMs: b }))
                        : splitWords(pcm, sr, { relDb: name === 'Female3_maa' ? -28 : -32 });
  if (segs.length !== 5) throw new Error(name + ': expected 5 words, got ' + segs.length);
  return segs.map((s, i) => ({ speaker: name, word: def.words[i], tone: TONES[i], pcm, ...s }));
}
