import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync(process.argv[2] || new URL('./out/results.json', import.meta.url).pathname));
const L = { mid: 'M', low: 'L', falling: 'F', high: 'H', rising: 'R', null: '.' };
const z = R.offsets.indexOf(0);
for (const [sr, run] of Object.entries(R.runs)) {
  console.log(`\n=== SR ${sr}  (strip = calibration offset -3 .. +3 st, step .25; '#'=correct, else letter of wrong guess; '|' = actual calibration)`);
  let ok = 0, tot = 0;
  const perTone = {};
  for (const [name, sp] of Object.entries(run.speakers)) {
    const allOk = R.offsets.map((o, k) => sp.res.every(r => r.sweep[k] === r.label));
    const win = R.offsets.filter((o, k) => allOk[k]);
    console.log(`${name.padEnd(14)} centre ${sp.centre.toFixed(1)} Hz   all-5-correct offsets: ${win.length ? win[0] + '..' + win[win.length - 1] + ' (' + win.length + ' steps)' : 'NONE'}`);
    for (const r of sp.res) {
      const strip = r.sweep.map((t, k) => (k === z ? '|' : '') + (t === r.label ? '#' : L[t])).join('');
      tot++; if (r.sweep[z] === r.label) ok++;
      (perTone[r.label] ||= []).push(r.sweep);
      console.log(`   ${r.label.padEnd(8)} ${r.word.padEnd(5)} ${strip}  -> ${String(r.tone).padEnd(8)} conf ${r.conf?.toFixed(2)}  ${JSON.stringify(r.scores)}`);
    }
  }
  console.log(`accuracy at calibrated centre: ${ok}/${tot}`);
  for (const [tone, sw] of Object.entries(perTone)) {
    const row = R.offsets.map((o, k) => sw.filter(s => s[k] === tone).length);
    console.log(`  ${tone.padEnd(8)} correct/10 by offset: ${row.join(' ')}`);
  }
  const tot50 = R.offsets.map((o, k) => Object.entries(perTone).reduce((s, [tone, sw]) => s + sw.filter(x => x[k] === tone).length, 0));
  console.log(`  TOTAL/50  by offset: ${R.offsets.map((o, k) => o + ':' + tot50[k]).join(' ')}`);
  console.log('\n  singles (src C calibrated on gin/bpai/nom at ' + run.singles.calC.toFixed(1) + ' Hz; A/B shown at 200 Hz):');
  for (const [id, s] of Object.entries(run.singles)) {
    if (id === 'calC') continue;
    const wins = []; let a = null, prev = null;
    for (const [c, t] of s.sweepHz) { if (t === s.label) { if (a === null) a = c; prev = c; } else if (a !== null) { wins.push(a + '-' + prev); a = null; } }
    if (a !== null) wins.push(a + '-' + prev);
    console.log(`   ${s.src} ${id.padEnd(5)} ${s.label.padEnd(8)} @${s.centre.toFixed(0)}Hz -> ${String(s.tone).padEnd(8)} conf ${s.conf?.toFixed(2)}   correct-centre window(s): ${wins.join(', ') || 'NONE'} Hz`);
  }
}
