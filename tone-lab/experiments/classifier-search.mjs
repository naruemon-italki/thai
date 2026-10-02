// Feature / model search for the statistical tone classifier, with honest
// leave-one-speaker-out (LOSO) evaluation. Reads contours produced by the
// current front end:  out/results-fe.json (48k) and out/results-fe44.json.
import fs from 'node:fs';
const OUT = new URL('../out/', import.meta.url).pathname;
const TONES = ['mid', 'low', 'falling', 'high', 'rising'];
const load = f => JSON.parse(fs.readFileSync(OUT + f));
const PFX = process.env.PFX || 'fe';
const R48 = load(`results-${PFX}.json`).runs['48000'], R44 = load(`results-${PFX}44.json`).runs['44100'];

function tokens(run, sr) {
  const out = [];
  for (const [spk, sp] of Object.entries(run.speakers)) {
    if (sp.group === 'volume') continue;
    sp.tokens.forEach((t, i) => { if (t.semis && t.semis.length >= 4) out.push({ spk, sr, i, group: sp.group, y: TONES.indexOf(t.label), s: t.semis, ms: t.ms }); });
  }
  return out;
}
const T48 = tokens(R48, 48000), T44 = tokens(R44, 44100);

// ---- features -------------------------------------------------------------
function resample(s, ms, K) {
  const t0 = ms[0], t1 = ms[ms.length - 1], out = new Array(K);
  let j = 0;
  for (let k = 0; k < K; k++) {
    const t = t0 + (t1 - t0) * k / (K - 1);
    while (j < ms.length - 2 && ms[j + 1] < t) j++;
    const a = ms[j], b = ms[j + 1], f = b > a ? Math.min(1, Math.max(0, (t - a) / (b - a))) : 0;
    out[k] = s[j] + (s[j + 1] - s[j]) * f;
  }
  return out;
}
function dct(v, n) {
  const K = v.length, c = [];
  for (let k = 0; k < n; k++) { let a = 0; for (let i = 0; i < K; i++) a += v[i] * Math.cos(Math.PI * k * (i + 0.5) / K); c.push(a / K); }
  return c;
}
const clampS = s => s.map(x => Math.max(-15, Math.min(15, x)));
// Oracle speaker spread (sd of all contour points over all their words, 48k).
const SPK_SD = {};
for (const spk of new Set(T48.map(t => t.spk))) {
  const v = T48.filter(t => t.spk === spk).flatMap(t => t.s.slice(0, Math.round(t.s.length * 0.85))).map(x => Math.max(-15, Math.min(15, x)));
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  SPK_SD[spk] = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
}
const POP_SD = Object.values(SPK_SD).reduce((a, b) => a + b, 0) / Object.keys(SPK_SD).length;
if (process.env.SHOWSD) console.log('speaker sd (st):', Object.entries(SPK_SD).map(([k, v]) => k + ' ' + v.toFixed(1)).join(', '), ' pop', POP_SD.toFixed(2));
const FEATS = {
  dct4: (s, ms) => dct(resample(clampS(s), ms, 20), 4),
  dct5: (s, ms) => dct(resample(clampS(s), ms, 20), 5),
  dct4dur: (s, ms) => [...dct(resample(clampS(s), ms, 20), 4), Math.log((ms[ms.length - 1] - ms[0] + 10) / 300)],
  dct4_85: (s, ms) => { const n = Math.max(4, Math.round(s.length * 0.85)); return dct(resample(clampS(s.slice(0, n)), ms.slice(0, n), 20), 4); },
  dct3: (s, ms) => dct(resample(clampS(s), ms, 20), 3),
  dct4dur_rn: (s, ms, t) => { const k = POP_SD / SPK_SD[t.spk]; const f = FEATS.dct4dur(s.map(x => x * k), ms); return f; },
  dct4dur_rnh: (s, ms, t) => { const k = Math.sqrt(POP_SD / SPK_SD[t.spk]); return FEATS.dct4dur(s.map(x => x * k), ms); },
  pts5: (s, ms) => { const v = resample(clampS(s), ms, 20); return [0, 5, 10, 15, 19].map(k => v[k]); },
};

