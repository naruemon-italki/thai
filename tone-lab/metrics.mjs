// Turns a results-<label>.json into the summary numbers used by report.mjs
// and compare.mjs. All "accuracy" figures are over NATIVE speakers only; the
// learner is reported separately because his labels are the tone he intended,
// not what a Thai listener would hear.
export function summarise(R) {
  const TONES = R.tones;
  const z = R.offsets.indexOf(0);
  const S = { label: R.label, engine: R.engine, date: R.date };
  const srs = Object.keys(R.runs);
  const main = srs.includes('48000') ? '48000' : srs[0];
  const toks = (sr, pred) => Object.entries(R.runs[sr].speakers)
    .flatMap(([id, sp]) => sp.tokens.map(t => ({ ...t, spk: id, group: sp.group, set: sp.set })))
    .filter(pred || (() => true));
  const nat = sr => toks(sr, t => t.group === 'native');
  const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : null;

  S.accuracy = {};
  for (const sr of srs) {
    const T = nat(sr);
    const ok = T.filter(t => t.tone === t.label).length;
    S.accuracy[sr] = { correct: ok, total: T.length, pct: pct(ok, T.length), byTone: {}, bySet: {} };
    for (const tone of TONES) {
      const a = T.filter(t => t.label === tone);
      S.accuracy[sr].byTone[tone] = `${a.filter(t => t.tone === tone).length}/${a.length}`;
    }
    for (const set of ['original', 'new']) {
      const a = T.filter(t => t.set === set);
      S.accuracy[sr].bySet[set] = `${a.filter(t => t.tone === t.label).length}/${a.length}`;
    }
  }

  // Confusion matrix (rows = said, columns = detected) at the main rate.
  S.confusion = {};
  for (const a of TONES) { S.confusion[a] = {}; for (const b of [...TONES, 'none']) S.confusion[a][b] = 0; }
  for (const t of nat(main)) S.confusion[t.label][t.tone || 'none']++;

  // Calibration robustness: accuracy with the centre shifted by each offset.
  S.robustness = R.offsets.map((o, k) => {
    const T = nat(main);
    return { offset: o, correct: T.filter(t => t.sweep[k] === t.label).length, total: T.length };
  });
  // Speakers whose every word survives any calibration error within ±1 st.
  const inner = R.offsets.map((o, k) => Math.abs(o) <= 1 ? k : -1).filter(k => k >= 0);
  const spk = Object.entries(R.runs[main].speakers).filter(([, sp]) => sp.group === 'native');
  S.robustSpeakers = { within1st: spk.filter(([, sp]) => sp.tokens.every(t => inner.every(k => t.sweep[k] === t.label))).length,
                       total: spk.length };

  // Same verdict at 44.1 kHz and 48 kHz?
  if (R.runs['44100'] && R.runs['48000']) {
    let same = 0, n = 0;
    for (const [id, sp] of Object.entries(R.runs['48000'].speakers)) {
      const other = R.runs['44100'].speakers[id];
      sp.tokens.forEach((t, i) => { n++; if (other && other.tokens[i] && other.tokens[i].tone === t.tone) same++; });
    }
    S.sampleRateAgreement = { same, total: n, pct: pct(same, n) };
  }

  // Volume: Female7 vs the same file +7 dB.
  const a = R.runs[main].speakers.F7, b = R.runs[main].speakers.F7L;
  if (a && b) S.volume = { same: a.tokens.filter((t, i) => b.tokens[i] && b.tokens[i].tone === t.tone).length,
                           total: a.tokens.length,
                           quiet: a.tokens.map(t => t.tone), loud: b.tokens.map(t => t.tone) };

  // Confidence: how often is a WRONG answer presented as "Clear" (>= 0.6)?
  const T = nat(main);
  const wrong = T.filter(t => t.tone && t.tone !== t.label), right = T.filter(t => t.tone === t.label);
  const mean = arr => arr.length ? Math.round(100 * arr.reduce((s, x) => s + x, 0) / arr.length) / 100 : null;
  // "Clear"/"Unsure" are the tiers the readout actually shows (each engine
  // version's own thresholds, recorded per word by run.mjs).
  const tierOf = t => t.tier || (t.conf >= 0.6 ? 'clear' : t.conf >= 0.35 ? 'likely' : 'unsure');
  S.confidence = { meanWhenRight: mean(right.map(t => t.conf)), meanWhenWrong: mean(wrong.map(t => t.conf)),
                   wrongButClear: wrong.filter(t => tierOf(t) === 'clear').length, wrong: wrong.length,
                   rightButUnsure: right.filter(t => tierOf(t) === 'unsure').length, right: right.length };

  // Tone Challenge, natives: score for the tone they said vs for other tones.
  const ch = { right: [], wrong: [], wrongLevel: [] };
  for (const t of T) for (const target of TONES) {
    const c = t.challenge && t.challenge[target];
    if (!c) continue;
    if (target === t.label) ch.right.push(c.pct);
    else {
      ch.wrong.push(c.pct);
      if (['mid', 'low', 'high'].includes(target) && ['mid', 'low', 'high'].includes(t.label)) ch.wrongLevel.push(c.pct);
    }
  }
  const share = (arr, min) => pct(arr.filter(x => x >= min).length, arr.length);
  S.challenge = {
    correctTone: { n: ch.right.length, meanPct: mean(ch.right), goodOrBetter: share(ch.right, 60), greatOrBetter: share(ch.right, 75) },
    wrongTone: { n: ch.wrong.length, meanPct: mean(ch.wrong), goodOrBetter: share(ch.wrong, 60), greatOrBetter: share(ch.wrong, 75) },
    wrongLevelTone: { n: ch.wrongLevel.length, meanPct: mean(ch.wrongLevel), goodOrBetter: share(ch.wrongLevel, 60) },
  };

  // Learner (intended tone).
  const L = toks(main, t => t.group === 'learner');
  S.learner = { agree: L.filter(t => t.tone === t.label).length, total: L.length,
                centerHz: (R.runs[main].speakers.L1 && R.runs[main].speakers.L1.profile)
                  ? Math.round(R.runs[main].speakers.L1.profile.centerHz) : null,
                words: L.map(t => ({ said: t.label, heard: t.tone, conf: t.conf, challengePct: t.challenge && t.challenge[t.label] ? t.challenge[t.label].pct : null })) };

  // The 19 example buttons (baked contours) must all read correct and Clear.
  const ex = R.runs[main].examples;
  const exClear = e => e.tone === e.label && (e.tier ? e.tier === 'clear' : e.conf >= 0.6);
  S.examples = { correct: ex.filter(e => e.tone === e.label).length, clear: ex.filter(exClear).length,
                 total: ex.length, failures: ex.filter(e => !exClear(e)).map(e => `${e.id}:${e.label}->${e.tone}@${e.conf}`) };
  const sg = Object.entries(R.runs[main].singles).filter(([, s]) => s.src === 'C');
  S.exampleAudioCalibrated = { correct: sg.filter(([, s]) => s.tone === s.label).length, total: sg.length,
                               failures: sg.filter(([, s]) => s.tone !== s.label).map(([id, s]) => `${id}:${s.label}->${s.tone}`) };
  return S;
}

// One line per native word whose verdict differs between two runs (main rate).
export function changes(A, B) {
  const sr = '48000';
  const out = [];
  for (const [id, sp] of Object.entries(A.runs[sr].speakers)) {
    const other = B.runs[sr].speakers[id];
    if (!other) continue;
    sp.tokens.forEach((t, i) => {
      const u = other.tokens[i];
      if (!u || u.tone === t.tone) return;
      const was = t.tone === t.label, now = u.tone === u.label;
      out.push({ spk: id, group: sp.group, file: t.file, idx: t.idx, said: t.label, before: t.tone, after: u.tone,
                 kind: was && !now ? 'BROKEN' : !was && now ? 'fixed' : 'changed' });
    });
  }
  return out;
}
