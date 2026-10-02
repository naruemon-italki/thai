// Tongue Twister report. One file: summary + per-attempt lines.
// Two files: before/after comparison.
//   node twister/ttreport.mjs out/tt-results-tt-v1.json [out/tt-results-new.json]
import fs from 'node:fs';
const TONES = ['mid', 'low', 'falling', 'high', 'rising'];
const L = { mid: 'M', low: 'L', falling: 'F', high: 'H', rising: 'R' };
const load = f => JSON.parse(fs.readFileSync(f));

// Main metric set excludes the deliberately FAST attempts (the speaker said
// those are run together so fast the tones are gone); they are reported apart.
export function ttSummary(R) {
  const S = { label: R.label, bySr: {} };
  for (const [sr, rows] of Object.entries(R.runs)) {
    const main = rows.filter(r => r.speed !== 'fast' && r.kind !== 'learner'), fast = rows.filter(r => r.speed === 'fast');
    const learner = rows.filter(r => r.kind === 'learner');
    const syl = (rs, o) => {
      let hit = 0, n = 0, failed = 0, pct = [];
      for (const r of rs) {
        const z = r.byOffset[o];
        if (!z || !z.ok) { failed++; n += r.targets.length; continue; }
        z.syl.forEach(s => { n++; if (s.hit) hit++; });
        pct.push(z.percent);
      }
      return { hit, n, failed, meanPct: pct.length ? Math.round(pct.reduce((a, b) => a + b, 0) / pct.length) : null };
    };
    const s = S.bySr[sr] = {
      main: syl(main, 0), fast: syl(fast, 0), learner: syl(learner, 0),
      refs: syl(main.filter(r => r.kind === 'reference'), 0), alts: syl(main.filter(r => r.kind === 'alt'), 0),
      robustness: R.offsets.map(o => ({ o, ...syl(main, o) })),
      perfect: main.filter(r => r.byOffset[0] && r.byOffset[0].ok && r.byOffset[0].hits === r.byOffset[0].count).length,
      attempts: main.length,
      byTone: {}, confusion: {},
    };
    for (const t of TONES) { s.confusion[t] = {}; for (const u of [...TONES, 'none']) s.confusion[t][u] = 0; }
    for (const r of main) {
      const z = r.byOffset[0];
      r.targets.forEach((tg, i) => {
        const t = tg.split('|')[0];
        const heard = z && z.ok ? (z.syl[i].hit ? t : (z.syl[i].heard || 'none')) : 'none';
        s.confusion[t][heard]++;
      });
    }
    for (const t of TONES) { const row = s.confusion[t]; const tot = Object.values(row).reduce((a, b) => a + b, 0); s.byTone[t] = `${row[t]}/${tot}`; }
  }
  if (R.runs['48000'] && R.runs['44100']) {
    let same = 0, n = 0;
    R.runs['48000'].forEach((r, k) => {
      const a = r.byOffset[0], b = R.runs['44100'][k] && R.runs['44100'][k].byOffset[0];
      r.targets.forEach((_, i) => { n++; const va = a && a.ok ? a.syl[i].hit : null, vb = b && b.ok ? b.syl[i].hit : null; if (va === vb) same++; });
    });
    S.srAgreement = `${same}/${n}`;
  }
  return S;
}

function lines(S) {
  const o = [];
  for (const [sr, s] of Object.entries(S.bySr)) {
    o.push(`@${sr / 1000}k  syllables right: ${s.main.hit}/${s.main.n} (${(100 * s.main.hit / s.main.n).toFixed(1)}%)  [references ${s.refs.hit}/${s.refs.n}, alternatives ${s.alts.hit}/${s.alts.n}]  perfect attempts ${s.perfect}/${s.attempts}  failed attempts ${s.main.failed}  mean score ${s.main.meanPct}%`);
    o.push(`        by tone ${Object.entries(s.byTone).map(([k, v]) => k + ' ' + v).join(', ')}   fast attempts: ${s.fast.hit}/${s.fast.n}` + (s.learner.n ? `   learner app attempts: ${s.learner.hit}/${s.learner.n}` : ''));
    o.push(`        centre off by (st): ${s.robustness.map(r => (r.o > 0 ? '+' : '') + r.o + ':' + r.hit).join('  ')}  (of ${s.main.n})`);
  }
  if (S.srAgreement) o.push(`same syllable verdict at 44.1k and 48k: ${S.srAgreement}`);
  return o;
}
function attemptLine(r) {
  const z = r.byOffset[0];
  const tg = r.targets.map(t => t.split('|')[0]);
  const v = z && z.ok ? z.syl.map((s, i) => s.hit ? L[tg[i]] : (s.heard ? s.heard[0] : '-')).join('') : 'FAILED ' + (z ? z.reason : '');
  return `${(r.id + '#' + r.k + (r.speed ? '(' + r.speed + ')' : '')).padEnd(22)} ${tg.map(t => L[t]).join('')} -> ${v}${z && z.ok ? '  ' + z.hits + '/' + z.count + ' ' + z.percent + '%' : ''}`;
}

if (process.argv[1] && process.argv[1].endsWith('ttreport.mjs')) {
  const [a, b] = process.argv.slice(2);
  const A = load(a);
  console.log(`${A.label}`); lines(ttSummary(A)).forEach(l => console.log('  ' + l));
  if (b) {
    const B = load(b);
    console.log(`\n${B.label}`); lines(ttSummary(B)).forEach(l => console.log('  ' + l));
    for (const sr of Object.keys(A.runs)) {
      if (!B.runs[sr]) continue;
      console.log(`\nAttempts that changed @${sr / 1000}k (before -> after):`);
      A.runs[sr].forEach((r, k) => { const x = attemptLine(r), y = attemptLine(B.runs[sr][k]); if (x !== y) console.log('  ' + x + '\n  ' + ' '.repeat(22) + ' => ' + y.slice(23)); });
    }
  } else {
    for (const [sr, rows] of Object.entries(A.runs)) { console.log(`\n@${sr / 1000}k (target -> heard; capital = correct)`); rows.forEach(r => console.log('  ' + attemptLine(r))); }
  }
}