// ---- models ---------------------------------------------------------------
function inv(M) {
  const n = M.length, A = M.map((r, i) => [...r, ...M.map((_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let k = 0; k < 2 * n; k++) A[c][k] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let k = 0; k < 2 * n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map(r => r.slice(n));
}
function logdet(M) { // via LU-ish Gaussian elimination
  const n = M.length, A = M.map(r => r.slice()); let ld = 0;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; ld += Math.log(Math.abs(A[c][c]));
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; }
  }
  return ld;
}
function fit(X, y, { qda = 0, shrink = 0.05, calSigma = 0 } = {}) {
  const F = X[0].length;
  const mu = TONES.map((_, c) => { const r = X.filter((_, i) => y[i] === c); return Array.from({ length: F }, (_, f) => r.reduce((a, x) => a + x[f], 0) / r.length); });
  const covOf = c => {
    const r = X.map((x, i) => [x, y[i]]).filter(([, yy]) => c < 0 || yy === c);
    const S = Array.from({ length: F }, () => new Array(F).fill(0));
    for (const [x, yy] of r) for (let a = 0; a < F; a++) for (let b = 0; b < F; b++) S[a][b] += (x[a] - mu[yy][a]) * (x[b] - mu[yy][b]);
    return S.map(row => row.map(v => v / r.length));
  };
  const pooled = covOf(-1);
  const tr = pooled.reduce((a, r, i) => a + r[i], 0) / F;
  const covs = TONES.map((_, c) => {
    const Sc = qda ? covOf(c) : pooled;
    return Sc.map((row, a) => row.map((v, b) => {
      let m = (1 - qda) * pooled[a][b] + qda * v;
      m = (1 - shrink) * m + (a === b ? shrink * tr : 0);
      if (a === 0 && b === 0) m += calSigma * calSigma;
      return m;
    }));
  });
  return { mu, P: covs.map(inv), ld: covs.map(logdet) };
}
function post(model, x) {
  const ll = model.mu.map((m, c) => {
    const d = x.map((v, i) => v - m[i]); let q = 0;
    for (let a = 0; a < d.length; a++) for (let b = 0; b < d.length; b++) q += d[a] * model.P[c][a][b] * d[b];
    return -0.5 * q - 0.5 * model.ld[c];
  });
  const mx = Math.max(...ll); const e = ll.map(v => Math.exp(v - mx)); const z = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / z);
}
const argmax = a => a.indexOf(Math.max(...a));

// ---- evaluation -----------------------------------------------------------
function evaluate(featName, opts, { augment44 = true } = {}) {
  const fx = FEATS[featName];
  const natives = [...new Set(T48.filter(t => t.group === 'native').map(t => t.spk))];
  const res = { shifts: {}, acc44: 0, n44: 0, learner: 0, nl: 0, conf: [] };
  const SH = [-2, -1, 0, 1, 2];
  for (const sh of SH) res.shifts[sh] = 0;
  let n = 0;
  for (const spk of natives) {
    const tr = [...T48, ...(augment44 ? T44 : [])].filter(t => t.group === 'native' && t.spk !== spk);
    const model = fit(tr.map(t => fx(t.s, t.ms, t)), tr.map(t => t.y), opts);
    for (const t of T48.filter(t => t.spk === spk)) {
      n++;
      for (const sh of SH) { const p = post(model, fx(t.s.map(v => v - sh), t.ms, t)); if (argmax(p) === t.y) res.shifts[sh]++; if (sh === 0) res.conf.push([Math.max(...p), argmax(p) === t.y]); }
    }
    for (const t of T44.filter(t => t.spk === spk)) { res.n44++; if (argmax(post(model, fx(t.s, t.ms, t))) === t.y) res.acc44++; }
  }
  const all = [...T48, ...(augment44 ? T44 : [])].filter(t => t.group === 'native');
  const model = fit(all.map(t => fx(t.s, t.ms, t)), all.map(t => t.y), opts);
  for (const t of T48.filter(t => t.group === 'learner')) { res.nl++; if (argmax(post(model, fx(t.s, t.ms, t))) === t.y) res.learner++; }
  const wrongClear = res.conf.filter(([c, ok]) => !ok && c >= 0.6).length;
  return `${featName.padEnd(8)} ${JSON.stringify(opts).padEnd(38)} LOSO@48k ${SH.map(s => (s > 0 ? '+' : '') + s + ':' + res.shifts[s]).join(' ')} /${n}   @44k ${res.acc44}/${res.n44}   learner ${res.learner}/${res.nl}   wrong&clear ${wrongClear}`;
}

const runs = (process.argv[2] === 'errors' || process.argv[2] === 'calib') ? [] : process.argv[2] === 'quick' ? [['dct4', {}]] : [
  ['dct4', {}], ['dct4', { calSigma: 0.7 }], ['dct4', { calSigma: 1.0 }],
  ['dct4', { qda: 0.5 }], ['dct4', { qda: 0.5, calSigma: 0.7 }], ['dct4', { qda: 1, shrink: 0.1 }],
  ['dct5', {}], ['dct5', { qda: 0.5, calSigma: 0.7 }],
  ['dct4dur', {}], ['dct4dur', { qda: 0.5, calSigma: 0.7 }],
  ['dct4_85', {}], ['dct4_85', { qda: 0.5, calSigma: 0.7 }],
  ['dct3', {}], ['pts5', {}], ['pts5', { qda: 0.5, calSigma: 0.7 }],
  ['dct4dur_rn', { qda: 0.5, calSigma: 0.7 }], ['dct4dur_rnh', { qda: 0.5, calSigma: 0.7 }],
];
if (process.env.ONLY) runs.splice(0, runs.length, ...runs.filter(([f, o]) => (f + JSON.stringify(o)).includes(process.env.ONLY)));
console.log(`natives: ${T48.filter(t => t.group === 'native').length} words @48k; learner ${T48.filter(t => t.group === 'learner').length}`);
for (const [f, o] of runs) console.log(evaluate(f, o));

