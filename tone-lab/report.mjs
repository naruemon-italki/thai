// Human-readable report for ONE run:  node report.mjs [out/results-<label>.json]
// With two files it prints a before/after comparison instead:
//   node report.mjs out/results-v1.json out/results-v2.json
import fs from 'node:fs';
import { summarise, changes } from './metrics.mjs';

const HERE = new URL('./', import.meta.url).pathname;
const args = process.argv.slice(2);
const load = f => JSON.parse(fs.readFileSync(f));
const L = { mid: 'M', low: 'L', falling: 'F', high: 'H', rising: 'R' };

function lines(S) {
  const a = S.accuracy, o = [];
  for (const sr of Object.keys(a)) o.push(`Native accuracy @${sr / 1000}k: ${a[sr].correct}/${a[sr].total} (${a[sr].pct}%)   by tone ${Object.entries(a[sr].byTone).map(([k, v]) => k + ' ' + v).join(', ')}   original 10 speakers ${a[sr].bySet.original}, new ${a[sr].bySet.new}, holdout ${a[sr].bySet.holdout}` + (a[sr].bySet.new2 && a[sr].bySet.new2 !== "0/0" ? `, partner extra words ${a[sr].bySet.new2}` : ""));
  o.push(`Calibration off by (st):  ${S.robustness.map(r => (r.offset > 0 ? '+' : '') + r.offset + ':' + r.correct).join('  ')}   (of ${S.robustness[0].total})`);
  o.push(`Speakers with every word right for any calibration error within ±1 st: ${S.robustSpeakers.within1st}/${S.robustSpeakers.total}`);
  if (S.sampleRateAgreement) o.push(`Same verdict at 44.1k and 48k: ${S.sampleRateAgreement.same}/${S.sampleRateAgreement.total} (${S.sampleRateAgreement.pct}%)`);
  if (S.volume) o.push(`Volume (Female7 vs +7 dB copy): ${S.volume.same}/${S.volume.total} same verdict  quiet [${S.volume.quiet}]  loud [${S.volume.loud}]`);
  const c = S.confidence;
  o.push(`Confidence: right ${c.meanWhenRight}, wrong ${c.meanWhenWrong};  wrong answers shown as "Clear": ${c.wrongButClear}/${c.wrong};  right answers shown as "Unsure": ${c.rightButUnsure}/${c.right}`);
  const ch = S.challenge;
  o.push(`Challenge, tone they said:  mean ${ch.correctTone.meanPct}%, Good+ ${ch.correctTone.goodOrBetter}%, Great+ ${ch.correctTone.greatOrBetter}%`);
  o.push(`Challenge, a different tone: mean ${ch.wrongTone.meanPct}%, Good+ ${ch.wrongTone.goodOrBetter}%, Great+ ${ch.wrongTone.greatOrBetter}%   (level-vs-level: mean ${ch.wrongLevelTone.meanPct}%, Good+ ${ch.wrongLevelTone.goodOrBetter}%)`);
  o.push(`Example buttons (baked): ${S.examples.correct}/${S.examples.total} correct, ${S.examples.clear} Clear ${S.examples.failures.length ? '  issues: ' + S.examples.failures.join(' ') : ''}`);
  o.push(`Example mp3s analysed live (calibrated set): ${S.exampleAudioCalibrated.correct}/${S.exampleAudioCalibrated.total} ${S.exampleAudioCalibrated.failures.join(' ')}`);
  o.push(`Learner (intended tone), centre ${S.learner.centerHz} Hz: ${S.learner.agree}/${S.learner.total} agree   ` +
    S.learner.words.map(w => `${L[w.said]}>${w.heard ? L[w.heard] : '-'}`).join(' '));
  return o;
}

function confusion(S) {
  const T = Object.keys(S.confusion);
  return ['said \\ heard  ' + T.map(t => t.slice(0, 4).padStart(5)).join('') + ' none',
          ...T.map(r => r.padEnd(14) + T.map(c => String(S.confusion[r][c]).padStart(5)).join('') + String(S.confusion[r].none).padStart(5))];
}

if (args.length >= 2) {
  const A = load(args[0]), B = load(args[1]);
  const SA = summarise(A), SB = summarise(B);
  console.log(`BEFORE: ${SA.label} (${SA.engine})`); lines(SA).forEach(l => console.log('  ' + l));
  console.log(`\nAFTER:  ${SB.label} (${SB.engine})`); lines(SB).forEach(l => console.log('  ' + l));
  console.log('\nConfusion BEFORE'); confusion(SA).forEach(l => console.log('  ' + l));
  console.log('Confusion AFTER'); confusion(SB).forEach(l => console.log('  ' + l));
  const ch = changes(A, B);
  console.log(`\nWords whose verdict changed @48k (${ch.filter(c => c.kind === 'fixed').length} fixed, ${ch.filter(c => c.kind === 'BROKEN').length} broken, ${ch.filter(c => c.kind === 'changed').length} wrong→other wrong):`);
  for (const c of ch) console.log(`  ${c.kind.padEnd(7)} ${c.spk.padEnd(4)} ${c.group.padEnd(7)} ${String(c.file).padEnd(18)} #${c.idx} said ${c.said.padEnd(8)} ${String(c.before).padEnd(8)} -> ${c.after}`);
} else {
  const R = load(args[0] || HERE + 'out/results-current.json');
  const S = summarise(R);
  console.log(`${S.label}  (${S.engine}, ${S.date})`);
  lines(S).forEach(l => console.log('  ' + l));
  console.log(''); confusion(S).forEach(l => console.log('  ' + l));
  // Per-speaker strips: one char per calibration offset, '|' at the real centre.
  const z = R.offsets.indexOf(0);
  console.log(`\nPer word @48k: strip = calibration offset ${R.offsets[0]}..+${R.offsets[R.offsets.length - 1]} st ('#' correct, else letter heard; '|' = real calibration)`);
  for (const [id, sp] of Object.entries(R.runs['48000'] ? R.runs['48000'].speakers : Object.values(R.runs)[0].speakers)) {
    console.log(`  ${id.padEnd(4)} ${sp.group.padEnd(7)} centre ${sp.profile ? sp.profile.centerHz.toFixed(1) : '-'} Hz`);
    for (const t of sp.tokens) {
      const strip = t.sweep.map((x, k) => (k === z ? '|' : '') + (x === t.label ? '#' : x ? L[x] : '.')).join('');
      console.log(`       ${t.label.padEnd(8)} ${strip}  -> ${String(t.tone).padEnd(8)} conf ${t.conf}`);
    }
  }
}
