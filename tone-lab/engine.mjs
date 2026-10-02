// Loads the REAL tone-trainer.js into a Node vm sandbox with a fake browser
// (AudioContext / getUserMedia / requestAnimationFrame), so the exact engine
// code the app ships is what analyses the audio. Nothing is re-implemented.
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

export function loadEngine(srcPath, sampleRate = 48000) {
  let src = fs.readFileSync(srcPath, 'utf8');
  // ES-module import of Pitchy -> stub (only used by the unused createDetector).
  src = src.replace(/^import\s+\{\s*PitchDetector\s*\}\s+from\s+['"][^'"]+['"];?/m,
                    'const PitchDetector = { forFloat32Array(){ return {}; } };');

  const rafQueue = [];
  const fake = { tap: null };
  class FakeCtx {
    constructor() { this.sampleRate = sampleRate; this.state = 'running'; this.destination = {}; this.audioWorklet = undefined; }
    async resume() { this.state = 'running'; }
    suspend() { this.state = 'suspended'; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createScriptProcessor() { const n = { onaudioprocess: null, connect() {}, disconnect() {} }; fake.tap = n; return n; }
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  }
  const sandbox = {
    console, Math, Date, JSON, Promise, setTimeout, clearTimeout, Float32Array, Float64Array,
    Uint8Array, ArrayBuffer, DataView, Blob: class {}, URL: { createObjectURL() { return ''; } },
    navigator: { mediaDevices: { async getUserMedia() { return { getTracks() { return [{ stop() {} }]; } }; } } },
    document: { getElementById() { return null; }, documentElement: {}, querySelectorAll() { return []; } },
    getComputedStyle() { return { getPropertyValue() { return ''; } }; },
    requestAnimationFrame(cb) { rafQueue.push(cb); return rafQueue.length; },
    cancelAnimationFrame() { rafQueue.length = 0; },
  };
  sandbox.window = sandbox;
  sandbox.AudioContext = FakeCtx;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'tone-trainer.js' });
  const dsp = sandbox.toneDsp;

  // Drive the real capture engine with PCM, chunked like a ScriptProcessor
  // (1024 samples) with one rAF tick per chunk. Resolves with exactly what the
  // app's onEnd receives.
  async function capture(pcm, centreHint) {
    const cap = dsp.createCapture();
    let result = null;
    await cap.start({ centreHint, onEnd: r => { result = r; } });
    const CH = 1024;
    for (let i = 0; i < pcm.length && !result; i += CH) {
      const chunk = pcm.subarray(i, Math.min(pcm.length, i + CH));
      if (fake.tap && fake.tap.onaudioprocess) fake.tap.onaudioprocess({ inputBuffer: { getChannelData: () => chunk } });
      const q = rafQueue.splice(0); for (const cb of q) cb(performance.now());
    }
    if (!result) cap.stop('manual');
    cap.release();
    return result;
  }
  return { dsp, capture, sandbox };
}

export function decode(file, sampleRate) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(sampleRate),
    '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4).slice();
}

// Deterministic low-level noise so the capture sees a realistic mic floor
// rather than digital silence (mulberry32 + Box-Muller).
export function noise(n, rms, seed = 1) {
  let a = seed >>> 0;
  const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 2) {
    const u = Math.max(1e-12, rnd()), v = rnd();
    const r = Math.sqrt(-2 * Math.log(u)) * rms;
    out[i] = r * Math.cos(2 * Math.PI * v);
    if (i + 1 < n) out[i + 1] = r * Math.sin(2 * Math.PI * v);
  }
  return out;
}

// Split a multi-word recording into words by short-time energy.
export function splitWords(pcm, sr, { minGapMs = 180, relDb = -32, minWordMs = 120 } = {}) {
  const hop = Math.round(sr * 0.01), win = hop * 2;
  const env = [];
  for (let i = 0; i + win <= pcm.length; i += hop) {
    let s = 0; for (let j = i; j < i + win; j++) s += pcm[j] * pcm[j];
    env.push(Math.sqrt(s / win));
  }
  const peak = Math.max(...env);
  const thr = peak * Math.pow(10, relDb / 20);
  const segs = [];
  let cur = null;
  env.forEach((e, k) => {
    if (e >= thr) {
      if (cur && (k - cur.end) * 10 <= minGapMs) cur.end = k;
      else { cur = { start: k, end: k }; segs.push(cur); }
    }
  });
  return segs.filter(s => (s.end - s.start) * 10 >= minWordMs)
             .map(s => ({ startMs: s.start * 10, endMs: (s.end + 2) * 10 }));
}

// Build the audio a learner's mic would deliver for one word: lead-in room
// tone, the word (with its own natural edges), trailing room tone.
export function asTake(pcm, sr, startMs, endMs, { leadMs = 450, padMs = 120, tailMs = 1800, noiseRms = 0.0015, seed = 1, gain = 1 } = {}) {
  const a = Math.max(0, Math.round((startMs - padMs) * sr / 1000));
  const b = Math.min(pcm.length, Math.round((endMs + padMs) * sr / 1000));
  const lead = Math.round(leadMs * sr / 1000), tail = Math.round(tailMs * sr / 1000);
  const out = noise(lead + (b - a) + tail, noiseRms, seed);
  for (let i = a; i < b; i++) out[lead + i - a] += pcm[i] * gain;
  return out;
}
