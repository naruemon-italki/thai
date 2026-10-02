import { decode, splitWords } from './engine.mjs';

// The mp3s live in the repository root.
export const AUDIO = new URL('../', import.meta.url).pathname;
export const TONES = ['mid', 'low', 'falling', 'high', 'rising'];

/* ---- Speakers ------------------------------------------------------------
   kind '5tone'  : one file, five words in the order mid, low, falling, high, rising
   kind 'pertone': one file per tone, several words each
   group 'native'  -> counted in the main accuracy figures
         'learner' -> reported separately (intended tone, not a native judgement)
         'volume'  -> a louder copy of another speaker, used only for the volume check
   Calibration follows the app: three captures of mid-tone words. A 5-tone file
   has one mid word, so it is used three times; a per-tone speaker uses the
   first three words of their mid file.                                       */
export const SPEAKERS = [
  { id: 'F1', file: 'Female1_paa', kind: '5tone', group: 'native', set: 'original' },
  { id: 'F2', file: 'Female2_paa', kind: '5tone', group: 'native', set: 'original' },
  { id: 'F3', file: 'Female3_maa', kind: '5tone', group: 'native', set: 'original', relDb: -28 },
  { id: 'F4', file: 'Female4_mixed', kind: '5tone', group: 'native', set: 'original' },
  { id: 'F5', file: 'Female5_dtaa', kind: '5tone', group: 'native', set: 'original' },
  { id: 'F6', file: 'Female6_mai', kind: '5tone', group: 'native', set: 'original' },
  { id: 'M1', file: 'Male1_gee', kind: '5tone', group: 'native', set: 'original' },
  { id: 'M2', file: 'Male2_gai', kind: '5tone', group: 'native', set: 'original' },
  { id: 'M3', file: 'Male3_maa', kind: '5tone', group: 'native', set: 'original' },
  // Noisy recording: the energy splitter breaks the falling tone's quiet tail
  // off, so the cut points are given by hand (checked against the envelope).
  { id: 'M4', file: 'Male4_mai', kind: '5tone', group: 'native', set: 'original',
    segs: [[370, 1260], [1660, 2070], [2820, 3730], [3930, 4370], [5040, 5630]] },
  { id: 'F7', file: 'Female7_maa', kind: '5tone', group: 'native', set: 'new' },
  { id: 'F7L', file: 'Female7_maa-LOUD', kind: '5tone', group: 'volume', set: 'new', copyOf: 'F7' },
  { id: 'F8', file: 'Female8_tua', kind: '5tone', group: 'native', set: 'new' },
  { id: 'F9', file: 'Female9_ga', kind: '5tone', group: 'native', set: 'new' },
  { id: 'F10', file: 'Female10_maa', kind: '5tone', group: 'native', set: 'new' },
  { id: 'F11', file: 'Female11_gaa', kind: '5tone', group: 'native', set: 'new' },
  { id: 'M5', file: 'Male5_tee', kind: '5tone', group: 'native', set: 'new' },
  // Added after the v2 model was trained: never seen by it, so their score is
  // an honest test of a new voice (set 'holdout').
  { id: 'F12', file: 'Female12_paa', kind: '5tone', group: 'native', set: 'holdout' },
  { id: 'F13', file: 'Female13_mee', kind: '5tone', group: 'native', set: 'holdout' },
  { id: 'F14', file: 'Female14_kaao', kind: '5tone', group: 'native', set: 'holdout' },
  { id: 'F15', file: 'Female15_gaa', kind: '5tone', group: 'native', set: 'holdout' },
  { id: 'PF', name: 'partner', kind: 'pertone', group: 'native', set: 'new', suffix: 'female' },
  { id: 'NM', name: 'native male', kind: 'pertone', group: 'native', set: 'new', suffix: 'male' },
  { id: 'L1', name: 'learner (beginner)', kind: 'pertone', group: 'learner', set: 'new', suffix: 'male-2',
    note: 'usually calibrates around 140 Hz in the app' },
  // Attempts exported from the app with "Save attempt" (raw capture buffer,
  // used as-is), judged at the profile centre in the file name.
  { id: 'L1app', name: 'learner, app attempts', kind: 'takes', group: 'learner', set: 'app', fixedCentre: 138,
    takes: [['tone_trainer_138_high_1801.wav', 'rising', 'pom (ผม) - app said high']] },
];

// Single native words used by the Trainer's example buttons. `src` groups
// files that share an encoder setting (a proxy for "same recording session").
export const SINGLE_WORDS = [
  ['gin', 'mid', 'C'], ['bpai', 'mid', 'C'], ['nom', 'mid', 'C'],
  ['gai', 'low', 'C'], ['yoo', 'low', 'C'], ['pet', 'low', 'B'], ['sip', 'low', 'A'],
  ['chuu', 'falling', 'B'], ['chop', 'falling', 'C'], ['baan', 'falling', 'C'], ['haa', 'falling', 'C'],
  ['rak', 'high', 'C'], ['rot', 'high', 'A'], ['maah', 'high', 'A'], ['neua', 'high', 'A'],
  ['moo', 'rising', 'C'], ['chan', 'rising', 'B'], ['maar', 'rising', 'C'], ['suay', 'rising', 'B'],
];

const cache = new Map();
function load(file, sr) {
  const k = file + '@' + sr;
  if (!cache.has(k)) cache.set(k, decode(AUDIO + file + '.mp3', sr));
  return cache.get(k);
}
function segsOf(pcm, sr, file, opts) {
  const s = opts.segs ? opts.segs.map(([a, b]) => ({ startMs: a, endMs: b }))
                      : splitWords(pcm, sr, { relDb: opts.relDb || -32 });
  return s;
}

// Every word of one speaker: [{ spk, group, label, idx, pcm, startMs, endMs }]
export function speakerTokens(sp, sr) {
  const out = [];
  if (sp.kind === 'takes') {
    sp.takes.forEach(([file, label, note], i) => {
      const pcm = decode(AUDIO + file, sr);
      out.push({ spk: sp.id, group: sp.group, label, idx: i, file, note, pcm, raw: true, startMs: 0, endMs: pcm.length / sr * 1000 });
    });
    return out;
  }
  if (sp.kind === '5tone') {
    const pcm = load(sp.file, sr);
    const segs = segsOf(pcm, sr, sp.file, sp);
    if (segs.length !== 5) throw new Error(sp.file + ': expected 5 words, got ' + segs.length);
    segs.forEach((s, i) => out.push({ spk: sp.id, group: sp.group, label: TONES[i], idx: i, file: sp.file, pcm, ...s }));
  } else {
    for (const tone of TONES) {
      const file = tone + '_' + sp.suffix;
      const pcm = load(file, sr);
      segsOf(pcm, sr, file, {}).forEach((s, i) =>
        out.push({ spk: sp.id, group: sp.group, label: tone, idx: i, file, pcm, ...s }));
    }
  }
  return out;
}

// The words this speaker would say during calibration (three mid-tone words).
export function calibrationTokens(sp, toks) {
  if (sp.fixedCentre) return [];
  const mids = toks.filter(t => t.label === 'mid');
  return sp.kind === '5tone' ? [mids[0], mids[0], mids[0]] : mids.slice(0, 3);
}

export function singleWord(id, sr) { return load(id, sr); }
