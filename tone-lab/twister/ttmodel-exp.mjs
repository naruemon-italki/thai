// Can a tone model trained on SENTENCE syllables beat the Twister's rules?
// Leave-one-recording-out: every recording is scored by a model that was
// trained without it (other recordings of the same sentence are allowed, as a
// learner's sentence is also in the training sentences' list).
//   node twister/ttmodel-exp.mjs
import { collect, analyseX, score, TONES } from './ttexp.mjs';

const items = await collect();
const main = it => it.speed !== 'fast';

function fit(rows, { qda = 0.5, shrink = 0.05, id } = {}) {
  const F = rows[0].x.length;
  const mu = TONES.map((_, c) => { const r = rows.filter(d => d.y === c); return Array.from({ length: F }, (_, f) => r.reduce((a, d) => a + d.x[f], 0) / Math.max(1, r.length)); });
  const covOf = c => { const r = rows.filter(d => c < 0 || d.y === c); const S = Array.from({ length: F }, () => new Array(F).fill(0));
    for (const d of r) for (let a = 0; a < F; a++) for (let b = 0; b < F; b++) S[a][b] += (d.x[a] - mu[d.y][a]) * (d.x[b] - mu[d.y][b]);
    return S.map(row => row.map(v => v / Math.max(1, r.length))); };
  const pooled = covOf(-1), tr = pooled.reduce((a, r, i) => a + r[i], 0) / F;
  const cov = TONES.map((_, c) => covOf(c).map((row, a) => row.map((v, b) => (1 - shrink) * ((1 - qda) * pooled[a][b] + qda * v) + (a === b ? shrink * tr : 0))));
  return { id, mu, cov, temperature: 1, calSigma: { trainer: 0.7, challenge: 1.0 } };
}

// Syllable features from one configuration (narrow windows, offset 0).
function harvest(cfg, pick) {
  const rows = [];
  for (const it of items) {
    if (!pick(it)) continue;
    const r = analyseX(it, 0, Object.assign({}, cfg, { scorer: 'model', window: 'narrow' }));
    if (!r.ok) continue;
    r.results.forEach(s => { if (s.x) rows.push({ rec: it.rec.id, x: s.x, y: TONES.indexOf(s.target) }); });
  }
  return rows;
}

const BASE = { path: 'word', wordMode: true, decl: true };
const recs = [...new Set(items.filter(main).map(it => it.rec.id))];
for (const cond of ['tt', 'raw']) for (const sigma of [0.7, 1.0]) for (const qda of [0, 0.5]) {
  const cfg = Object.assign({}, BASE, { cond });
  const all = harvest(cfg, main);
  let a48 = 0, a44 = 0, n48 = 0, n44 = 0, r1 = 0, rn1 = 0, f = 0, fn = 0;
  for (const rec of recs) {
    const model = fit(all.filter(r => r.rec !== rec), { qda, id: `loro-${cond}-${qda}-${rec}` });
    const test = { ...cfg, scorer: 'model', model, sigma, window: 'tt' };
    const x48 = score(items, test, { srs: [48000], filter: it => it.rec.id === rec && main(it) });
    const x44 = score(items, test, { srs: [44100], filter: it => it.rec.id === rec && main(it) });
    const xr = score(items, test, { offsets: [-1, 1], filter: it => it.rec.id === rec && main(it) });
    const xf = score(items, test, { filter: it => it.rec.id === rec && it.speed === 'fast' });
    a48 += x48.hit; n48 += x48.n; a44 += x44.hit; n44 += x44.n; r1 += xr.hit; rn1 += xr.n; f += xf.hit; fn += xf.n;
  }
  console.log(`cond ${cond.padEnd(3)} sigma ${sigma} qda ${qda}:  @48k ${a48}/${n48} ${(100 * a48 / n48).toFixed(1)}%   @44.1k ${a44}/${n44} ${(100 * a44 / n44).toFixed(1)}%   ±1 st ${(100 * r1 / rn1).toFixed(1)}%   fast ${f}/${fn}`);
}
