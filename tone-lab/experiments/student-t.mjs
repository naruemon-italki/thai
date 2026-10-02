// Gaussian vs heavier-tailed (Student-t) class models, same features, same
// fitting, leave-one-speaker-out on natives. Question: can confidence on
// in-between productions (learners) be made more honest without costing
// native accuracy?   node experiments/student-t.mjs
import { loadEngine } from '../engine.mjs';
import { SPEAKERS, calibrate, speakerSet } from '../lab.mjs';
const ENGINE = new URL('../../tone-trainer.js', import.meta.url).pathname;
const TONES = ['mid', 'low', 'falling', 'high', 'rising'];
const data = [];
for (const SR of [48000, 44100]) {
  const E = loadEngine(ENGINE, SR);
  for (const sp of SPEAKERS) {
    if (sp.group === 'volume') continue;
    const { toks, takes, calTakes, spare, fixed } = speakerSet(sp, SR);
    const prof = fixed || await calibrate(E, calTakes, spare);
    for (let i = 0; i < toks.length; i++) {
      const r = await E.capture(takes[i], prof.centerHz);
      const core = E.dsp.extractContour(r.frames, r.thresholdRms, prof.centerHz);
      if (core) data.push({ spk: sp.id, set: sp.set, group: sp.group, sr: SR, i, y: TONES.indexOf(toks[i].label), x: E.dsp.toneFeatures(core, prof.centerHz) });
    }
  }
}
const inv = M => { const n = M.length, A = M.map((r, i) => [...r, ...M.map((_, j) => +(i === j))]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c]; for (let k = 0; k < 2 * n; k++) A[c][k] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let k = 0; k < 2 * n; k++) A[r][k] -= f * A[c][k]; } } return A.map(r => r.slice(n)); };
const ldet = M => { const n = M.length, A = M.map(r => r.slice()); let l = 0; for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; l += Math.log(Math.abs(A[c][c])); for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; } } return l; };
function fit(rows, calSigma = 0.7) {
  const F = 4, mu = TONES.map((_, c) => { const r = rows.filter(d => d.y === c); return [0, 1, 2, 3].map(f => r.reduce((a, d) => a + d.x[f], 0) / r.length); });
  const cov = c => { const r = rows.filter(d => c < 0 || d.y === c); const S = [0, 1, 2, 3].map(() => [0, 0, 0, 0]); for (const d of r) for (let a = 0; a < F; a++) for (let b = 0; b < F; b++) S[a][b] += (d.x[a] - mu[d.y][a]) * (d.x[b] - mu[d.y][b]); return S.map(row => row.map(v => v / r.length)); };
  const pooled = cov(-1), tr = pooled.reduce((a, r, i) => a + r[i], 0) / F;
  return TONES.map((_, c) => { const Sc = cov(c); const S = Sc.map((row, a) => row.map((v, b) => 0.95 * (0.5 * pooled[a][b] + 0.5 * v) + (a === b ? 0.05 * tr : 0))); S[0][0] += calSigma * calSigma; return { mu: mu[c], P: inv(S), ld: ldet(S) }; });
}
function post(m, x, nu) {
  const ll = m.map(c => { const d = x.map((v, i) => v - c.mu[i]); let q = 0; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) q += d[a] * c.P[a][b] * d[b];
    return (nu ? -0.5 * (nu + 4) * Math.log(1 + q / nu) : -0.5 * q) - 0.5 * c.ld; });
  const mx = Math.max(...ll), e = ll.map(v => Math.exp(v - mx)), z = e.reduce((a, b) => a + b, 0); return e.map(v => v / z);
}
const am = a => a.indexOf(Math.max(...a));
const nat = data.filter(d => d.group === 'native'), spk = [...new Set(nat.map(d => d.spk))];
for (const nu of [0, 30, 10, 5, 3]) {
  let ok = 0, n = 0, clr = 0, clrOk = 0, ok44 = 0;
  for (const s of spk) {
    const m = fit(nat.filter(d => d.spk !== s));
    for (const d of nat.filter(d => d.spk === s)) {
      const p = post(m, d.x, nu); const k = am(p);
      if (d.sr === 48000) { n++; if (k === d.y) ok++; if (p[k] >= 0.8) { clr++; if (k === d.y) clrOk++; } } else if (k === d.y) ok44++;
    }
  }
  const m = fit(nat);
  const lr = data.filter(d => d.group === 'learner' && d.sr === 48000).map(d => { const p = post(m, d.x, nu); const k = am(p); return `${TONES[d.y][0].toUpperCase()}>${TONES[k][0]}${Math.round(100 * p[k])}`; });
  console.log(`${nu ? 'Student-t nu=' + nu : 'Gaussian     '}  LOSO@48k ${ok}/${n}  @44.1k ${ok44}/${n}  "Clear" right ${clrOk}/${clr}   learner: ${lr.join(' ')}`);
}
