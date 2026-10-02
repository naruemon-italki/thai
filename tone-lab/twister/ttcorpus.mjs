// Tongue Twister corpus: native recordings of the app's sentences, split into
// separate attempts exactly where the speaker paused between repetitions.
import fs from 'node:fs';
import vm from 'node:vm';
import { decode, splitWords } from '../engine.mjs';

export const ROOT = new URL('../../', import.meta.url).pathname;

// kind 'reference': the track shipped in the app (audio/twisters)
//      'alt'      : a native candidate that was not chosen
// attempts: how many times the sentence is said in the file
// speeds:   per-attempt speed label when the file deliberately varies speed
export const TT_RECORDINGS = [
  { id: 'moo.ref',    file: 'audio/twisters/moo-meuk-goong',  tw: 'moo-meuk-goong', kind: 'reference' },
  { id: 'moo.m1',     file: 'moo-meuk-goong_male1',           tw: 'moo-meuk-goong', kind: 'alt', attempts: 2 },
  { id: 'krai.ref',   file: 'audio/twisters/krai-kaai-kai-gai', tw: 'krai-kaai-kai-gai', kind: 'reference' },
  { id: 'krai.f1',    file: 'krai-kaai-kai-gai_female1',      tw: 'krai-kaai-kai-gai', kind: 'alt' },
  { id: 'yak.ref',    file: 'audio/twisters/yak-yai-lai-yak-lek', tw: 'yak-yai-lai-yak-lek', kind: 'reference' },
  { id: 'yak.f1',     file: 'yak-yai-lai-yak-lek_female1',    tw: 'yak-yai-lai-yak-lek', kind: 'alt' },
  { id: 'yak.f2',     file: 'yak-yai-lai-yak-lek_female2',    tw: 'yak-yai-lai-yak-lek', kind: 'alt' },
  { id: 'yak.f3',     file: 'yak-yai-lai-yak-lek_female3',    tw: 'yak-yai-lai-yak-lek', kind: 'alt' },
  { id: 'maa.ref',    file: 'audio/twisters/maa-5-tones',     tw: 'maa-5-tones', kind: 'reference' },
  { id: 'kao.ref',    file: 'audio/twisters/kao-gin',         tw: 'kao-gin', kind: 'reference' },
  { id: 'kao.f1',     file: 'kao-gin_female1',                tw: 'kao-gin', kind: 'alt' },
  { id: 'mai.ref',    file: 'audio/twisters/mai-mai',         tw: 'mai-mai-mai-mai-chai-mai', kind: 'reference' },
  { id: 'mai.f2',     file: 'mai-mai_female2',                tw: 'mai-mai-mai-mai-chai-mai', kind: 'alt', attempts: 2 },
  { id: 'chaam.ref',  file: 'audio/twisters/chaam-kieow',     tw: 'chaam-kieow', kind: 'reference' },
  { id: 'chaam.f1',   file: 'chaam-kieow_female1',            tw: 'chaam-kieow', kind: 'alt' },
  { id: 'chaam.f2',   file: 'chaam-kieow_female2',            tw: 'chaam-kieow', kind: 'alt' },
  { id: 'chaam.f3',   file: 'chaam-kieow_female3',            tw: 'chaam-kieow', kind: 'alt' },
  { id: 'chaam.speed', file: 'chaam-test2',                   tw: 'chaam-kieow', kind: 'alt', attempts: 3, speeds: ['slow', 'medium', 'fast'] },
  { id: 'saao.ref',   file: 'audio/twisters/saao',            tw: 'saao-saen-suay', kind: 'reference' },
  { id: 'saao.v1',    file: 'saao-v1',                        tw: 'saao-saen-suay', kind: 'alt' },
  { id: 'saao.speed', file: 'saao-test',                      tw: 'saao-saen-suay', kind: 'alt', attempts: 3, speeds: ['slow', 'medium', 'fast'] },
  // App exports ("Save attempt" in the Twister) go here, e.g.
  //   { id: 'krai.app1', file: 'krai_138_75pct_1801.wav', tw: 'krai-kaai-kai-gai', kind: 'learner', centreHz: 138, raw: true },
  // raw: the WAV is the whole capture buffer, used as-is; centreHz: the
  // profile centre in the file name. kind 'learner' is reported separately.
];

// The app's own twister definitions, read straight out of tongue-twister.js.
export function loadTwisters(path = ROOT + 'tongue-twister.js') {
  const src = fs.readFileSync(path, 'utf8');
  const at = src.indexOf('var TT_TWISTERS = [');
  let i = src.indexOf('[', at), depth = 0;
  for (; i < src.length; i++) { if (src[i] === '[') depth++; else if (src[i] === ']' && --depth === 0) break; }
  const list = vm.runInNewContext('(' + src.slice(src.indexOf('[', at), i + 1) + ')');
  return Object.fromEntries(list.map(t => [t.id, t]));
}

// Split a file into its attempts at the (attempts - 1) longest pauses.
export function attemptsOf(rec, sr) {
  const pcm = decode(ROOT + rec.file + (/\.(wav|mp3)$/.test(rec.file) ? '' : '.mp3'), sr);
  const n = rec.attempts || 1;
  if (n === 1) return [{ pcm, startMs: 0, endMs: pcm.length / sr * 1000, speed: rec.speeds ? rec.speeds[0] : null }];
  const runs = splitWords(pcm, sr, { relDb: -30, minGapMs: 60, minWordMs: 60 });
  const gaps = runs.slice(1).map((r, k) => ({ k: k + 1, len: r.startMs - runs[k].endMs }));
  const cuts = gaps.sort((a, b) => b.len - a.len).slice(0, n - 1).map(g => g.k).sort((a, b) => a - b);
  const groups = [];
  let from = 0;
  for (const c of cuts.concat([runs.length])) { groups.push(runs.slice(from, c)); from = c; }
  return groups.map((g, k) => {
    const a = Math.max(0, g[0].startMs - 150), b = Math.min(pcm.length / sr * 1000, g[g.length - 1].endMs + 150);
    return { pcm: pcm.subarray(Math.round(a * sr / 1000), Math.round(b * sr / 1000)), startMs: a, endMs: b,
             speed: rec.speeds ? rec.speeds[k] : null };
  });
}