export function errors(featName, opts) {
  const fx = FEATS[featName];
  const natives = [...new Set(T48.filter(t => t.group === 'native').map(t => t.spk))];
  const out = [];
  for (const spk of natives) {
    const tr = [...T48, ...T44].filter(t => t.group === 'native' && t.spk !== spk);
    const model = fit(tr.map(t => fx(t.s, t.ms, t)), tr.map(t => t.y), opts);
    for (const t of T48.filter(t => t.spk === spk)) {
      const p = post(model, fx(t.s, t.ms, t)); const k = argmax(p);
      if (k !== t.y) out.push(`${spk}#${t.i} ${TONES[t.y]}->${TONES[k]} p=${p[k].toFixed(2)} (true ${p[t.y].toFixed(2)}) f=[${fx(t.s, t.ms, t).map(v => v.toFixed(1))}]`);
    }
  }
  const all = [...T48, ...T44].filter(t => t.group === 'native');
  const model = fit(all.map(t => fx(t.s, t.ms, t)), all.map(t => t.y), opts);
  for (const t of T48.filter(t => t.group === 'learner')) { const p = post(model, fx(t.s, t.ms, t)); const k = argmax(p); out.push(`  learner#${t.i} said ${TONES[t.y]} -> ${TONES[k]} p=${p[k].toFixed(2)}  f=[${fx(t.s, t.ms, t).map(v => v.toFixed(1))}]`); }
  console.log('class means:', model.mu.map((m, c) => TONES[c] + '[' + m.map(v => v.toFixed(1)) + ']').join(' '));
  return out;
}
if (process.argv[2] === 'errors') errors('dct4dur', { qda: 0.5, calSigma: 0.7 }).forEach(l => console.log(l));

// Confidence calibration on LOSO predictions: fit a temperature T so that
// p ∝ exp(loglik / T) minimises the held-out negative log-likelihood, and
// report the Mahalanobis distance of each word to its winning class.
export function calibrateConfidence(featName, opts) {
  const fx = FEATS[featName];
  const natives = [...new Set(T48.filter(t => t.group === 'native').map(t => t.spk))];
  const rows = [];
  for (const spk of natives) {
    const tr = [...T48, ...T44].filter(t => t.group === 'native' && t.spk !== spk);
    const model = fit(tr.map(t => fx(t.s, t.ms, t)), tr.map(t => t.y), opts);
    for (const t of T48.filter(t => t.spk === spk)) {
      const x = fx(t.s, t.ms, t);
      const ll = model.mu.map((m, c) => { const d = x.map((v, i) => v - m[i]); let q = 0; for (let a = 0; a < d.length; a++) for (let b = 0; b < d.length; b++) q += d[a] * model.P[c][a][b] * d[b]; return { q, ll: -0.5 * q - 0.5 * model.ld[c] }; });
      rows.push({ y: t.y, ll: ll.map(o => o.ll), q: ll.map(o => o.q) });
    }
  }
  const soft = (ll, T) => { const m = Math.max(...ll); const e = ll.map(v => Math.exp((v - m) / T)); const z = e.reduce((a, b) => a + b, 0); return e.map(v => v / z); };
  let best = null;
  for (let T = 0.5; T <= 6; T += 0.25) { const nll = rows.reduce((a, r) => a - Math.log(Math.max(1e-9, soft(r.ll, T)[r.y])), 0); if (!best || nll < best.nll) best = { T, nll }; }
  console.log('best temperature', best.T, 'NLL', best.nll.toFixed(1), '(T=1:', rows.reduce((a, r) => a - Math.log(Math.max(1e-9, soft(r.ll, 1)[r.y])), 0).toFixed(1) + ')');
  for (const T of [1, best.T]) {
    const bins = [[0, 0.5], [0.5, 0.6], [0.6, 0.8], [0.8, 0.95], [0.95, 1.01]].map(([a, b]) => { const s = rows.map(r => soft(r.ll, T)).map((p, i) => [Math.max(...p), argmax(p) === rows[i].y]).filter(([c]) => c >= a && c < b); return `${a}-${b}: ${s.filter(x => x[1]).length}/${s.length}`; });
    console.log(` T=${T} reliability (correct/total by confidence):`, bins.join('  '));
  }
  const qwin = rows.map(r => r.q[argmax(r.ll)]).sort((a, b) => a - b);
  console.log(' Mahalanobis^2 to winning class: median', qwin[Math.floor(qwin.length / 2)].toFixed(1), 'p95', qwin[Math.floor(qwin.length * 0.95)].toFixed(1), 'max', qwin[qwin.length - 1].toFixed(1));
  return best.T;
}
if (process.argv[2] === 'calib') calibrateConfidence('dct4', { qda: 0.5, calSigma: 0.7 });
