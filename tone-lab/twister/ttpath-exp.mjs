// Sentence pitch-path variants under the Twister's own rules scorer.
import { collect, analyseX, score } from './ttexp.mjs';
const items = await collect();
const main = it => it.speed !== 'fast';
const R = { cond: 'tt', decl: true, window: 'tt', scorer: 'rules' };
const V = {
  'v1 path (app today)': { path: 'v1' },
  'word path (single-word settings)': { path: 'word', wordMode: true },
  'S1 strict subharmonic only': { path: { subRatio: 0.985, leapCost: 0, edgeSkip: false, gapSkip: 0 } },
  'S1 + wide band': { path: { subRatio: 0.985, leapCost: 0, edgeSkip: false, gapSkip: 0 }, wordMode: true },
  'S2 S1 + edge skip': { path: { subRatio: 0.985, leapCost: 0, edgeSkip: true, gapSkip: 0 }, wordMode: true },
  'S3 S2 + gap skip': { path: { subRatio: 0.985, leapCost: 0, edgeSkip: true, gapSkip: 2 }, wordMode: true },
  'S4 S3 + leap cost, +2.5 st/10ms gap': { path: { subRatio: 0.985, leapCost: 3, leapGrow: 2.5, edgeSkip: true, gapSkip: 2 }, wordMode: true },
  'S5 S3 + leap cost, +4 st/10ms gap': { path: { subRatio: 0.985, leapCost: 3, leapGrow: 4, edgeSkip: true, gapSkip: 2 }, wordMode: true },
  'S6 S1 + leap cost, +2.5 st/10ms gap': { path: { subRatio: 0.985, leapCost: 3, leapGrow: 2.5, edgeSkip: false, gapSkip: 0 }, wordMode: true },
};
const pc = x => `${x.hit}/${x.n} ${(100 * x.hit / x.n).toFixed(1)}%`;
console.log('variant'.padEnd(38), '@48k'.padEnd(15), '@44.1k'.padEnd(15), '±1 st'.padEnd(15), '±2 st'.padEnd(15), 'SR agree  fast  perfect@48k');
for (const [name, v] of Object.entries(V)) {
  const cfg = Object.assign({}, R, v);
  const a = score(items, cfg, { srs: [48000], filter: main }), b = score(items, cfg, { srs: [44100], filter: main });
  const r1 = score(items, cfg, { offsets: [-1, 1], filter: main }), r2 = score(items, cfg, { offsets: [-2, 2], filter: main });
  const f = score(items, cfg, { filter: it => it.speed === 'fast' });
  // same per-syllable verdict at 48k and 44.1k
  let same = 0, n = 0;
  const by = {}; for (const it of items) if (main(it)) { const r = analyseX(it, 0, cfg); (by[it.rec.id + '#' + it.k] ||= {})[it.SR] = r; }
  for (const k of Object.keys(by)) { const x = by[k][48000], y = by[k][44100]; const N = (x.ok ? x.results.length : y.ok ? y.results.length : 0);
    for (let i = 0; i < N; i++) { n++; if ((x.ok && x.results[i].hit) === (y.ok && y.results[i].hit)) same++; } }
  console.log(name.padEnd(38), pc(a).padEnd(15), pc(b).padEnd(15), pc(r1).padEnd(15), pc(r2).padEnd(15), `${same}/${n}`.padEnd(9), `${f.hit}/${f.n}`.padEnd(6), a.perfect + '/' + a.attempts);
}
