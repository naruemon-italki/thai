// End-to-end check of the Trainer's own UI code (calibration modal + practice)
// against a minimal fake DOM: the same functions the buttons call run here.
import { loadEngine, asTake } from './engine.mjs';
import { SPEAKERS } from './corpus.mjs';
import { speakerSet } from './lab.mjs';

const els = {};
function el(id) {
  if (els[id]) return els[id];
  const h = {};
  const e = els[id] = {
    id, hidden: false, disabled: false, value: '', textContent: '', innerHTML: '', className: '', style: {}, dataset: {},
    classList: { _s: new Set(['hidden']), add(...c) { c.forEach(x => this._s.add(x)); }, remove(...c) { c.forEach(x => this._s.delete(x)); },
                 toggle(c, on) { if (on === undefined ? !this._s.has(c) : on) this._s.add(c); else this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    addEventListener(t, f) { (h[t] ||= []).push(f); }, click() { (h.click || []).forEach(f => f({ stopPropagation() {} })); },
    querySelector() { return el(id + '>q'); }, querySelectorAll() { return []; }, appendChild() {}, insertBefore() {}, removeChild() {},
    setAttribute() {}, closest() { return el(id + '>card'); }, focus() {}, getBoundingClientRect() { return { width: 300, height: 200 } },
    getContext() { return new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({})), set: (t, k, v) => (t[k] = v, true) }); },
    parentNode: null, clientWidth: 300, clientHeight: 200, width: 300, height: 200,
  };
  e.parentNode = { insertBefore() {} };
  return e;
}
const document = { getElementById: el, createElement: () => el('new' + Math.random()), documentElement: {}, querySelectorAll() { return []; }, body: el('body') };
const SR = 48000;
const E = loadEngine(new URL('../tone-trainer.js', import.meta.url).pathname, SR, { document });
const W = E.sandbox;
W.state = { toneProfiles: [] }; W.saveStorage = () => {}; W.addEventListener = () => {}; W.removeEventListener = () => {}; W.getComputedStyle = () => ({ getPropertyValue: () => '' });
el('view-tone').classList.remove('hidden');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function say(take, btnId) {
  el(btnId).click();
  await sleep(5);
  let ended = false;
  const cap = () => !el(btnId).classList.contains('recording');
  E.feed(take, () => { ended = cap(); return ended; });
  await sleep(5);
}

for (const id of (process.env.SPK ? process.env.SPK.split(',').filter(x => SPEAKERS.some(s => s.id === x)) : ['F8', 'PF', 'L1'])) {
  const sp = SPEAKERS.find(s => s.id === id);
  const { toks, takes, calTakes, spare } = speakerSet(sp, SR);
  W.state.toneProfiles = [];
  // ---- calibration through the modal ----
  W.openToneCalibration(null, () => {});
  el('tone-cal-name').value = id;
  el('tone-cal-name-next').click();
  const queue = calTakes.concat(spare);
  let words = 0;
  while (!W.state.toneProfiles.length && queue.length && words < 6) {
    await say(queue.shift(), 'tone-cal-rec-btn'); words++;
    if (process.env.TRACE) console.log('   after word', words, '| status:', el('tone-cal-status').textContent, '| progress:', el('tone-cal-progress').textContent, '| rec:', el('tone-cal-rec-btn').classList.contains('recording'));
    await sleep(760);                                        // CAL_SUCCESS_MS pause
  }
  const prof = W.state.toneProfiles[0];
  console.log(`${id}: calibrated on ${words} words -> ${prof ? Math.round(prof.centerHz) + ' Hz (calVersion ' + prof.calVersion + ')' : 'FAILED'}  status "${el('tone-cal-status').textContent}"  done "${el('tone-cal-done-msg').textContent}"`);
  // ---- practice in the Trainer ----
  W.enterTone();
  el('tone-start-btn').click();
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    await say(takes[i], 'tone-mic-btn');
    out.push(`${toks[i].label[0].toUpperCase()}>${el('tone-detected').textContent.split(' ')[0] || '-'}(${(el('tone-status').textContent.match(/Clear|Likely|Unsure/) || ['?'])[0]})`);
  }
  console.log('   trainer readout:', out.join(' '));
}

// Scenario: the third calibration word is said on a HIGH tone by mistake.
// Expect: "one more word" is requested, then the profile is saved from the
// median of four words, close to the clean value.
{
  const sp = SPEAKERS.find(s => s.id === 'F7');
  const { toks, takes } = speakerSet(sp, SR);
  W.state.toneProfiles = [];
  W.openToneCalibration(null, () => {});
  el('tone-cal-name').value = 'odd';
  el('tone-cal-name-next').click();
  const seq = [takes[0], takes[0], takes[3], takes[0]];      // mid, mid, HIGH, mid
  const log = [];
  for (const t of seq) {
    if (W.state.toneProfiles.length) break;
    await say(t, 'tone-cal-rec-btn');
    await sleep(760);
    log.push(`${el('tone-cal-progress').textContent} / "${el('tone-cal-status').textContent}"`);
  }
  const prof = W.state.toneProfiles[0];
  console.log('needMore scenario:', log.join('  ->  '));
  console.log('   saved:', prof ? Math.round(prof.centerHz) + ' Hz' : 'nothing', ' (clean F7 calibration is ~204 Hz)');
}
