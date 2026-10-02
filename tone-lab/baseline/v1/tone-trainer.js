/* =========================================================================
   TONE TRAINER  (Thai tone visualizer — Phases 1 & 2)
   -------------------------------------------------------------------------
   ES module. Imports Pitchy locally (offline-friendly, precached) and exposes
   enterTone()/teardownTone() on window so the app's non-module navigate() /
   navigate-teardown code can call them via the same `typeof fn === 'function'`
   pattern it uses for Sentence Builder.

   Pipeline: getUserMedia -> AudioContext -> AnalyserNode. Each animation frame
   we pull a time-domain buffer, run Pitchy's McLeod Pitch Method to get
   [freqHz, clarity], apply octave-error correction + median filtering, convert
   to SEMITONES relative to the speaker's CALIBRATED centre (per voice profile)
   so the five Thai tones land at their true height, and draw on a canvas. The
   audio never leaves the AnalyserNode — nothing is uploaded or stored.

   Talks to the rest of the app through exactly three window touchpoints:
     window.state, window.saveStorage, window.tts
   and exposes exactly two hooks back: window.enterTone, window.teardownTone.
   ========================================================================= */

import { PitchDetector } from './pitchy.js';

(function () {
  'use strict';

  // ---- Config ----
  // ANALYSIS FRAMING (rewritten). Previously the pipeline read one analyser
  // frame per requestAnimationFrame tick, so the number of contour points — and
  // therefore every duration/velocity threshold — depended on the device's frame
  // rate. A 90ms word (รถ rót, เผ็ด pèt) yielded 4 usable points at 60fps and 1
  // at 30fps, which is why short words were intermittently rejected.
  //
  // Now raw audio is buffered continuously (AudioWorklet, ScriptProcessor
  // fallback) and analysed at a FIXED 10ms hop, so a 90ms word always yields
  // ~9 points on every device. rAF only drains the buffer and repaints; if it
  // fires late it simply processes several hops at once. Nothing is lost.
  const HOP_MS = 10;                 // fixed analysis hop — the contour's time resolution
  const WIN_NARROW = 1024;           // ~23ms @44.1k: good time resolution for fast tone moves
  const WIN_WIDE = 2048;             // ~46ms @44.1k: fallback for low/creaky voices where the
                                     // narrow window holds too few periods for reliable MPM
  const NARROW_MIN_HZ = 110;         // below this the narrow window is unreliable -> try wide
  const FFT_SIZE = WIN_WIDE;         // kept for the exported config (external callers)

  const ANALYSIS_PERIODS = 4;        // window length = this many periods of the
                                     // speaker's voice (see openMic)
  const NSDF_MIN = 0.35;             // keep NSDF peaks at least this strong as candidates
  const SEARCH_LO = -15;             // period search band around the calibrated centre,
  const SEARCH_HI = 12;              // in semitones. Constraining the SEARCH is what
                                     // prevents harmonic errors; repairing them after
                                     // the fact does not work, because they are
                                     // sustained across many frames.
  // Subharmonic defence. MPM's `k` rule — prefer the SHORTEST near-maximal
  // period — is the standard guard against reporting an octave too low, and it
  // was lost when the library's PitchDetector was replaced. It matters enormously
  // for some voices: on the learner recording, 50-84% of frames had an
  // octave-down rival whose NSDF was 0.87-0.98 of the best, so peak strength
  // alone cannot tell them apart and the octave choice ended up being decided by
  // the band and by smoothness instead of by evidence.
  const SUBHARM_RATIO = 0.88;        // a rival at ~2x this candidate's frequency, at least
                                     // this strong, marks the candidate as a subharmonic
  const OCT_W_SUBHARM = 1.6;         // ...and costs it this much in the path search
  const OCT_W_NSDF = 1.0;            // Viterbi weights: peak strength,
  const OCT_W_BAND = 1.2;            //   distance outside the plausible band,
  const OCT_W_JUMP = 0.9;            //   and pitch discontinuity.
  // End-artifact guards. A short single word has ONE tone: it cannot be both
  // rising and falling. A brief, sharp excursion at the very end that runs
  // against the word's overall direction is an artifact (tracker error, creak,
  // breath, mic bump), not part of the tone, and must not decide the verdict.
  const REVERSAL_ST = 4.0;           // displacement against the trend that counts as a reversal.
                                     // Set high on purpose: with the octave bug fixed this is a
                                     // safety net for gross artifacts, and a low threshold would
                                     // start eating genuine contour movement.
  const REVERSAL_MAX_MS = 90;        // ...and the longest such tail we treat as an artifact
  const TREND_MIN_ST = 2.0;          // only protect words that have a clear direction at all
  const REVERSAL_STEP_ST = 1.8;      // ...and the tail must begin with an abrupt jump. Real
                                     // phonation glides; a tracker slip or a mic bump steps.
  const EDGE_IGNORE_MIN_PTS = 16;    // contours at least this long are judged on an inner core,
                                     // so no single boundary frame can flip the answer
  const CREAK_RMS_FRAC = 0.55;       // trailing frames below this fraction of the word's
                                     // loudest level are candidates for creak trimming
  const CREAK_DROP_ST = 3.0;         // ...and must also sit this far below the body's pitch
  const CREAK_MAX_FRAC = 0.28;       // never trim more than this share of the contour
  const CREAK_ONSET_MAX_ST = 1.0;    // ...and only when the word STARTED near the speaker's
                                     // centre. Measured across nine speakers, falling tones
                                     // begin +3.7 to +7.3 semitones above centre while high
                                     // tones begin -1.5 to +2.1. So a big quiet terminal drop
                                     // means different things depending on where the word
                                     // started: after a centre-level onset it is a glottal
                                     // release, after a high onset it IS the tone.
  const CREAK_MAX_MS = 150;          // ...nor more than this in absolute time. A glottal
                                     // release is brief; a falling tone's descent is not, and
                                     // it is ALSO quiet and far below the body, so the energy
                                     // test alone cannot tell them apart.
  // TERMINAL RELEASE. When a speaker stops phonating, the voice falls away and
  // the tracker follows it down. On a HIGH tone that drop is the last thing in
  // the contour, so it sets `last`, `net` and the max drawdown, and the word is
  // read as FALLING — the single worst confusion this module can make.
  //
  // trimTerminalReversal cannot catch it, for two structural reasons measured on
  // the corpus: (1) its TREND_MIN_ST gate is computed over a body that still
  // CONTAINS the artifact, so the bigger the artifact the smaller the trend and
  // the more certainly the trim declines — a clean high tone trends only ~1.9,
  // already under the 2.0 gate, so high tones are excluded as a class; and
  // (2) it requires an abrupt STEP, but a real release is often a smooth glide
  // (F5/high descends 8.1 semitones with a largest single-frame drop of 1.3).
  //
  // What DOES separate a release from a falling tone is WHERE THE PEAK IS.
  // Measured over 50 words:
  //     falling  peak at 0.39-0.49 of the syllable (or 0.00), tail 0.54-1.00
  //     high     peak at 0.69-1.00,                            tail 0.00-0.31
  // A Thai falling tone reaches its peak early and the fall IS the syllable. No
  // falling tone in the corpus peaks after the halfway mark. So a drop that only
  // begins once the syllable is mostly over is a release, not a tone.
  const RELEASE_PEAK_MIN = 0.55;     // the peak must sit at least this far through the word
  const RELEASE_TAIL_MAX_FRAC = 0.45;// ...and what follows it must be at most this share
  const RELEASE_TAIL_MAX_MS = 250;   // ...and this long. A release is brief in absolute time;
                                     // this is what keeps a slow MID word with a late shallow
                                     // peak (measured: 299ms of tail) out of the rule.
  const RELEASE_MIN_DROP_ST = 2.5;   // below this there is nothing worth removing
  const OCTAVE_SNAP_ST = 8.5;        // minimum deviation from local context before an octave
  const OCTAVE_SNAP_MAX = 15.5;      // snap is considered, and the maximum. Requiring the
                                     // deviation to look like an ACTUAL octave stops the snap
                                     // from mangling the steep end of a genuine rising or
                                     // falling tone, where the local median is dominated by
                                     // the body and any real excursion looks like an error.
  const OCTAVE_SNAP_EDGE = 2;        // ...and never touch this many frames at either end
  const RISE_SIZE_LO = 4.0;          // draw-up at which riseSize starts to ramp (saturates +5).
                                     // Do NOT raise this: at 5.0 and 6.0 the rising TONE_REFS
                                     // shape stops self-classifying at 90%, which is the
                                     // regression TONE-HANDOFF section 5.1 records.
  const RISE_LATE_FLOOR = 0.50;      // Floor of the riseLate multiplier (0.20 -> 0.40 -> 0.50).
                                     //
                                     // riseLate exists to say "a rising tone holds low and
                                     // climbs late; a high tone climbs from the first frame".
                                     // Measured across the corpus, THAT PREMISE IS FALSE: by
                                     // every definition of climb onset tried (position of the
                                     // running minimum, when the contour leaves the bottom 2 or
                                     // 3 semitones, how long it holds there, where it crosses
                                     // its own midpoint) high and rising overlap completely --
                                     // F1/high and F5/high leave the floor at 0.69 and 0.73,
                                     // LATER than most rising tones.
                                     //
                                     // Worse, the proxy it uses is the position of the running
                                     // MINIMUM, and inside a held-low body the minimum lands
                                     // wherever the smallest wobble is, usually at the very
                                     // start. So the more textbook the rising tone -- a long
                                     // flat low hold, then a sweep up -- the earlier it reads
                                     // and the harder rising was penalised, down to 0.20x.
                                     // Saying it BETTER scored it WORSE.
                                     //
                                     // The size of the climb (riseSize) does separate the two
                                     // (high 3.3-8.7 st, rising 8.0-16.4), so the fix is to
                                     // stop the timing term overriding it. Swept: below 0.30
                                     // the failure persists; at 0.55 genuine high tones
                                     // (F3, F4) start reading as rising.
                                     //
                                     // Raised 0.40 -> 0.50 on evidence from a LEARNER reading
                                     // (krai_mine.mp3, the user's own voice at his calibrated
                                     // 143 Hz). His ขาย is a textbook held-low rising tone --
                                     // confirmed by a native speaker -- and it sits on a knife
                                     // edge: rising 0.45 against high 0.40, a margin of 0.05.
                                     // The app returned HIGH and 39%; the test kit returned
                                     // RISING on the same recording. A 0.05 margin is what
                                     // "the same syllable classified two different ways"
                                     // looks like.
                                     //
                                     // duStartAt is 0.00 there -- the worst case, the running
                                     // minimum sitting on the first frame -- so riseLate was
                                     // pinned to its floor. 0.50 triples the margin to 0.16
                                     // with NO change to any corpus count (Trainer 48/50,
                                     // synthetic 20/20, TONE_REFS 5/5, Twister 84/103) and
                                     // keeps a buffer to the 0.55 cliff.
                                     //
                                     // Also tried and rejected: damping the high score's
                                     // "ends high" term by where the contour STARTED. Well
                                     // motivated -- that one term supplied the learner's entire
                                     // high score of 0.40 -- but it costs the Trainer corpus
                                     // 48/50 -> 47/50 at every weight from 0.3 to 1.0, and does
                                     // not let the floor go any higher.
  const EDGE_GLITCH_ST = 3.0;
  const EDGE_GLITCH_MAX = 3;         // at most this many frames trimmed from each end        // trim an edge frame this far off its neighbours
  // NOISE PLATEAU at either edge of a run. A steady background sound (a fan,
  // a room buzz, mains hum) has a stable period, so the tracker locks onto it
  // and reports a confident, perfectly FLAT pitch. Step 4 of refineRun extends
  // the run outward through quiet frames on purpose — a falling tone's tail is
  // quiet and must not be lost — and that extension is what lets such frames in.
  // Once in, they are endpoints, so they set maxV/minV and therefore `first`,
  // `net`, `riseToPeak` and the falling score's peakFactor.
  //
  // Measured on the corpus: being quiet is NOT diagnostic. Trailing frames below
  // 15% of the word's body level occur on 40 of 50 words, and a real falling
  // tail (0.038-0.201 of body) overlaps a real high tail (0.031-0.569) entirely.
  // Energy alone cannot separate them, which is why an energy-only trim broke
  // the falling tones once already.
  //
  // What DOES separate them is the same distinction trimTerminalReversal
  // already relies on: real phonation GLIDES, an artifact STEPS. Noise is quiet
  // AND flat AND joined to the word by an abrupt jump; a genuine quiet tail is
  // continuous with the pitch before it. All three must hold.
  const PLATEAU_RMS_FRAC = 0.15;     // "quiet": below this fraction of the run's p90 level
  const PLATEAU_FLAT_ST = 1.5;       // "flat": the block spans less than this, in semitones
  const PLATEAU_STEP_RATIO = 2.0;    // ...or, if it is less flat than that (a drifting buzz),
                                     // the step must still be this many times its internal
                                     // spread. Scale-free, and it is what protects a genuine
                                     // quiet tail: a falling tone's tail GLIDES, so it varies
                                     // as much as its own largest step and fails this test.
  const PLATEAU_STEP_ST = 2.5;       // "abrupt": the jump from the block into the word
  const PLATEAU_MIN_BLOCK = 2;       // ignore single frames — trimEdgeGlitches owns those
  const PLATEAU_MAX_FRAC = 0.30;     // never remove more than this share of the run
  const MPM_K = 0.90;                // MPM peak-picking constant `k` (Pitchy's
                                     // `clarityThreshold`). This is NOT a clarity
                                     // gate — it decides WHICH nsdf peak is taken
                                     // as the period, so a low value makes the
                                     // tracker pick an earlier peak and report an
                                     // octave too low. The library documents 0.8-1.0
                                     // as the sensible range and defaults to 0.9.
                                     // The old code set it to CLARITY_MIN (0.72),
                                     // conflating two unrelated parameters and
                                     // nudging the tracker toward octave-halving.
                                     // Acceptance is handled separately, below.
  const CLARITY_MIN = 0.72;          // acceptance gate on the RETURNED clarity. Short, punchy, high-tone words
                                     // (e.g. รถ rót, เล็ก lék) have low-clarity phonation, so
                                     // this stays permissive. Noise is still rejected: clicks
                                     // and breaths are broadband (clarity well below this) and
                                     // have no stable pitch, and the energy gate still applies.
  const F0_MIN = 70;                 // Hz — below this is almost certainly not voiced speech
  const F0_MAX = 600;                // Hz — generous ceiling; octave-up glitches are corrected
                                     // (halved) rather than discarded.
  const SEMITONE_SPAN = 18;          // DEFAULT vertical range, in semitones (±9 around centre)
  const SPAN_MAX = 30;               // ...but the chart grows to fit the speaker. Measured
                                     // across seven speakers, real tone space spans 13.8 to
                                     // 22.1 semitones — a learner reaching +10.8 and a teacher
                                     // +11.9 were both being clipped by the fixed ±9 window,
                                     // which is why a correctly-tracked high tone could still
                                     // look like it never left the mid band.
  const SPAN_PAD = 2.5;              // headroom kept above/below the contour, in semitones
  const MAX_GAP_MS = 200;            // unvoiced gap longer than this breaks the contour line
  const AUTO_STOP_SILENCE_MS = 1400; // auto-stop after this much trailing silence (once speech began)
  const NO_SPEECH_TIMEOUT_MS = 5000; // tapped but never spoke -> give up (was: ran to the 8s cap)

  // Ceiling on what a caller may request via the per-capture VAD policy below.
  // MAX_CAPTURE_MS (8s) is the DEFAULT, sized for single words; sentence modes
  // need longer. 20s of Float32 @48k is ~3.8MB, allocated once and reused.
  const MAX_CAPTURE_HARD_MS = 20000;

  /* ---- Per-capture VAD policy -------------------------------------------
     The constants above were all tuned for ONE SHORT WORD, and for that job
     they are right. A sentence is a different job: measured across the native
     tongue-twister recordings, the silent gaps BETWEEN WORDS INSIDE a single
     reading run to 400ms (median 315ms), so the 320ms SPEECH_END_MS that
     correctly ends a word would chop a sentence off after its first word or
     two. Rather than loosen the constants for everyone — which would make the
     Trainer and Challenge feel sluggish and would risk the single-word tuning
     those modes depend on — a caller may override them for its own capture.

     Every field defaults to the existing constant, so a caller that passes no
     policy at all behaves EXACTLY as before. That is the whole safety
     argument for this change: the Trainer and Challenge pass nothing.

       speechEndMs        sub-threshold time that ends a speech segment
       autoStopSilenceMs  trailing silence that ends the capture
       noSpeechMs         tapped but never spoke -> give up
       maxCaptureMs       hard cap (clamped to MAX_CAPTURE_HARD_MS)
       minCaptureMs       auto-stop is DISABLED before this much has elapsed.
                          This alone fixes "learner paused after word one",
                          because a mid-sentence pause falls inside the floor.
       multiSegment       keep listening after a segment ends, accumulating
                          segments, instead of stopping at the first one
       shouldStop(ctx)    optional predicate consulted when a segment ends, with
                          { segmentCount, elapsedMs, segments }. Return true to
                          finish. Lets a caller apply its own rule (e.g. "I have
                          heard enough syllables") without this engine needing to
                          know anything about that caller's content.           */
  function resolveVadPolicy(v) {
    v = v || {};
    const num = (x, d) => (typeof x === 'number' && isFinite(x) && x > 0) ? x : d;
    const maxMs = Math.min(num(v.maxCaptureMs, MAX_CAPTURE_MS), MAX_CAPTURE_HARD_MS);
    return {
      speechEndMs:       num(v.speechEndMs, SPEECH_END_MS),
      autoStopSilenceMs: num(v.autoStopSilenceMs, AUTO_STOP_SILENCE_MS),
      noSpeechMs:        num(v.noSpeechMs, NO_SPEECH_TIMEOUT_MS),
      maxCaptureMs:      maxMs,
      // Never let the floor sit at or above the cap, or auto-stop can never fire.
      minCaptureMs:      Math.min(num(v.minCaptureMs, 0), maxMs - 500),
      multiSegment:      !!v.multiSegment,
      shouldStop:        (typeof v.shouldStop === 'function') ? v.shouldStop : null
    };
  }
  const MAX_CAPTURE_MS = 8000;       // hard cap on a single capture
  const MEDIAN_WINDOW = 3;           // CENTRED median width for short contours (30ms at a 10ms
                                     // hop). The old filter was a TRAILING median over 5 rAF
                                     // frames (~83ms), which lagged the true pitch by ~2 frames
                                     // and dragged endpoints toward the middle — measured, it
                                     // pulled a textbook falling tone's final value from -5.0st
                                     // to -1.9st. Centred + narrower preserves the endpoints.
  const MEDIAN_WINDOW_LONG = 5;      // ...widened for long contours where smoothing is safe
  const MEDIAN_LONG_MIN_PTS = 25;    // use MEDIAN_WINDOW_LONG at or above this many points
  const OCTAVE_TOLERANCE = 3;        // semitones — how close to an exact octave a jump must be
                                     // to be treated as an octave error and folded back.
  const MAX_PROFILES = 5;            // cap on saved voice profiles
  const CAL_MIN_SAMPLES = 25;        // minimum accepted pitch frames for a valid calibration

  // Plausibility window around the speaker's calibrated centre, in semitones.
  // Generous: a deep falling tone can reach -8st and creak lower still, a rising
  // tone can top out around +6. Anything outside this after octave folding is a
  // tracker artefact, not phonation.
  const CENTRE_WINDOW_LO = -16;
  const CENTRE_WINDOW_HI = 13;

  // Master switch for the in-trainer debug tools (the "🐞 Debug mode" toggle and
  // its panel). false => the whole debug section is hidden and never wired, so
  // it doesn't appear in the live trainer. Flip to true to restore it exactly as
  // before (capture logging, intended-tone picker, copy/download log).
  const SHOW_DEBUG = false;

  // ---- Voice Activity Detection (VAD) ----
  // We only keep frames that are actually SPEECH. A frame counts as speech when
  // its RMS energy is clearly above the room's noise floor AND it passes the
  // pitch clarity/range checks. This replaces the old fixed edge-trim: instead
  // of blindly cutting 70ms off each end, we find where speech actually is and
  // discard everything else (the breathy dying tail and any silence both fall
  // below the energy floor, so they're excluded automatically).
  const NOISE_SAMPLE_MS = 180;       // provisional ambient measurement window (live VAD only)
  const ENERGY_MARGIN_DB = 9;        // a frame must be this many dB above the noise floor
  const MIN_FLOOR_RMS = 0.004;       // absolute floor so a dead-silent room doesn't set ~0
  const MAX_FLOOR_RMS = 0.020;       // ...and an absolute CEILING, so the floor can never be set
                                     // to speech level. Previously someone who tapped and spoke
                                     // immediately put their own voice into the floor sample,
                                     // pushing the threshold 9dB ABOVE their speech — after which
                                     // nothing they said could ever register.
  const SPEECH_START_MS = 30;        // consecutive VOICED+loud time needed to confirm onset.
                                     // The VOICED requirement (frames must have a pitch) is what
                                     // rejects clicks and breaths.
  const SPEECH_END_MS = 320;         // sustained sub-threshold time that ends a speech segment
  const MIN_SPEECH_MS = 60;          // a finalized word must span at least this much voiced
                                     // speech. Real Thai monosyllables with a stop coda (rót,
                                     // pèt) run ~80-110ms, and duration is now measured as
                                     // (last - first + HOP_MS) rather than fencepost-to-fencepost,
                                     // which used to under-report a 90ms word as 67ms.
  const MIN_VOICED_FRAMES = 4;       // ...and at least this many voiced pitch frames (40ms worth)
  const MIN_CORE_POINTS = 4;         // single source of truth for "enough contour to judge".
                                     // The old code had the trimmer accept 4 and the caller
                                     // demand 5, so a word trimmed to exactly 4 was always
                                     // rejected by a threshold the trimmer thought it had met.
  const MERGE_GAP_MS = 70;           // unvoiced gaps shorter than this don't split a word
                                     // (stop closures, brief devoicing mid-syllable)
  const EXTEND_MS = 120;             // after picking the speech segment, extend outward this far
                                     // while frames are still VOICED and clearly above the floor.
                                     // This is what recovers the quiet tail of a falling tone,
                                     // which the old energy trim cut off — taking the falling
                                     // evidence with it.
  const EXTEND_GATE = 0.55;          // ...frames down to this fraction of the speech threshold
                                     // qualify for that extension (still ~4dB above the floor)

  // Velocity de-spiker, expressed per MILLISECOND rather than per frame, so it
  // means the same thing whatever the hop or frame rate. 0.30 st/ms allows a
  // 9-semitone fall in 30ms — faster than any real voice — while still catching
  // octave errors and boundary garbage.
  const MAX_ST_PER_MS = 0.30;
  const MIN_STEP_ST = 2.5;           // ...but never limit a single step below this

  // Tone-balanced calibration sentence: a spread of all five tones so the MEDIAN
  // pitch lands at a true mid-level (not skewed by tone-heavy text). Short enough
  // to read in a few seconds. Romanization + gloss shown to the learner.
  // Calibration uses THREE isolated mid-tone words, captured the SAME way the game
  // captures words (tap once, auto-stop on end-of-word). This is the key fix: the
  // detection engine measures every contour in semitones relative to centreHz, so
  // centreHz must be the speaker's MID-TONE-IN-ISOLATION level — exactly the zero
  // point the game's single-word contours are judged against. Calibrating on a
  // connected sentence put centreHz in the wrong register (a real speaker measured
  // ~195 Hz from a sentence, then had nearly every isolated word misdetected).
  // Three clean mid-tone words, said in isolation, give a centre that mirrors how
  // people actually speak in these modes. All are basic, familiar words.
  const CAL_WORDS = [
    { thai: 'มา',  rom: 'maa',  gloss: '“to come”' },
    { thai: 'ครู', rom: 'kroo', gloss: '“teacher”' },
    { thai: 'ดี',  rom: 'dee',  gloss: '“good”' }
  ];
  const CAL_WORD_COUNT = CAL_WORDS.length;
  const CAL_SUCCESS_MS = 700;        // success feedback duration (sound + green flash) before
                                     // advancing to the next calibration word; record button is
                                     // frozen+greyed for this window so nothing is tapped mid-cue.

  // The five Thai tones as normalized semitone contours, derived from Abramson's
  // classic F0 measurements of Standard Thai tones (A.S. Abramson, 1962). Values
  // are semitones relative to the speaker's mid-level (0), sampled evenly across
  // normalized syllable duration (left = onset, right = offset). These are the
  // citation-form ("dictionary") shapes for an isolated syllable.
  //   mid     : starts near mid, drifts gently down
  //   low     : sits low, sags slightly
  //   falling : rises to a peak early, then falls steeply
  //   high    : climbs steadily, peaks late, tiny final drop
  //   rising  : dips low first, then sweeps up at the end
  const TONE_REFS = {
    mid:     { label: 'Mid',     th: 'สามัญ',  shape: [0.3, 0.2, 0.0, -0.4, -0.9, -1.4] },
    low:     { label: 'Low',     th: 'เอก',    shape: [-2.0, -2.5, -3.0, -3.4, -3.8, -4.2] },
    falling: { label: 'Falling', th: 'โท',     shape: [1.5, 3.5, 4.2, 2.5, -1.0, -5.0] },
    high:    { label: 'High',    th: 'ตรี',    shape: [-0.5, 0.5, 1.8, 3.2, 4.4, 4.0] },
    rising:  { label: 'Rising',  th: 'จัตวา',  shape: [-1.5, -2.6, -3.0, -2.2, 0.5, 3.8] }
  };
  const TONE_ORDER = ['mid', 'low', 'falling', 'high', 'rising'];

  // ---- Native reference words (the "Listen to native examples" box) ---------
  // A short description of each tone, shown above its row of word buttons.
  const TONE_WORD_INFO = {
    mid:     'The pitch stays fairly level and steady, without rising or falling noticeably. Think of your normal speaking voice.',
    low:     'The pitch starts low and tends to fall slightly. Keep your voice low and relaxed.',
    falling: 'The pitch starts higher and clearly falls downward. Think of saying something with a strong, definite finish.',
    high:    'The pitch starts high and stays high, often with a slightly rising feeling toward the end. Think of a high, energetic voice.',
    rising:  'The pitch rises toward the end, almost like you\'re asking a question.'
  };

  // Native single-word recordings with their contour and centre BAKED IN.
  //
  // Why baked rather than analysed at tap time: the detection engine measures
  // every contour in semitones relative to centreHz, so the same recording drawn
  // against a 130 Hz learner profile and a 190 Hz one would sit at completely
  // different heights and could even be classified differently. These are
  // teaching examples, so every learner must see the identical picture. The
  // points below ARE what the engine produced for that file, at the centre
  // recorded beside them, so nothing is invented — the graph is still showing a
  // real measured contour, it is simply measured once here instead of per user.
  //
  // How each centreHz was chosen (offline, in the test harness): sweep the centre
  // in quarter-semitone steps, keep the centres at which classifyTone() returns
  // the intended tone AND confidence >= 0.60 (so the readout never says
  // "Unsure"), then pick the one that puts this tone's ANCHOR landmark at its
  // target height:
  //
  //     mid      median of the contour   ->   0.0 st   (sits on the centre line)
  //     low      median of the contour   ->  -3.5 st   (middle of the Low band)
  //     high     MINIMUM of the contour  ->  +0.5 st   (never below the centre line)
  //     falling  midpoint of its range   ->  -0.4 st   (excursion centred)
  //     rising   median of the first 40% ->  -3.5 st   (trough in the Low band)
  //
  // The `high` anchor is the important one. An earlier version minimised RMS
  // against TONE_REFS.high.shape, which begins at -0.5 st; high words were
  // therefore drawn starting BELOW the centre line and climbing, which is the
  // picture of a RISING tone and is what a learner reads off the graph. Thai
  // high tone really is high-RISING in citation form — every one of the five
  // recordings tried here climbs 6-8 st — so the shape cannot be fixed by
  // choosing a better take. What distinguishes it from a rising tone is that it
  // never drops below the speaker's mid level, and that is what the anchor now
  // guarantees. Rising words, by contrast, sit at about -3.5 st for their first
  // half, so the two are unambiguous side by side.
  //
  // TONE_REFS itself is deliberately NOT touched: it is shared with the Tone
  // Challenge and sits inside the region forked into tongue-twister.js.
  //
  // `points` are [t_ms, hz] at the engine's own 10 ms hop, t relative to the
  // first frame. A few tracks are edge-trimmed (a consonant-onset step or a
  // final octave flick that the tracker left behind); the trim was applied before
  // these numbers were taken, and every entry was re-verified after trimming.
  const TONE_WORDS = [
    { id: 'gin',   tone: 'mid',      thai: 'กิน',    rom: 'gin',    gloss: 'to eat',                 centreHz: 207.7,
      points: [[0,211.6],[10,211.6],[20,211.6],[30,211.3],[40,211.3],[50,209.2],[60,209.2],[70,209.2],[80,210.6],[90,211.1],[100,211.8],[110,214],[120,215.2],[130,215.2],[140,215.2],[150,214.1],[160,213.6],[170,213.4],[180,213.3],[190,213.3],[200,213],[210,212.5],[220,211.7],[230,208.9],[240,204.4],[250,204.4],[260,204.4],[270,206.1],[280,206.7],[290,207],[300,207.1],[310,207.2],[320,207.9],[330,207.9],[340,207.9],[350,207.9],[360,207.7],[370,207.7],[380,207.7],[390,207.7],[400,207.7],[410,207.6],[420,207.1],[430,206.8],[440,206.8],[450,206.8],[460,206.8],[470,206.9],[480,207],[490,207.2],[500,207.2],[510,207],[520,207],[530,206.9],[540,205.7],[550,204],[560,202.4],[570,200.1],[580,197.3],[590,194.1],[600,191],[610,189],[620,187.5],[630,187.2],[640,187.2],[650,184.9],[660,183.4],[670,179.2],[680,178.9],[690,176.1],[700,175.8],[710,175.8]] },
    { id: 'bpai',  tone: 'mid',      thai: 'ไป',     rom: 'bpai',   gloss: 'to go',                  centreHz: 207.7,
      points: [[0,211.5],[10,210.5],[20,208.1],[30,205.7],[40,202.6],[50,200.3],[60,199.4],[70,198.8],[80,198.4],[90,198.4],[100,198.4],[110,198.4],[120,199.3],[130,201.9],[140,206.4],[150,207],[160,207.3],[170,208.7],[180,208.8],[190,208.8],[200,210],[210,211.9],[220,212.2],[230,213.2],[240,216.1],[250,216.1]] },
    { id: 'nom',   tone: 'mid',      thai: 'นม',     rom: 'nom',    gloss: 'milk',                   centreHz: 210.8,
      points: [[0,206.3],[10,196.9],[20,192.5],[30,192.1],[40,191.9],[50,191.8],[60,192.1],[70,192.1],[80,192.4],[90,197.1],[100,200.4],[110,202],[120,202],[130,202.2],[140,202.2],[150,202.2],[160,202.9],[170,203.1],[180,204.2],[190,207.4],[200,209.9],[210,211.4],[220,214],[230,216.4],[240,218.5],[250,219.4],[260,220.2],[270,220.2],[280,220.2],[290,218.1],[300,215.3],[310,215.1],[320,214.9],[330,214.4],[340,214.4],[350,214.4],[360,215.7],[370,216.9],[380,217],[390,217.1],[400,218.1],[410,218.1],[420,218.1],[430,217.4],[440,217.2],[450,216.5],[460,216],[470,216],[480,215.8],[490,214.7],[500,213.8],[510,212.8],[520,211.2],[530,208.6],[540,206.8],[550,204.4],[560,200.8],[570,195.6],[580,190.9],[590,188.7],[600,185.6],[610,182.4],[620,181.7]] },
    { id: 'gai',   tone: 'low',      thai: 'ไก่',    rom: 'gài',    gloss: 'chicken',                centreHz: 210.8,
      points: [[0,208.6],[10,204.9],[20,201.7],[30,197.7],[40,194.1],[50,193.5],[60,193.1],[70,192.9],[80,192.7],[90,192.5],[100,191.4],[110,190.7],[120,190.3],[130,190.1],[140,189.9],[150,189.9],[160,189],[170,187.9],[180,187.6],[190,186.4],[200,184.6],[210,183.7],[220,182.2],[230,179.6],[240,175.9],[250,171.9],[260,171.9],[270,171.9],[280,171.9],[290,171.9],[300,170.6],[310,168.1],[320,167.9],[330,166.8],[340,166.6],[350,166.6],[360,164.8],[370,164.7],[380,164.7],[390,163.5],[400,162.4],[410,161.6],[420,161.6],[430,161.2],[440,161],[450,161],[460,160.8],[470,160.6],[480,160.2],[490,160.2],[500,160.2],[510,160.2],[520,161.2],[530,161.8],[540,162.5],[550,162.5],[560,164.5],[570,165.4],[580,165.9],[590,166.3],[600,171.3]] },
    { id: 'yoo',   tone: 'low',      thai: 'อยู่',   rom: 'yòo',    gloss: 'to be at (location)',    centreHz: 226.5,
      points: [[0,187.1],[10,180.9],[20,180.9],[30,180.9],[40,184.2],[50,187.3],[60,190.5],[70,193.8],[80,197.3],[90,199.4],[100,200.1],[110,200.1],[120,200.1],[130,199.5],[140,198.1],[150,196.6],[160,195.3],[170,194.5],[180,194.3],[190,193.6],[200,193.4],[210,193.4],[220,193.2],[230,193.1],[240,191.9],[250,190.8],[260,190.5],[270,190.4],[280,190.4],[290,190.4],[300,190.4],[310,190.4],[320,190.1],[330,189.4],[340,188.3],[350,188.1],[360,187.9],[370,187.8],[380,187.3],[390,186.6],[400,185.9],[410,185.9],[420,185.7],[430,185.7],[440,185],[450,184.2],[460,183.8],[470,183.6],[480,183.5],[490,183.2],[500,182.9],[510,182.4],[520,181.8],[530,181.1],[540,180.9],[550,180.6],[560,180],[570,179.5],[580,179.1],[590,178.8],[600,178.5],[610,177.5],[620,176.5],[630,175.3],[640,173.9],[650,173.5],[660,172.8],[670,172.2],[680,172.2],[690,172.2],[700,172.3],[710,172.8],[720,172.8],[730,172.8],[740,171.8],[750,169.9],[760,166.8],[770,163],[780,163],[790,163],[800,168.1],[810,171.8]] },
    { id: 'pet',   tone: 'low',      thai: 'เผ็ด',   rom: 'pèt',    gloss: 'spicy',                  centreHz: 174.7,
      points: [[0,157.4],[10,157.4],[20,157.4],[30,152.4],[40,150.3],[50,146.7],[60,143.8],[70,142.4],[80,141.3],[90,140.1],[100,137.7],[110,137.7],[120,141.8],[130,141.8],[140,141.8],[150,141.9],[160,141.9],[170,142.4],[180,143.5],[190,143.5],[200,140.6],[210,140.3]] },
    { id: 'sip',   tone: 'low',      thai: 'สิบ',    rom: 'sìp',    gloss: 'ten (10)',               centreHz: 265.5,
      points: [[0,235.8],[10,236.1],[20,235.8],[30,235.8],[40,232.5],[50,229.3],[60,226.2],[70,223],[80,219.4],[90,213],[100,209.9],[110,202.4],[120,196.8],[130,196.8],[140,196.8],[150,216.4],[160,217],[170,221],[180,221],[190,221],[200,221],[210,221],[220,220.8],[230,218.9],[240,212.9],[250,212.9],[260,218.9],[270,211.7],[280,211.2],[290,220.8],[300,220.8],[310,216],[320,216],[330,216],[340,216],[350,216],[360,212.8],[370,212.8],[380,222.2],[390,212.8]] },
    { id: 'chuu',  tone: 'falling',  thai: 'ชื่อ',   rom: 'chûu',   gloss: 'name',                   centreHz: 201.8,
      points: [[0,267],[10,272.3],[20,293.3],[30,298.1],[40,303.9],[50,309.1],[60,311],[70,312.2],[80,312.2],[90,312.2],[100,311.9],[110,310.5],[120,308.8],[130,307.6],[140,307.2],[150,306.9],[160,306.5],[170,306.3],[180,306.3],[190,306.3],[200,306.9],[210,307.5],[220,307.5],[230,307.5],[240,307.4],[250,307.2],[260,306.5],[270,305.8],[280,304.8],[290,303.4],[300,301.4],[310,299.2],[320,297.9],[330,297.3],[340,295.9],[350,294.4],[360,292.6],[370,289.9],[380,286.3],[390,280.8],[400,270],[410,257.3],[420,240.9],[430,225.2],[440,209.1],[450,196.2],[460,183.3],[470,171.3],[480,165.2],[490,159.8],[500,153],[510,148.1],[520,144.3],[530,141.6],[540,140.2],[550,135.8],[560,128.6],[570,126.1],[580,126.1],[590,125.8],[600,130.6]] },
    { id: 'chop',  tone: 'falling',  thai: 'ชอบ',    rom: 'chôp',   gloss: 'to like',                centreHz: 220.1,
      points: [[0,248.5],[60,256.2],[70,265.3],[80,270.5],[90,277.9],[100,277.9],[110,277.9],[120,277.6],[130,275.4],[140,273],[150,271.1],[160,269.4],[170,267.8],[180,265.7],[190,264.5],[200,264.5],[210,264.5],[220,265],[230,265.5],[240,265.8],[250,266],[260,267.8],[270,270.7],[280,272.4],[290,273.7],[300,273.7],[310,273.7],[320,273.6],[330,273.6],[340,273.5],[350,273.5],[360,273.5],[370,272.5],[380,271.7],[390,270.8],[400,270.6],[410,269.7],[420,268.6],[430,268.2],[440,267.7],[450,266.7],[460,264.8],[470,263.3],[480,262],[490,260.4],[500,257.4],[510,253.4],[520,248.3],[530,240.7],[540,233.2],[550,224.5],[560,214.4],[570,206.1],[580,195.2],[590,187.4],[600,182.1],[610,178.1],[620,175.2],[630,171.8],[640,170.5],[650,169],[660,168.6],[670,168.6],[680,168.1],[690,168.1],[700,168.1],[710,168],[720,168.3],[730,168]] },
    { id: 'baan',  tone: 'falling',  thai: 'บ้าน',   rom: 'bâan',   gloss: 'house; home',            centreHz: 196.1,
      points: [[0,243.6],[10,244.1],[20,244.6],[30,244.7],[40,246.6],[50,248],[60,248.6],[70,248.8],[80,248.9],[90,250.3],[100,253.2],[110,255.8],[120,259.3],[130,262],[140,263.6],[150,265.2],[160,265.7],[170,265.7],[180,265.7],[190,265.1],[200,263.9],[210,262.5],[220,261.5],[230,260],[240,259.1],[250,257.1],[260,255.8],[270,255.7],[280,255.7],[290,255.8],[300,255.8],[310,256.2],[320,256.3],[330,256.3],[340,256.3],[350,256.2],[360,256.2],[370,256],[380,254.8],[390,251.9],[400,248.1],[410,232.3],[420,232.1],[430,229.9],[440,226.5],[450,222.9],[460,219.5],[470,213.4],[480,206.6],[490,200.6],[500,191.9],[510,185.5],[520,176.5],[530,169.4],[540,161.6],[550,159],[560,157.3],[570,152.3],[580,151.2],[590,144.4],[600,139.6],[610,139.6]] },
    { id: 'haa',   tone: 'falling',  thai: 'ห้า',    rom: 'hâa',    gloss: 'five (5)',               centreHz: 196.1,
      points: [[0,257.5],[10,268.1],[20,268.1],[30,268.5],[40,268.5],[50,269.2],[60,271.7],[70,274.1],[80,275.6],[90,276.4],[100,277.1],[110,278],[120,278.7],[130,279.4],[140,279.5],[150,279.8],[160,279.8],[170,279.8],[180,279.8],[190,279.8],[200,280.6],[210,281.8],[220,282.9],[230,284.4],[240,285.5],[250,285.5],[260,285.5],[270,285.1],[280,284.6],[290,284.3],[300,283.4],[310,283],[320,282.8],[330,281.2],[340,278.5],[350,275.7],[360,272],[370,265.1],[380,260],[390,255],[400,243.8],[410,231.4],[420,220.4],[430,202.1],[440,192.1],[450,185],[470,162.2],[480,158.1],[490,153.8],[500,152.8],[510,149.6],[520,147.9],[530,146.1],[540,145.6],[550,142.8],[560,140.5],[570,130.8],[580,129.7],[590,129.4],[600,129.4],[610,129.4],[620,129.5],[630,129.9],[640,130.6],[650,129.9]] },
    { id: 'rak',   tone: 'high',     thai: 'รัก',    rom: 'rák',    gloss: 'to love',                centreHz: 193.3,
      points: [[0,210.4],[10,203.2],[20,201.9],[30,200.6],[40,200.3],[50,200.6],[60,201],[70,201],[80,202.9],[90,206.8],[100,212.5],[110,224.4],[120,235.9],[130,253.7],[140,263.7],[150,278.3],[160,293.5],[170,302.5],[180,302.5],[190,302.5],[200,298],[210,297.4],[220,297],[230,295.8],[240,295.8],[250,295.8],[260,295.8],[270,295.9],[280,297.1]] },
    { id: 'rot',   tone: 'high',     thai: 'รถ',     rom: 'rót',    gloss: 'car; vehicle',           centreHz: 207.7,
      points: [[0,213.6],[10,213.6],[20,213.6],[40,224.3],[50,224.3],[60,224.3],[70,223.9],[80,223.6],[90,222.8],[100,222.8],[110,222.4],[120,222.4],[130,222.4],[140,222.4],[150,224.9],[160,228],[170,232.9],[180,237.4],[190,241.4],[200,247.3],[210,255.9],[220,261.4],[230,271.1],[240,282.2],[250,291],[260,291],[270,298]] },
    { id: 'maah',  tone: 'high',     thai: 'ม้า',    rom: 'máa',    gloss: 'horse',                  centreHz: 210.8,
      points: [[0,217.6],[10,220.6],[20,221.9],[30,222],[40,223.2],[50,224],[60,225.5],[70,228.2],[80,230.3],[90,231.4],[100,234.2],[110,240.7],[120,242.7],[130,243],[140,243],[150,243],[160,242.3],[170,241.6],[180,241.4],[190,241.4],[200,241.4],[210,241.4],[220,241.4],[230,241.5],[240,241.5],[250,241.5],[260,241.5],[270,242],[280,242.5],[290,242.7],[300,242.7],[310,243],[320,243.5],[330,244.4],[340,245.4],[350,246],[360,246.3],[370,246.6],[380,246.6],[390,246.6],[400,245.9],[410,245.8],[420,245.8],[430,245.8],[440,249.4],[450,251.7],[460,253.8],[470,256.1],[480,259.3],[490,262.1],[500,264.8],[510,268.3],[520,273.1],[530,276.9],[540,280.5],[550,285.6],[560,290.6],[570,294.9],[580,297.6],[590,302.2],[600,306.3],[610,308.9],[620,311.8],[630,314.5]] },
    { id: 'neua',  tone: 'high',     thai: 'เนื้อ',  rom: 'néua',   gloss: 'beef; meat',             centreHz: 204.8,
      points: [[0,219.1],[10,219.1],[20,211.7],[30,211.5],[40,211.5],[50,211.5],[60,213.2],[70,214.9],[80,216.8],[90,219],[100,222.6],[110,227.3],[120,228.1],[130,228.3],[140,228.4],[150,228.6],[160,228.9],[170,229.8],[180,230.2],[190,230.8],[200,231.9],[210,233.2],[220,234.3],[230,235.5],[240,236.7],[250,237.9],[260,238.9],[270,240.1],[280,241.5],[290,243.2],[300,245.1],[310,247.7],[320,251.9],[330,255.2],[340,257.7],[350,259.4],[360,263.4],[370,268.9],[380,272.8],[390,277.5],[400,282.4],[410,286],[420,289.5],[430,291.6],[440,294.4],[450,300.2],[460,305.2],[470,311.5],[480,313.1],[490,314.1]] },
    { id: 'moo',   tone: 'rising',   thai: 'หมู',    rom: 'mŏo',    gloss: 'pork',                   centreHz: 216.9,
      points: [[0,178.5],[10,185.7],[20,178.8],[30,178.8],[40,178.8],[50,178.8],[60,179.5],[70,180.4],[80,180.4],[90,180.4],[100,180.4],[110,180.4],[120,180],[130,179.6],[140,179.6],[150,179.3],[160,178],[170,177.2],[180,176.7],[190,176.6],[200,176.6],[210,176.3],[220,175.9],[230,175.9],[240,175.9],[250,176],[260,176],[270,176],[280,175.6],[290,175.5],[300,174.9],[310,174.6],[320,174.6],[330,174.6],[340,174.8],[350,174.9],[360,175.3],[370,175.5],[380,175.5],[390,175.5],[400,175.5],[410,175.5],[420,175.3],[430,175.3],[440,175.3],[450,175.5],[460,176.1],[470,176.4],[480,176.6],[490,177.3],[500,177.5],[510,177.8],[520,178.2],[530,178.7],[540,179.7],[550,181.1],[560,182.3],[570,182.6],[580,183],[590,183.7],[600,184.3],[610,184.7],[620,184.7],[630,185.9],[640,187.4],[650,188.4],[660,190.2],[670,192],[680,194.8],[690,198],[700,200.1],[710,203.4],[720,208.1],[730,214.1],[740,220.9],[750,225.5],[760,230.4],[770,238],[780,245.6],[790,252.4],[800,261],[810,266],[820,272.6],[830,286.6],[840,293.9],[850,302.1],[860,306.3],[870,312.2],[880,318.2],[890,324.7],[900,326.6],[910,331.8],[920,334.9],[930,336.7],[940,336.7],[950,334.9],[960,330.9],[970,330.4],[980,330.4]] },
    { id: 'chan',  tone: 'rising',   thai: 'ฉัน',    rom: 'chăn',   gloss: 'I; me (female)',         centreHz: 193.3,
      points: [[0,165.3],[10,165.8],[20,167.6],[30,167.6],[40,167.6],[50,165.8],[60,164.4],[70,162],[80,160],[90,158.1],[100,155.7],[110,153.9],[120,153.6],[130,152.7],[140,152.5],[150,152.5],[160,152.5],[170,153.2],[180,154.9],[190,156.6],[200,157.6],[210,157.6],[220,157.6],[230,157.4],[240,156.9],[250,156.9],[260,156.9],[270,157.1],[280,157.7],[290,158.8],[300,160.1],[310,160.8],[320,163.4],[330,167.1],[340,169.9],[350,174],[360,178],[370,181.5],[380,184.5],[390,187.6],[400,192.3],[410,198.1],[420,204.5],[430,210.8],[440,217.2],[450,225.1],[460,231.2],[470,236.7],[480,244.8],[490,250.3],[500,256.9],[510,266.6],[520,277.7],[530,284.2],[540,292.7],[550,305.1],[560,305.4],[570,306],[580,307],[590,307],[600,308.2]] },
    { id: 'maar',  tone: 'rising',   thai: 'หมา',    rom: 'măa',    gloss: 'dog',                    centreHz: 160.2,
      points: [[0,130.5],[10,130.5],[20,130.5],[30,131.6],[40,132.7],[50,133.1],[60,133.9],[70,135.3],[80,135.8],[90,135.8],[100,135.8],[110,135.5],[120,134.9],[130,134.5],[140,134],[150,133.3],[160,132.6],[170,132.4],[180,132.2],[190,132],[200,131.7],[210,131],[220,129.8],[230,129.2],[240,128.8],[250,128.3],[260,128.2],[270,127.8],[280,127.6],[290,127.3],[300,127.1],[310,127.1],[320,127],[330,126.7],[340,126.3],[350,126.2],[360,126.2],[370,126],[380,125.8],[390,125.8],[400,125.8],[410,126.1],[420,126.4],[430,126.7],[440,127.3],[450,127.7],[460,128],[470,128.2],[480,128.3],[490,128.4],[500,128.6],[510,128.9],[520,129.3],[530,129.6],[540,129.9],[550,130.1],[560,130.1],[570,130.4],[580,130.9],[590,131.7],[600,132.7],[610,133.6],[620,134.1],[630,134.8],[640,135.5],[650,136.3],[660,137.3],[670,138.3],[680,139.7],[690,141.5],[700,144.1],[710,146.1],[720,148.6],[730,150.8],[740,163],[750,171.6],[760,177.7],[770,180.5],[780,186],[790,202.8],[800,206.6],[810,209.2],[820,213.4],[830,217.8],[840,225.1],[850,232.9],[860,237.9],[870,240.9],[880,243.9],[890,249.1],[900,256.7],[910,256.7],[920,256.7],[930,255.3],[940,255.3],[950,254.2],[960,256.1]] },
    { id: 'suay',  tone: 'rising',   thai: 'สวย',    rom: 'sŭay',   gloss: 'beautiful',              centreHz: 172.2,
      points: [[0,155],[10,152.8],[20,150.7],[30,147.9],[40,146],[50,143.9],[60,142.9],[70,141.7],[80,141.3],[90,141.1],[100,141.1],[110,141.1],[120,141.3],[130,141.3],[140,141.6],[150,142.2],[160,142.3],[170,142.3],[180,142.3],[190,141.2],[200,140.4],[210,139.6],[220,139.2],[230,138.5],[240,138.1],[250,137.7],[260,137.2],[270,137.1],[280,137.1],[290,137.1],[300,137.6],[310,137.7],[320,137.8],[330,138.1],[340,139.5],[350,140.8],[360,141.6],[370,142.5],[380,144.6],[390,148.4],[400,150.7],[410,152.3],[420,155.9],[430,161.6],[440,168.7],[450,174.7],[460,182.3],[470,190.2],[480,195.6],[490,202],[500,206.9],[510,212],[520,217.6],[530,222.9],[540,230.1],[550,238.7],[560,244.4],[570,249.4],[580,256.3],[590,262],[600,265.9],[610,270],[620,273.3],[630,278.8],[640,283.7],[650,283.7]] },
  ];

  // ---- State ----
  // The audio pipeline now lives in a single shared capture engine (see
  // createToneCapture below), which both the Tone Trainer and the Tone Challenge
  // drive. The trainer keeps only view state here.
  let capture = null;                // the shared ToneCapture instance (lazily built)
  let running = false;               // a capture is live (mirrors capture.isRunning())
  let playing = false;               // playback of the last attempt is in progress
  let starting = false;              // mic acquisition in flight — blocks a double-tap from
                                     // opening two streams while the permission prompt is up

  let selectedTone = 'none';         // 'none' or a tone key — OPTIONAL visual guide overlay
  let points = [];                   // live contour for drawing: {t, hz} or {gap:true}
  let captureCentre = 0;             // fixed semitone reference (Hz) for the whole contour
  let trimmedPoints = null;          // speech-only contour used for the frozen draw + classify
  let detectedTone = null;           // result of classifying the last capture
  let frozen = false;                // a finished capture is on screen
  let refAudio = null;               // <audio> used by the native-example box (lazily built)
  let refPlayingId = null;           // id of the example currently playing, or null
  let refToken = 0;                  // bumped per tap; stale audio events are ignored
  let refWatchdog = null;            // guarantees the buttons are released even if no
                                     // 'ended' or 'error' event ever arrives
  let refRelease = function () {};   // current clip's release callback (see playRefWord)

  // Profile / mode state
  let activeProfile = null;          // the selected profile object (drives the centre)
  let selectedProfileId = null;      // selected in the picker (may differ until Start)
  let mode = 'trainer';              // 'trainer' | 'calibrate' — what the mic loop is doing
  let calWordIdx = 0;                // which calibration WORD we're on (0..N-1)
  let calWordMedians = [];           // per-word median Hz (one entry per finished word)
  let calAllFrames = [];             // all cleaned frames across words (for the 10/90 range)
  let calName = '';                  // name entered for the new profile
  let calRecalId = null;             // when recalibrating, the existing profile id
  let calCancelled = false;          // set when the user backs out mid-word, so the
                                     // engine's onEnd discards that capture
  let calOnDone = null;              // optional callback fired when the cal modal closes,
                                     // used by external callers (e.g. Tone Challenge) so
                                     // they can refresh THEIR own profile picker instead
                                     // of the trainer's. null => trainer-initiated.

  // Debug mode: when on, each capture appends a structured record so detection
  // can be analysed against real voices. Off by default; nothing uploaded.
  let debugOn = false;
  let debugLog = [];                 // array of per-attempt records
  let debugIntended = 'unknown';     // the tone the user says they're attempting

  // DOM (resolved on first enter)
  let elCanvas, elCtx, elHint, elStatus, elMicBtn, elClearBtn, elRefToggle;
  let elWordsBox = null;             // container for the native-example buttons
  let elPlayBtn = null;              // built in JS, so index.html needs no change
  let elSaveBtn = null;              // ditto — exports the attempt as a WAV
  let dpr = 1;
  let built = false;

  function $(id) { return document.getElementById(id); }

  function buildRefToggle() {
    elRefToggle.innerHTML = '';
    // First option: turn the guide off entirely (default).
    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.className = 'tone-ref-opt' + (selectedTone === 'none' ? ' active' : '');
    noneBtn.dataset.tone = 'none';
    noneBtn.innerHTML = 'Off<span class="tone-ref-th">no guide</span>';
    noneBtn.addEventListener('click', () => selectGuide('none'));
    elRefToggle.appendChild(noneBtn);

    TONE_ORDER.forEach(key => {
      const ref = TONE_REFS[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tone-ref-opt' + (key === selectedTone ? ' active' : '');
      btn.dataset.tone = key;
      btn.innerHTML = ref.label + '<span class="tone-ref-th">' + ref.th + '</span>';
      btn.addEventListener('click', () => selectGuide(key));
      elRefToggle.appendChild(btn);
    });
  }

  function selectGuide(key) {
    selectedTone = key;
    elRefToggle.querySelectorAll('.tone-ref-opt').forEach(b =>
      b.classList.toggle('active', b.dataset.tone === key));
    draw(); // re-render overlay immediately
  }

  function resolveDom() {
    elCanvas = $('tone-canvas');
    elCtx = elCanvas.getContext('2d');
    elHint = $('tone-canvas-hint');
    elStatus = $('tone-status');
    elMicBtn = $('tone-mic-btn');
    elClearBtn = $('tone-clear-btn');
    elRefToggle = $('tone-ref-toggle');
    elWordsBox = $('tone-words-box');
  }

  function wireOnce() {
    if (built) return;
    built = true;
    resolveDom();
    buildRefToggle();
    elMicBtn.addEventListener('click', onMicTap);
    buildWordsBox();

    elClearBtn.addEventListener('click', () => clearCapture());

    // ---- Playback button. Created here rather than in the markup so this
    // feature needs no template change. It sits next to Clear, appears only once
    // there is an attempt to play, and holds the audio in memory only: the next
    // recording replaces it and leaving the screen discards it.
    if (elClearBtn && elClearBtn.parentNode && !elPlayBtn) {
      elPlayBtn = document.createElement('button');
      elPlayBtn.type = 'button';
      elPlayBtn.id = 'tone-play-btn';
      elPlayBtn.className = elClearBtn.className;
      elPlayBtn.hidden = true;
      elPlayBtn.innerHTML = '\u25B6\uFE0E Hear it back';
      elClearBtn.parentNode.insertBefore(elPlayBtn, elClearBtn);
      elPlayBtn.addEventListener('click', onPlayTap);
    }

    // ---- Export button. Same pattern and the same visibility rule as the
    // playback button: it can only appear once there is an attempt in memory.
    if (elClearBtn && elClearBtn.parentNode && !elSaveBtn) {
      elSaveBtn = document.createElement('button');
      elSaveBtn.type = 'button';
      elSaveBtn.id = 'tone-save-btn';
      elSaveBtn.className = elClearBtn.className;
      elSaveBtn.hidden = true;
      elSaveBtn.innerHTML = '\u2B07\uFE0E Save attempt';
      elClearBtn.parentNode.insertBefore(elSaveBtn, elClearBtn);
      elSaveBtn.addEventListener('click', onSaveTap);
    }
    window.addEventListener('resize', onResize);

    // Setup screen
    $('tone-start-btn').addEventListener('click', startTrainer);

    // Calibration modal
    const nameInput = $('tone-cal-name');
    nameInput.addEventListener('input', () => {
      $('tone-cal-name-next').disabled = nameInput.value.trim().length === 0;
    });
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && nameInput.value.trim().length > 0) calGotoRecord();
    });
    $('tone-cal-name-next').addEventListener('click', calGotoRecord);
    $('tone-cal-name-cancel').addEventListener('click', () => finishCalModal());
    $('tone-cal-rec-cancel').addEventListener('click', () => { stopCalibration(true); finishCalModal(); });
    $('tone-cal-rec-btn').addEventListener('click', onCalRecordTap);
    $('tone-cal-listen').addEventListener('click', () => {
      try {
        if (window.tts) window.tts.speak(CAL_WORDS[calWordIdx].thai, $('tone-cal-listen'));
      } catch (e) {}
    });
    $('tone-cal-done-ok').addEventListener('click', () => finishCalModal());

    // The calibration word text is set per-word by renderCalWord(), since
    // calibration cycles through CAL_WORDS. Nothing to seed statically here.

    // Tap-to-hear any Thai text in the view (subtitle ฝึกวรรณยุกต์ + practice words).
    const view = $('view-tone');
    if (view && typeof window.wireThaiTapToSpeak === 'function') {
      window.wireThaiTapToSpeak(view, '.th');
    }

    // How-to accordion: restore saved open/closed state, wire toggles that persist.
    wireHowtoAccordion();

    // Debug mode controls.
    wireDebugControls();
  }

  function wireDebugControls() {
    const toggle = $('tone-debug-toggle');
    if (!toggle) return;
    // Hidden by default (SHOW_DEBUG=false): hide the whole section and don't wire
    // anything. Flip SHOW_DEBUG to true to bring the debug tools back unchanged.
    if (!SHOW_DEBUG) {
      const section = toggle.closest('.tone-debug-section');
      if (section) section.hidden = true;
      const panel = $('tone-debug-panel');
      if (panel) panel.hidden = true;
      debugOn = false;
      return;
    }
    toggle.addEventListener('click', () => {
      debugOn = !debugOn;
      toggle.textContent = '🐞 Debug mode: ' + (debugOn ? 'ON' : 'off');
      toggle.classList.toggle('on', debugOn);
      $('tone-debug-panel').hidden = !debugOn;
    });

    // Intended-tone selector (so the log knows what the user was attempting).
    const intendedWrap = $('tone-debug-intended');
    const opts = [['unknown', '—'], ['mid', 'Mid'], ['low', 'Low'],
                  ['falling', 'Falling'], ['high', 'High'], ['rising', 'Rising']];
    debugIntended = 'unknown';
    intendedWrap.innerHTML = '';
    opts.forEach(([key, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tone-ref-opt' + (key === debugIntended ? ' active' : '');
      b.dataset.intended = key;
      b.textContent = label;
      b.addEventListener('click', () => {
        debugIntended = key;
        intendedWrap.querySelectorAll('.tone-ref-opt').forEach(x =>
          x.classList.toggle('active', x.dataset.intended === key));
      });
      intendedWrap.appendChild(b);
    });

    $('tone-debug-copy').addEventListener('click', copyDebugLog);
    $('tone-debug-download').addEventListener('click', downloadDebugLog);
    $('tone-debug-clear').addEventListener('click', () => {
      debugLog = [];
      updateDebugCount();
      setDebugStatus('Log cleared.');
    });
  }

  function updateDebugCount() {
    const el = $('tone-debug-count');
    if (el) el.textContent = debugLog.length + ' attempt' + (debugLog.length === 1 ? '' : 's') + ' logged';
  }
  function setDebugStatus(msg) {
    const el = $('tone-debug-status');
    if (el) { el.textContent = msg; if (msg) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000); }
  }

  // Append a record of the current capture to the debug log.
  function logDebugAttempt(core, result) {
    if (!debugOn || !result) return;
    const m = result.m || {};
    const r1 = (x) => (typeof x === 'number' ? Math.round(x * 100) / 100 : x);
    // The full pitch contour in Hz and in semitones-vs-centre (rounded).
    const hz = core.map(p => Math.round(p.hz));
    const semis = core.map(p => r1(12 * Math.log2(p.hz / m.centreHz)));
    debugLog.push({
      time: new Date().toISOString(),
      profile: activeProfile ? activeProfile.name : '(none)',
      centreHz: r1(m.centreHz),
      intended: debugIntended,
      detected: result.tone,
      correct: (debugIntended !== 'unknown') ? (debugIntended === result.tone) : null,
      confidence: r1(result.confidence),
      features: {
        first: r1(m.first), last: r1(m.last), mean: r1(m.mean),
        net: r1(m.net), minV: r1(m.minV), maxV: r1(m.maxV),
        maxAt: r1(m.maxAt), range: r1(m.range), points: m.n
      },
      hz, semis
    });
    updateDebugCount();
  }

  function buildDebugText() {
    const header = {
      app: 'Thai Tone Trainer debug log',
      exported: new Date().toISOString(),
      attempts: debugLog.length,
      note: 'features in semitones vs centreHz. net=last-first. maxAt=0..1 peak position.'
    };
    return JSON.stringify({ header, log: debugLog }, null, 2);
  }

  async function copyDebugLog() {
    if (!debugLog.length) { setDebugStatus('Nothing to copy yet.'); return; }
    const text = buildDebugText();
    try {
      await navigator.clipboard.writeText(text);
      setDebugStatus('Copied ' + debugLog.length + ' attempts to clipboard.');
    } catch (e) {
      // Fallback for browsers/contexts where clipboard API is blocked.
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setDebugStatus('Copied to clipboard.');
      } catch (e2) {
        setDebugStatus('Copy failed — use Download instead.');
      }
    }
  }

  function downloadDebugLog() {
    if (!debugLog.length) { setDebugStatus('Nothing to download yet.'); return; }
    try {
      const blob = new Blob([buildDebugText()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tone-debug-' + Date.now() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDebugStatus('Downloaded.');
    } catch (e) {
      setDebugStatus('Download failed — try Copy instead.');
    }
  }

  // The Getting Started accordion (How to use / Useful words). Sections default
  // OPEN until the learner has tapped "Tap to speak" at least once (tracked in
  // state.toneTrainerSpoke); after that they default CLOSED. The open/closed
  // state is NOT persisted per-section — only the one-time "spoke" flag drives
  // the default. Within a visit the learner can still freely toggle each header.
  // wireHowtoAccordion() attaches the header listeners once; applyHowtoDefaults()
  // (re)applies the open/closed default and is called on every entry.
  function applyHowtoDefaults() {
    const view = $('view-tone');
    if (!view) return;
    const st = window.state || {};
    // Open until the learner has STARTED a session, then closed from the next
    // visit on. This used to key on toneTrainerSpoke, which is only set by the
    // first tap of the mic — so anyone who pressed Start, looked around and left
    // without recording kept seeing every box expanded for ever. toneTrainerUsed
    // is set by startTrainer() and persisted (it is the same flag that unlocks
    // the Tone Challenge), which is exactly "has started a session".
    // toneTrainerSpoke stays in the test so learners who already have it set do
    // not see the boxes spring open again.
    const open = !(st.toneTrainerUsed || st.toneTrainerSpoke);
    view.querySelectorAll('.tone-howto-section').forEach(section => {
      section.classList.toggle('open', open);
    });
  }

  function wireHowtoAccordion() {
    const view = $('view-tone');
    if (!view) return;
    applyHowtoDefaults();
    view.querySelectorAll('.tone-howto-section').forEach(section => {
      const header = section.querySelector('.howto-header');
      if (header && !header._wired) {
        header._wired = true;
        header.addEventListener('click', () => {
          // Visual toggle for this visit only (not persisted).
          section.classList.toggle('open', !section.classList.contains('open'));
        });
      }
    });
  }

  function setStatus(text, cls) {
    if (!elStatus) return;
    elStatus.textContent = text;
    elStatus.className = 'tone-status' + (cls ? ' ' + cls : '');
  }

  function showHint(show) {
    if (elHint) elHint.classList.toggle('hidden-hint', !show);
  }

  // Size the canvas backing store to its CSS box for crisp HiDPI rendering.
  function sizeCanvas() {
    if (!elCanvas) return;
    const rect = elCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (elCanvas.width !== w || elCanvas.height !== h) {
      elCanvas.width = w;
      elCanvas.height = h;
    }
  }

  function onResize() {
    if (currentlyOnToneView()) { sizeCanvas(); draw(); }
  }
  function currentlyOnToneView() {
    const v = $('view-tone');
    return v && !v.classList.contains('hidden');
  }

  // Read a CSS variable from the themed root so canvas matches light/dark/sepia.
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // If `f` is roughly an octave (or two) away from reference `ref`, fold it back
  // toward ref. This corrects the classic autocorrelation octave error where a
  // frame reads as 2x or 0.5x the true pitch. Returns the corrected frequency.
  function foldOctave(f, ref) {
    if (f <= 0 || ref <= 0) return f;
    let best = f;
    let bestDist = Math.abs(12 * Math.log2(f / ref));
    // Try shifting f by ±1 and ±2 octaves; keep whichever lands closest to ref.
    for (const mult of [0.25, 0.5, 2, 4]) {
      const cand = f * mult;
      const dist = Math.abs(12 * Math.log2(cand / ref));
      if (dist < bestDist) { bestDist = dist; best = cand; }
    }
    // Only accept the fold if the original was genuinely near an octave boundary
    // (i.e. far from ref) and the fold brings it much closer. This avoids nudging
    // legitimate large-but-sub-octave movements.
    const origDist = Math.abs(12 * Math.log2(f / ref));
    if (origDist > 12 - OCTAVE_TOLERANCE && bestDist < OCTAVE_TOLERANCE * 2) {
      return best;
    }
    return f;
  }

  // ---- Capture lifecycle ----
  async function onMicTap() {
    if (starting) return;
    if (running) { stopCapture(); return; }
    // First tap-to-speak ever: flag it so future visits default the how-to
    // accordions to CLOSED. One-time, persisted.
    try {
      if (window.state && !window.state.toneTrainerSpoke) {
        window.state.toneTrainerSpoke = true;
        if (window.saveStorage) window.saveStorage();
      }
    } catch (e) {}
    /* Count this attempt for the private statistics feed.

       Placed AFTER the running check on purpose: the button is a toggle, so a
       tap that stops a capture already in progress is the SAME attempt ending,
       not a new one. Counting here means the number is "attempts started",
       which is what it claims to be.

       Guarded and best-effort, like everything else that touches window.state
       from this module — a failure here must never cost the student their
       recording. */
    try {
      if (window.state) {
        var n = Number(window.state.toneTrainerTaps);
        window.state.toneTrainerTaps = (Number.isFinite(n) && n >= 0 ? n : 0) + 1;
        if (window.saveStorage) window.saveStorage();
      }
    } catch (e) {}
    await startCapture();
  }

  // ---- Wide-screen layout -------------------------------------------------
  // This used to be injected from here as a <style> block keyed on `#screen-tone`
  // and `.tc-game`. That element id does not exist in the markup, so the rule
  // never matched and the in-game trainer stayed 480px wide on every desktop.
  // It could not have worked even with the id corrected: the rule targeted
  // `.menu-section` children of `.tone-trainer`, which is itself capped at 480px,
  // and a block child cannot be wider than its parent. The cap has to be lifted
  // on `.tone-trainer` itself, so the rule now lives in the stylesheet beside the
  // 480px default it overrides, where the two can be read together. Nothing else
  // referenced `.tone-play-wide`.

  // ---- Native reference words ---------------------------------------------
  // A tap plays the recording AND paints its baked contour on the graph through
  // exactly the same draw path a live attempt uses: set the same module state
  // (points / trimmedPoints / captureCentre / frozen / detectedTone) and call
  // draw(). Nothing about capture or the acoustic model is involved, so what a
  // learner sees here cannot drift from what they see after speaking.
  /* Where a reference recording lives. One definition, used both by playback and
     by the service-worker warm-up list below, so the two cannot disagree. */
  const REF_AUDIO_DIR = './audio/tone-words/';
  function refAudioUrl(w) { return REF_AUDIO_DIR + w.id + '.mp3'; }

  /* Hand the whole list to index.html's mediaAudioManifest(), which posts it to
     the service worker a few seconds after launch so these download quietly in
     the background instead of on first tap. Exposed rather than hard-coded over
     there because TONE_WORDS is the only place the set of words is defined. */
  window.toneWordAudioFiles = function () {
    try { return TONE_WORDS.map(refAudioUrl); } catch (e) { return []; }
  };

  function buildWordsBox() {
    if (!elWordsBox) return;
    elWordsBox.innerHTML = '';
    TONE_ORDER.forEach(function (key) {
      var words = TONE_WORDS.filter(function (w) { return w.tone === key; });
      if (!words.length) return;
      var ref = TONE_REFS[key];

      var group = document.createElement('div');
      group.className = 'tone-ex-group';

      var head = document.createElement('div');
      head.className = 'tone-ex-tone';
      head.textContent = ref.label + ' tone (' + ref.th + ')';
      group.appendChild(head);

      var desc = document.createElement('p');
      desc.className = 'tone-ex-desc';
      desc.textContent = TONE_WORD_INFO[key] || '';
      group.appendChild(desc);

      var row = document.createElement('div');
      row.className = 'tone-ex-row';
      words.forEach(function (w) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tone-ex-btn';
        btn.dataset.wordId = w.id;
        // NOTE: deliberately NOT class "th" — wireThaiTapToSpeak() delegates on
        // this whole view for ".th" and would fire TTS on top of the recording.
        btn.innerHTML =
          '<span class="tone-ex-thai"></span>' +
          '<span class="tone-ex-rom"></span>' +
          '<span class="tone-ex-gloss"></span>';
        btn.querySelector('.tone-ex-thai').textContent = w.thai;
        btn.querySelector('.tone-ex-rom').textContent = w.rom;
        btn.querySelector('.tone-ex-gloss').textContent = w.gloss;
        btn.setAttribute('aria-label', 'Play ' + w.rom + ', ' + w.gloss);
        btn.addEventListener('click', function () { playRefWord(w.id); });
        row.appendChild(btn);
      });
      group.appendChild(row);
      elWordsBox.appendChild(group);
    });
  }

  /* The example buttons sit ABOVE the graph, so on a phone the contour we just
     drew can be off-screen when a word is tapped. Scroll it into view — but only
     when it is actually out of view, because scrolling a graph the learner can
     already see is just the page jumping under their thumb. "In view" means the
     whole canvas box, not a sliver of it. */
  function revealGraph() {
    const wrap = elCanvas && elCanvas.closest ? elCanvas.closest('.tone-canvas-wrap') : null;
    if (!wrap || typeof wrap.getBoundingClientRect !== 'function') return;
    const r = wrap.getBoundingClientRect();
    if (!r.height) return;                       // not laid out yet — nothing to show
    // #view-tone is its own scroll container (startTrainer resets its scrollTop),
    // so when it is the thing that scrolls, ITS box is the viewport — not the
    // window's.
    let top = 0;
    let bottom = window.innerHeight || document.documentElement.clientHeight || 0;
    const view = elCanvas.closest ? elCanvas.closest('#view-tone') : null;
    if (view && view.scrollHeight > view.clientHeight + 1) {
      const vr = view.getBoundingClientRect();
      if (vr.height) { top = vr.top; bottom = vr.bottom; }
    }
    if (!bottom) return;
    if (r.top >= top && r.bottom <= bottom) return;   // already fully visible
    try {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      // Older engines reject the options object; the boolean form is fine.
      try { wrap.scrollIntoView(false); } catch (e2) {}
    }
  }

  // Grey out everything that could interfere while an example is playing, and
  // mark the button that is playing. Called with `false` from every exit path.
  function setRefBusy(on, id) {
    refPlayingId = on ? id : null;
    if (elMicBtn) {
      elMicBtn.disabled = on;
      elMicBtn.classList.toggle('is-disabled', on);
    }
    [elClearBtn, elPlayBtn, elSaveBtn].forEach(function (b) {
      if (b) { b.disabled = on; b.classList.toggle('is-disabled', on); }
    });
    if (elWordsBox) {
      elWordsBox.querySelectorAll('.tone-ex-btn').forEach(function (b) {
        b.disabled = on;
        b.classList.toggle('is-disabled', on);
        b.classList.toggle('playing', on && b.dataset.wordId === id);
      });
    }
  }

  /* Stop any example that is playing and release the buttons. Safe to call at
     any time, including when nothing is playing — every reset path calls it.
     Bumping refToken first means any event still queued from the clip we are
     stopping is ignored, so it cannot release a clip started straight after. */
  function stopRefPlayback() {
    refToken++;
    if (refWatchdog) { clearTimeout(refWatchdog); refWatchdog = null; }
    if (refAudio) {
      try { refAudio.pause(); refAudio.currentTime = 0; } catch (e) {}
    }
    setRefBusy(false, null);
  }

  function playRefWord(id) {
    // A live recording always wins; never interrupt the mic.
    if (running || starting) return;
    var w = null;
    for (var i = 0; i < TONE_WORDS.length; i++) {
      if (TONE_WORDS[i].id === id) { w = TONE_WORDS[i]; break; }
    }
    if (!w) return;

    // A second tap on the word that is playing stops it.
    if (refPlayingId === id) { stopRefPlayback(); return; }
    stopRefPlayback();

    // The learner's own attempt (and its audio) goes away, exactly as it would
    // if they had started a new recording.
    try { if (capture) capture.stopPlayback(); } catch (e) {}
    setPlayState(false);
    if (elPlayBtn) elPlayBtn.hidden = true;
    if (elSaveBtn) elSaveBtn.hidden = true;

    // Turn the guide overlay off so the graph shows the word's shape and
    // nothing else.
    if (selectedTone !== 'none') selectGuide('none');

    // Paint the baked contour.
    var core = w.points.map(function (p) { return { t: p[0], hz: p[1] }; });
    points = core;
    trimmedPoints = core;
    captureCentre = w.centreHz;
    // Classify with the REAL model rather than trusting a stored label, so the
    // readout can never disagree with the engine. reftest.mjs asserts offline
    // that all of these still come back correct and "Clear".
    detectedTone = classifyTone(core, w.centreHz);
    frozen = true;
    showHint(false);
    if (elClearBtn) elClearBtn.hidden = false;
    sizeCanvas();
    draw();
    reportDetection();
    revealGraph();

    // Play the recording. The graph is already correct, so a missing or
    // unplayable file costs the audio and nothing else.
    var token = ++refToken;
    // `release` is the ONLY way the buttons come back, and it is a no-op for a
    // clip that has already been superseded.
    var release = function () {
      if (token !== refToken) return;
      if (refWatchdog) { clearTimeout(refWatchdog); refWatchdog = null; }
      setRefBusy(false, null);
    };
    // The listeners below are attached once to a reused <audio>, so they must
    // reach the CURRENT release, not the one from whichever tap created them.
    refRelease = release;
    if (!refAudio) {
      refAudio = new Audio();
      refAudio.preload = 'none';
      refAudio.addEventListener('ended', function () { refRelease(); });
      refAudio.addEventListener('error', function () { refRelease(); });
    }
    setRefBusy(true, id);
    // Longest example is about 1.5 s. If neither 'ended' nor 'error' ever
    // arrives — a stalled decode, a file the browser silently refuses — this
    // still hands the buttons back rather than leaving the screen unusable.
    refWatchdog = setTimeout(release, 6000);
    try {
      refAudio.src = refAudioUrl(w);
      var pr = refAudio.play();
      if (pr && typeof pr.catch === 'function') {
        pr.catch(function () { release(); });
      }
    } catch (e) {
      release();
    }
  }

  // The single shared capture engine instance, built on first use.
  function getCapture() {
    if (!capture) capture = createToneCapture();
    return capture;
  }

  async function startCapture() {
    clearCapture(true); // reset data but keep frozen flag handling internal
    mode = 'trainer';
    starting = true;
    try {
      sizeCanvas();
      showHint(false);
      elClearBtn.hidden = true;
      if (elPlayBtn) elPlayBtn.hidden = true;
      if (elSaveBtn) elSaveBtn.hidden = true;
      elMicBtn.classList.add('recording');
      elMicBtn.querySelector('.tone-mic-label').textContent = 'Tap to stop';
      setStatus('Listening…', 'recording');

      await getCapture().start({
        // Knowing the speaker's register lets the pitch tracker resolve octave
        // errors from the very first frame, instead of waiting for three
        // accepted frames to build a reference (which could themselves be wrong).
        centreHint: (activeProfile && activeProfile.centerHz > 0) ? activeProfile.centerHz : 0,
        onFrame: onLiveFrame,
        onEnd: onCaptureEnd
      });
      running = true;
    } catch (err) {
      handleMicError(err);
    } finally {
      starting = false;
    }
  }

  // Live frame callback: repaint the in-progress contour and update the status.
  function onLiveFrame(info) {
    points = info.livePoints;
    setStatus(info.inSpeech ? 'Listening… (speaking)' : 'Listening…', 'recording');
    draw();
  }

  // The capture finished (word ended, manual stop, or timeout). Everything the
  // engine heard is in `frames`; segmentation and cleaning happen here, offline,
  // with the whole recording available.
  function onCaptureEnd(result) {
    running = false;
    elMicBtn.classList.remove('recording');
    elMicBtn.querySelector('.tone-mic-label').textContent = 'Tap to speak';

    // Pass the calibrated centre. Without it the octave resolver falls back to
    // the median of the contour it is analysing — which, for a falling or rising
    // tone, sits in the MIDDLE of a large excursion, so the plausibility band
    // then excludes the genuine peak or trough and the resolver picks the
    // half/double candidate instead. That produced the spurious spike at the end
    // of falling words and the spurious drop at the end of rising ones.
    const core = extractContour(result.frames, result.thresholdRms,
                                (activeProfile && activeProfile.centerHz > 0) ? activeProfile.centerHz : 0);
    if (core) {
      trimmedPoints = core;
      points = core;
      // Centre on the speaker's calibrated mid-level so tones land at true height.
      captureCentre = (activeProfile && activeProfile.centerHz > 0)
        ? activeProfile.centerHz
        : median(core.map(p => p.hz));
      detectedTone = classifyTone(core, captureCentre);
      frozen = true;
      elClearBtn.hidden = false;
      reportDetection();
      logDebugAttempt(core, detectedTone);
    } else {
      trimmedPoints = null;
      detectedTone = null;
      setStatus('Didn\u2019t catch clear speech. Try again, a little louder.', '');
      showHint(true);
    }
    // Offer playback whenever we captured audio — hearing a rejected attempt
    // back is often exactly what tells the learner what went wrong.
    setPlayState(false);
    if (elPlayBtn) elPlayBtn.hidden = !result.hasAudio;
    if (elSaveBtn) elSaveBtn.hidden = !result.hasAudio;
    draw();
  }

  function stopCapture() {
    if (!running) return;
    getCapture().stop('manual');
  }

  // Play the learner's own attempt back to them. Tapping again while it plays
  // stops it, so a mistaken tap is never stuck waiting.
  function onPlayTap() {
    const cap = getCapture();
    if (!cap || running) return;
    if (playing) { cap.stopPlayback(); setPlayState(false); return; }
    const a = playbackRange();
    if (cap.playLast(a.from, a.to)) setPlayState(true);
  }

  /* Export the attempt exactly as the engine received it. The filename carries
     the context a diagnosis needs and the app cannot recover later: which mode,
     the profile centre the attempt was scored against, and what the app decided
     it heard. Time suffix so repeated attempts do not collide in a share sheet. */
  function attemptFileName() {
    const dsp = window.toneDsp;
    const hz = (activeProfile && activeProfile.centerHz > 0)
      ? Math.round(activeProfile.centerHz) : 0;
    const heard = (detectedTone && detectedTone.tone) ? detectedTone.tone : 'none';
    const d = new Date();
    const hhmm = String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
    const clean = (dsp && dsp.safeName) ? dsp.safeName : (x) => String(x);
    return 'tone_trainer_' + hz + '_' + clean(heard) + '_' + hhmm + '.wav';
  }

  function onSaveTap() {
    const cap = getCapture();
    if (!cap || running || !cap.hasAudio() || !cap.exportLast) return;
    const btn = elSaveBtn;
    if (btn) { btn.disabled = true; btn.innerHTML = '\u2B07\uFE0E Saving\u2026'; }
    Promise.resolve(cap.exportLast(attemptFileName())).then(function (ok) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = ok ? '\u2713\uFE0E Saved' : '\u2B07\uFE0E Save attempt';
        if (ok) setTimeout(function () {
          if (elSaveBtn) elSaveBtn.innerHTML = '\u2B07\uFE0E Save attempt';
        }, 2000);
      }
    });
  }

  function setPlayState(on) {
    playing = on;
    if (elPlayBtn) elPlayBtn.innerHTML = on ? '\u25A0\uFE0E Stop' : '\u25B6\uFE0E Hear it back';
  }

  // The speech span we actually analysed, so playback skips the surrounding room tone.
  function playbackRange() {
    if (trimmedPoints && trimmedPoints.length >= 2) {
      return { from: trimmedPoints[0].t, to: trimmedPoints[trimmedPoints.length - 1].t };
    }
    return { from: -1, to: -1 };
  }

  function handleMicError(err) {
    running = false;
    elMicBtn.classList.remove('recording');
    elMicBtn.querySelector('.tone-mic-label').textContent = 'Tap to speak';
    let msg = 'Could not access the microphone.';
    if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
      msg = 'Microphone permission was blocked. Enable it in your browser settings.';
    } else if (err && err.name === 'NotFoundError') {
      msg = 'No microphone was found on this device.';
    }
    setStatus(msg, 'error');
    showHint(points.length === 0);
    try { getCapture().release(); } catch (e) {}
  }

  // =========================================================
  //  PITCH TRACKING (band-constrained MPM + octave path)
  //  -------------------------------------------------------
  //  The library's PitchDetector commits to a single NSDF peak per frame using
  //  the MPM `k` rule, with no frequency constraint and no memory. On low male
  //  voices that repeatedly picks a subharmonic, and on creaky word-final tails
  //  it halves. Those errors persist across many frames, so no per-frame
  //  velocity or de-spike rule can remove them.
  //
  //  Instead we compute the NSDF ourselves (via the library's exported
  //  Autocorrelator, so there is no new dependency), constrain the period search
  //  to a band around the speaker's calibrated centre, and keep every plausible
  //  peak as a candidate. extractContour() then chooses the best PATH through
  //  those candidates for the whole word.
  // =========================================================
  // Self-contained radix-2 FFT, so this module depends only on PitchDetector
  // from the bundled pitchy.js (exactly as before) and cannot break if that
  // build does not happen to export its Autocorrelator.
  function fft(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (inverse ? 2 : -2) * Math.PI / len;
      const wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < (len >> 1); k++) {
          const ar = re[i + k], ai = im[i + k];
          const br = re[i + k + (len >> 1)], bi = im[i + k + (len >> 1)];
          const tr = br * cr - bi * ci, ti = br * ci + bi * cr;
          re[i + k] = ar + tr; im[i + k] = ai + ti;
          re[i + k + (len >> 1)] = ar - tr; im[i + k + (len >> 1)] = ai - ti;
          const ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }

  // Autocorrelation by Wiener-Khinchin, zero-padded to avoid circular wrap.
  function autocorrelate(T, x) {
    const n = T.winLen, N = T.fftLen, re = T.re, im = T.im;
    re.fill(0); im.fill(0);
    for (let i = 0; i < n; i++) re[i] = x[i];
    fft(re, im, false);
    for (let i = 0; i < N; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; }
    fft(re, im, true);
    for (let tau = 0; tau < n; tau++) T.r[tau] = re[tau];
  }

  // Window length and search band for a given speaker. Kept as ONE function,
  // exported on toneDsp, so the offline test harness cannot drift out of step
  // with what the app actually does — a divergence of exactly this kind
  // (harness passing the calibrated centre where the app did not) is what let
  // the octave regression reach a release.
  //
  //   • Window holds ~ANALYSIS_PERIODS cycles of THIS voice. One fixed size
  //     cannot serve both: 23ms is 5 periods of a 220Hz woman but 2.3 of a
  //     100Hz man, and MPM on 2.3 periods locks onto subharmonics.
  //   • Constraining the period SEARCH is what removes harmonic errors, rather
  //     than trying to repair them afterwards.
  function analysisPlanFor(centreHz, sampleRate) {
    const hintHz = centreHz > 0 ? centreHz : 170;
    const want = ANALYSIS_PERIODS * sampleRate / hintHz;
    const winLen = want <= 1024 ? 1024 : (want <= 2048 ? 2048 : 4096);
    let minHz = F0_MIN, maxHz = F0_MAX;
    if (centreHz > 0) {
      minHz = Math.max(F0_MIN, centreHz * Math.pow(2, SEARCH_LO / 12));
      maxHz = Math.min(F0_MAX, centreHz * Math.pow(2, SEARCH_HI / 12));
    }
    return { winLen, minHz, maxHz };
  }

  function makeTracker(winLen) {
    const fftLen = 2 * winLen;
    return {
      winLen: winLen,
      fftLen: fftLen,
      re: new Float64Array(fftLen),
      im: new Float64Array(fftLen),
      r: new Float32Array(winLen),
      nsdf: new Float32Array(winLen)
    };
  }

  // McLeod's normalised square difference function.
  function computeNSDF(T, x) {
    const n = T.winLen, r = T.r, nsdf = T.nsdf;
    autocorrelate(T, x);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += x[i] * x[i];
    let m = 2 * sum;
    nsdf[0] = m > 0 ? 1 : 0;
    for (let tau = 1; tau < n; tau++) {
      m -= x[tau - 1] * x[tau - 1] + x[n - tau] * x[n - tau];
      nsdf[tau] = m > 1e-12 ? (2 * r[tau]) / m : 0;
    }
    return nsdf;
  }

  // Every NSDF local maximum whose period lies inside the search band.
  function nsdfCandidates(T, x, sr, minHz, maxHz, minVal) {
    const nsdf = computeNSDF(T, x);
    const n = T.winLen;
    const tauMin = Math.max(2, Math.floor(sr / maxHz));
    const tauMax = Math.min(n - 2, Math.ceil(sr / minHz));
    const out = [];
    for (let tau = tauMin + 1; tau < tauMax; tau++) {
      if (nsdf[tau] > nsdf[tau - 1] && nsdf[tau] >= nsdf[tau + 1] && nsdf[tau] >= minVal) {
        const a = nsdf[tau - 1], b = nsdf[tau], c = nsdf[tau + 1];
        const den = a - 2 * b + c;
        const shift = den !== 0 ? 0.5 * (a - c) / den : 0;
        const period = tau + Math.max(-1, Math.min(1, shift));
        out.push({ hz: sr / period, v: Math.max(0, Math.min(1, b)) });
      }
    }
    out.sort((p, q) => q.v - p.v);
    const top = out.slice(0, 6);

    // Mark subharmonics. If another candidate sits at roughly TWICE this
    // candidate's frequency and is comparably strong, then this candidate is
    // very likely that one's octave-down twin (the nsdf peak at 2T is nearly as
    // tall as the peak at T for any periodic signal). Note the asymmetry: the
    // true F0 has no comparably strong peak at 2x ITS frequency, so it is not
    // penalised. This is MPM's "shortest near-maximal period" rule, restated so
    // the path search can weigh it alongside continuity.
    for (const c of top) {
      c.sub = 0;
      for (const d of top) {
        if (d === c) continue;
        if (Math.abs(12 * Math.log2(d.hz / (2 * c.hz))) < 1.2 && d.v >= SUBHARM_RATIO * c.v) {
          c.sub = Math.max(c.sub, Math.min(1, d.v / Math.max(1e-6, c.v)));
        }
      }
    }
    return top;
  }

  // Choose the octave path across a whole word (Viterbi). Emission cost favours
  // strong NSDF peaks inside the band; transition cost favours a smooth contour.
  function resolveOctavePath(frames, centreHz) {
    const semi = hz => 12 * Math.log2(hz / centreHz);
    const nodes = frames.map(f => {
      if (!f.cands || !f.cands.length) return [];
      return f.cands.map(c => {
        const sv = semi(c.hz);
        const outside = sv < SEARCH_LO ? (SEARCH_LO - sv) : (sv > SEARCH_HI ? (sv - SEARCH_HI) : 0);
        return { hz: c.hz, s: sv,
                 emit: OCT_W_NSDF * (1 - c.v) + OCT_W_BAND * outside + OCT_W_SUBHARM * (c.sub || 0) };
      });
    });
    const idx = [];
    for (let i = 0; i < nodes.length; i++) if (nodes[i].length) idx.push(i);
    if (idx.length < 2) return frames;

    let prev = nodes[idx[0]].map(nd => nd.emit);
    const back = [];
    for (let j = 1; j < idx.length; j++) {
      const cur = nodes[idx[j]], pn = nodes[idx[j - 1]];
      const dt = frames[idx[j]].t - frames[idx[j - 1]].t;
      const loosen = Math.min(6, Math.max(1, dt / HOP_MS));
      const cost = new Array(cur.length).fill(Infinity);
      const bp = new Array(cur.length).fill(0);
      for (let a = 0; a < cur.length; a++) {
        for (let b = 0; b < pn.length; b++) {
          const c = prev[b] + OCT_W_JUMP * (Math.abs(cur[a].s - pn[b].s) / loosen) + cur[a].emit;
          if (c < cost[a]) { cost[a] = c; bp[a] = b; }
        }
      }
      back.push(bp); prev = cost;
    }
    let best = 0;
    for (let a = 1; a < prev.length; a++) if (prev[a] < prev[best]) best = a;
    const pick = new Array(idx.length);
    pick[idx.length - 1] = best;
    for (let j = idx.length - 2; j >= 0; j--) pick[j] = back[j][pick[j + 1]];

    const out = frames.map(f => ({ t: f.t, hz: f.hz, hzD: f.hzD, rms: f.rms, cands: f.cands }));
    for (let j = 0; j < idx.length; j++) out[idx[j]].hz = nodes[idx[j]][pick[j]].hz;
    return octaveSnap(out);
  }

  // Final safety net: a couple of frames can still come out an octave adrift when
  // the correct candidate was too weak to survive the NSDF cut, so the path had
  // nothing right to choose. Compare each frame with the median of its
  // neighbours and, if doubling or halving brings it closer, snap it. Only exact
  // octaves are considered, so this can never invent a contour shape.
  function octaveSnap(pts) {
    const n = pts.length;
    if (n < 5) return pts;
    const hz = pts.map(p => p.hz);
    for (let i = OCTAVE_SNAP_EDGE; i < n - OCTAVE_SNAP_EDGE; i++) {
      if (!hz[i]) continue;
      const lo = Math.max(0, i - 5), hi = Math.min(n - 1, i + 5);
      const near = [];
      for (let j = lo; j <= hi; j++) if (j !== i && hz[j] > 0) near.push(hz[j]);
      if (near.length < 3) continue;
      const ref = median(near);
      const d0 = Math.abs(12 * Math.log2(hz[i] / ref));
      // Only act on deviations that actually LOOK like an octave. A genuine fast
      // glide deviates from its neighbourhood too, and must be left alone.
      if (d0 < OCTAVE_SNAP_ST || d0 > OCTAVE_SNAP_MAX) continue;
      let bestHz = hz[i], bestD = d0;
      for (const mult of [0.5, 2]) {
        const cand = hz[i] * mult;
        if (cand < F0_MIN || cand > F0_MAX) continue;
        const d = Math.abs(12 * Math.log2(cand / ref));
        if (d < bestD - 1.5) { bestD = d; bestHz = cand; }
      }
      if (bestHz !== hz[i]) pts[i].hz = bestHz;
    }
    return pts;
  }

  // =========================================================
  //  SHARED CAPTURE ENGINE
  //  -------------------------------------------------------
  //  One engine, driven by both the Tone Trainer and the Tone Challenge, so a
  //  capture fix can never again land in one mode and not the other.
  //
  //  Design: raw PCM is buffered continuously off the audio thread; a pump
  //  (driven by rAF, purely for convenience) drains that buffer and analyses it
  //  at a FIXED HOP_MS hop. The pump processes every pending hop each time it
  //  runs, so the contour's resolution is identical whether rAF fires at 120Hz,
  //  60Hz or 20Hz — it only changes how many hops are handled per tick.
  //
  //  Live VAD exists only to decide WHEN to stop. The contour that gets scored
  //  is segmented afterwards by extractContour(), with the whole recording in
  //  hand — so a word spoken during the noise-measurement window, or after a
  //  false start, is still recovered rather than thrown away.
  // =========================================================
  function createToneCapture() {
    let ctx = null, stream = null, srcNode = null, tapNode = null, sinkNode = null;
    let sampleRate = 44100;
    let tracker = null, winLen = 2048, bufWin = null;
    let searchMinHz = F0_MIN, searchMaxHz = F0_MAX;
    let lastHz = 0;
    let lastAudio = null;      // raw PCM of the most recent capture, for playback
    let playSrc = null;
    let pcm = null;                  // rolling raw-audio buffer for this capture
    let writePos = 0;                // samples written by the audio thread
    let centrePos = 0;               // sample index of the next analysis window centre
    let hopSamples = 441;
    let frames = [];                 // every analysed frame: {t, hz, hzD, rms, clarity}
    let livePoints = [];             // voiced points since onset, for live drawing
    let P = resolveVadPolicy(null);  // resolved VAD policy for the current capture
    let segments = [];               // finalized speech segments (multiSegment mode)
    let recentHz = [];               // recently accepted F0, the octave-fold reference
    let isRunning = false;
    let stopping = false;            // set during stop()'s final drain (re-entrancy guard)
    let rafId = null;
    let opts = {};

    // Live VAD state
    let floorSamples = [], provFloor = 0, provThresh = 0;
    let inSpeech = false, onsetRunMs = 0, lastLoudT = 0, segStartT = 0;
    let confirmedSpeech = false;

    // ---- Audio graph ----------------------------------------------------
    // The tap is an AudioWorklet where available (runs on the audio thread, so a
    // busy main thread delays delivery but never drops samples). ScriptProcessor
    // is the fallback for older Safari. Both feed the same ring buffer.
    const WORKLET_SRC =
      'class ToneTap extends AudioWorkletProcessor{' +
      'constructor(){super();this.b=new Float32Array(1024);this.n=0;}' +
      'process(inputs){const ch=inputs[0]&&inputs[0][0];' +
      'if(ch){for(let i=0;i<ch.length;i++){this.b[this.n++]=ch[i];' +
      'if(this.n===this.b.length){this.port.postMessage(this.b.slice(0));this.n=0;}}}' +
      'return true;}}' +
      'registerProcessor("tone-tap",ToneTap);';
    let workletUrl = null;
    let workletReady = false;

    async function ensureWorklet() {
      if (workletReady || !ctx.audioWorklet) return workletReady;
      try {
        if (!workletUrl) {
          workletUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
        }
        await ctx.audioWorklet.addModule(workletUrl);
        workletReady = true;
      } catch (e) {
        workletReady = false;
      }
      return workletReady;
    }

    function pushSamples(chunk) {
      if (!pcm) return;
      const room = pcm.length - writePos;
      if (room <= 0) return;
      const n = Math.min(room, chunk.length);
      pcm.set(n === chunk.length ? chunk : chunk.subarray(0, n), writePos);
      writePos += n;
    }

    async function openMic() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) {} }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false
      });
      sampleRate = ctx.sampleRate || 44100;
      hopSamples = Math.max(1, Math.round(sampleRate * HOP_MS / 1000));
      srcNode = ctx.createMediaStreamSource(stream);

      const useWorklet = await ensureWorklet();
      if (useWorklet) {
        tapNode = new AudioWorkletNode(ctx, 'tone-tap');
        tapNode.port.onmessage = (ev) => { if (isRunning) pushSamples(ev.data); };
        srcNode.connect(tapNode);
      } else {
        tapNode = ctx.createScriptProcessor(1024, 1, 1);
        tapNode.onaudioprocess = (ev) => {
          if (isRunning) pushSamples(ev.inputBuffer.getChannelData(0));
        };
        srcNode.connect(tapNode);
        // A ScriptProcessor only fires while connected onward; route it into a
        // silent gain node so nothing is audible.
        sinkNode = ctx.createGain();
        sinkNode.gain.value = 0;
        tapNode.connect(sinkNode);
        sinkNode.connect(ctx.destination);
      }

      const plan = analysisPlanFor(opts.centreHint, sampleRate);
      winLen = plan.winLen;
      searchMinHz = plan.minHz;
      searchMaxHz = plan.maxHz;
      if (!tracker || tracker.winLen !== winLen) tracker = makeTracker(winLen);
      if (!bufWin || bufWin.length !== winLen) bufWin = new Float32Array(winLen);

      // Sized from the RESOLVED cap, not the constant, so a sentence-length
      // capture is not silently truncated by an 8-second buffer. Grows on
      // demand and is reused, so switching modes costs at most one allocation.
      const cap = Math.ceil(sampleRate * (P.maxCaptureMs + 500) / 1000);
      if (!pcm || pcm.length < cap) pcm = new Float32Array(cap);
    }

    function closeMic() {
      try { if (tapNode && tapNode.port) tapNode.port.onmessage = null; } catch (e) {}
      try { if (tapNode) tapNode.onaudioprocess = null; } catch (e) {}
      try { if (srcNode) srcNode.disconnect(); } catch (e) {}
      try { if (tapNode) tapNode.disconnect(); } catch (e) {}
      try { if (sinkNode) sinkNode.disconnect(); } catch (e) {}
      srcNode = null; tapNode = null; sinkNode = null;
      if (stream) {
        stream.getTracks().forEach(tr => { try { tr.stop(); } catch (e) {} });
        stream = null;
      }
      // Keep the AudioContext alive (cheap) for a fast restart; suspend when idle.
      if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} }
    }

    // ---- Per-frame analysis ---------------------------------------------
    // We compute the NSDF ourselves and keep EVERY plausible peak as a
    // candidate, rather than letting the library commit to one peak per frame
    // with no memory. Live capture picks greedily (enough to drive the VAD);
    // extractContour() later re-solves the octave choice across the whole word.
    function analyseAt(centre) {
      const half = winLen >> 1;
      bufWin.set(pcm.subarray(centre - half, centre + half));

      let sumSq = 0;
      for (let i = 0; i < winLen; i++) sumSq += bufWin[i] * bufWin[i];
      const rms = Math.sqrt(sumSq / winLen);

      const cands = nsdfCandidates(tracker, bufWin, sampleRate, searchMinHz, searchMaxHz, NSDF_MIN);

      // Greedy live pick: strongest candidate, preferring continuity with the
      // last accepted frame so the live trace doesn't flicker between octaves.
      let hz = 0, best = -Infinity;
      const ref = lastHz > 0 ? lastHz : (opts.centreHint > 0 ? opts.centreHint : 0);
      for (const c of cands) {
        let sc = c.v - OCT_W_SUBHARM * 0.5 * (c.sub || 0);
        if (ref > 0) sc -= 0.06 * Math.abs(12 * Math.log2(c.hz / ref));
        if (sc > best) { best = sc; hz = c.hz; }
      }
      const strong = cands.length && Math.max(...cands.map(c => c.v)) >= CLARITY_MIN;
      if (!strong || hz < F0_MIN || hz > F0_MAX) hz = 0;
      if (hz > 0) lastHz = hz;

      return { t: (centre / sampleRate) * 1000, hz, hzD: hz, rms, cands };
    }

    // Drain every hop of audio that has arrived since the last pump. `maxFrames`
    // bounds a single drain: normally there are only a couple of hops pending,
    // but if the tab was backgrounded (rAF paused while audio kept arriving) the
    // backlog can be seconds long, and stop()'s final drain must not run past the
    // end of the word into all of it.
    function pump(maxFrames) {
      if (!isRunning) return 0;
      const cap = maxFrames || 400;
      const halfW = WIN_WIDE >> 1;
      let produced = 0;
      while (centrePos + halfW <= writePos && centrePos - halfW >= 0) {
        const f = analyseAt(centrePos);
        frames.push(f);
        // One-frame-lagged centred median of 3, for display only. The contour
        // that gets SCORED is smoothed offline in extractContour().
        const n = frames.length;
        if (n >= 3) {
          const a = frames[n - 3].hz, b = frames[n - 2].hz, c = frames[n - 1].hz;
          if (a > 0 && b > 0 && c > 0) frames[n - 2].hzD = median([a, b, c]);
        }
        updateLiveVad(f);
        centrePos += hopSamples;
        produced++;
        if (produced >= cap) break;   // the rest waits for the next tick
      }
      return produced;
    }

    // ---- Live VAD (auto-stop only) --------------------------------------
    function updateLiveVad(f) {
      // Provisional floor from the opening window. Capped at MAX_FLOOR_RMS so a
      // speaker who taps and talks immediately can't set the floor to their own
      // voice level and lock themselves out for the rest of the capture.
      if (provFloor === 0) {
        floorSamples.push(f.rms);
        if (f.t < NOISE_SAMPLE_MS) return;
        provFloor = clampFloor(percentile(floorSamples, 0.20));
        provThresh = provFloor * Math.pow(10, ENERGY_MARGIN_DB / 20);
        return;
      }
      // Between words, let the floor track a quieter room — but only DOWNWARD,
      // so speech can never raise it.
      if (!inSpeech && f.hz === 0) {
        floorSamples.push(f.rms);
        if (floorSamples.length > 120) floorSamples.shift();
        const cand = clampFloor(percentile(floorSamples, 0.20));
        if (cand < provFloor) {
          provFloor = cand;
          provThresh = provFloor * Math.pow(10, ENERGY_MARGIN_DB / 20);
        }
      }

      const loud = f.rms >= provThresh;
      const voiced = loud && f.hz > 0;
      if (loud) lastLoudT = f.t;

      if (!inSpeech) {
        if (voiced) {
          if (onsetRunMs === 0) segStartT = f.t;
          onsetRunMs += HOP_MS;
          if (onsetRunMs >= SPEECH_START_MS) {
            inSpeech = true;
            confirmedSpeech = true;
            // In sentence mode the trace spans many words, so only clear it at
            // the FIRST onset; later words append to the same contour.
            if (!P.multiSegment || !segments.length) livePoints = [];
          }
        } else {
          onsetRunMs = 0;
        }
      } else {
        if (f.hz > 0) {
          const last = livePoints[livePoints.length - 1];
          if (last && !last.gap && (f.t - last.t) > MAX_GAP_MS) livePoints.push({ gap: true });
          livePoints.push({ t: f.t, hz: f.hzD || f.hz, rms: f.rms });
        }
        if (!loud && (f.t - lastLoudT) > P.speechEndMs) {
          // Segment ended. Is it long enough to be a word?
          if ((lastLoudT - segStartT + HOP_MS) >= MIN_SPEECH_MS) {
            segments.push({ startMs: segStartT, endMs: lastLoudT });
            // Single-word default: the first real segment ends the capture.
            // Sentence mode: keep listening unless the floor has passed AND the
            // caller's predicate agrees we have heard the whole thing.
            let done = true;
            if (P.multiSegment) {
              if (f.t < P.minCaptureMs) done = false;
              else if (P.shouldStop) {
                try {
                  done = !!P.shouldStop({
                    segmentCount: segments.length,
                    elapsedMs: f.t,
                    segments: segments.slice()
                  });
                } catch (e) { done = true; }
              }
            }
            if (done) { stop('word'); return; }
            // Not finished: close this segment and keep listening. livePoints
            // are deliberately KEPT so the live drawing shows the sentence so
            // far rather than restarting at every word boundary.
            inSpeech = false;
            onsetRunMs = 0;
            return;
          }
          // False start (a click or breath that squeaked through). Reset the VAD
          // and keep listening — but KEEP the frames, because extractContour()
          // re-segments the whole recording later and may still find a real word
          // in there. The old code cleared everything AND cleared everVoiced,
          // which disabled the silence timeout and left the capture running to
          // the 8-second hard cap with nothing to show for it.
          inSpeech = false;
          onsetRunMs = 0;
          livePoints = [];
        }
      }

      // Timeouts.
      if (confirmedSpeech && !inSpeech && f.t >= P.minCaptureMs &&
          (f.t - lastLoudT) > P.autoStopSilenceMs) { stop('silence'); return; }
      if (!confirmedSpeech && f.t > P.noSpeechMs) { stop('nospeech'); return; }
      if (f.t > P.maxCaptureMs) { stop('timeout'); return; }
    }

    function tick() {
      if (!isRunning) return;
      pump();
      if (!isRunning) return;        // pump may have stopped us
      if (opts.onFrame) {
        const last = frames[frames.length - 1];
        try {
          opts.onFrame({
            t: last ? last.t : 0,
            hz: last ? last.hz : 0,
            rms: last ? last.rms : 0,
            inSpeech, livePoints, frames
          });
        } catch (e) {}
      }
      rafId = requestAnimationFrame(tick);
    }

    function stop(reason) {
      // Re-entrancy guard. stop() drains the remaining audio below, and that
      // drain runs updateLiveVad(), which can itself decide to stop — without
      // this flag that recurses and fires onEnd more than once.
      if (!isRunning || stopping) return;
      stopping = true;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      // Drain whatever audio already arrived but hasn't been analysed yet, so a
      // manual stop (or an auto-stop) doesn't lose the tail of the word. Bounded
      // to one trailing-silence window's worth — enough to catch the end of the
      // word, not enough to swallow a whole backgrounded backlog.
      pump(Math.ceil(SPEECH_END_MS / HOP_MS));
      isRunning = false;
      stopping = false;
      closeMic();
      const thresholdRms = provThresh || (MIN_FLOOR_RMS * Math.pow(10, ENERGY_MARGIN_DB / 20));
      // Keep the raw audio of this capture so the learner can hear their own
      // attempt back. It is a plain copy of the buffer we already recorded, held
      // in memory only and replaced by the next attempt — nothing is persisted.
      lastAudio = (writePos > 0) ? { samples: pcm.slice(0, writePos), sampleRate } : null;
      if (opts.onEnd) {
        try {
          opts.onEnd({ frames: frames.slice(), thresholdRms, reason: reason || 'manual',
                       hasAudio: !!lastAudio });
        } catch (e) {}
      }
    }

    // Play the most recent capture back. Trimmed to the speech span that was
    // actually analysed, so the learner hears the word rather than the silence
    // around it.
    function playLast(fromMs, toMs) {
      if (!lastAudio) return false;
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          ctx = new AC();
        }
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
        stopPlayback();
        const sr = lastAudio.sampleRate;
        let a = 0, b = lastAudio.samples.length;
        if (fromMs >= 0 && toMs > fromMs) {
          a = Math.max(0, Math.floor((fromMs - 120) * sr / 1000));
          b = Math.min(lastAudio.samples.length, Math.ceil((toMs + 180) * sr / 1000));
        }
        if (b - a < 64) { a = 0; b = lastAudio.samples.length; }
        const buf = ctx.createBuffer(1, b - a, sr);
        buf.copyToChannel(lastAudio.samples.subarray(a, b), 0);
        playSrc = ctx.createBufferSource();
        playSrc.buffer = buf;
        playSrc.connect(ctx.destination);
        playSrc.onended = () => { playSrc = null; if (opts.onPlaybackEnd) { try { opts.onPlaybackEnd(); } catch (e) {} } };
        playSrc.start();
        return true;
      } catch (e) { return false; }
    }

    function stopPlayback() {
      if (playSrc) { try { playSrc.stop(); } catch (e) {} try { playSrc.disconnect(); } catch (e) {} playSrc = null; }
    }

    return {
      async start(o) {
        if (isRunning) stop('restart');
        opts = o || {};
        // Resolve BEFORE openMic: the PCM buffer is sized from P.maxCaptureMs.
        // With no `vad` key this reproduces the previous constants exactly.
        P = resolveVadPolicy(opts.vad);
        segments = [];
        frames = []; livePoints = []; recentHz = []; lastHz = 0;
        writePos = 0;
        floorSamples = []; provFloor = 0; provThresh = 0;
        inSpeech = false; onsetRunMs = 0; lastLoudT = 0; segStartT = 0;
        confirmedSpeech = false;
        await openMic();
        centrePos = WIN_WIDE >> 1;     // first window that is fully inside the buffer
        isRunning = true;
        rafId = requestAnimationFrame(tick);
        return true;
      },
      stop,
      playLast,
      stopPlayback,
      // Speech segments finalized during the capture, as {startMs,endMs}. In
      // sentence mode these are genuine silence-delimited boundaries — the one
      // segmentation cue that is never ambiguous — so a caller can use them as
      // hard anchors rather than re-deriving them from the audio.
      segments() { return segments.slice(); },
      hasAudio() { return !!lastAudio; },
      /* Save the current attempt as a WAV. `filename` should already carry the
         context (mode, profile centre, result) — the capture does not know it.
         Returns a promise; false means there was nothing to export. */
      exportLast(filename) {
        if (!lastAudio) return Promise.resolve(false);
        var blob = new Blob([encodeWav(lastAudio.samples, lastAudio.sampleRate)],
                            { type: 'audio/wav' });
        return saveBlob(blob, filename || 'attempt.wav');
      },
      audioInfo() {
        return lastAudio
          ? { sampleRate: lastAudio.sampleRate, samples: lastAudio.samples.length,
              ms: Math.round(lastAudio.samples.length / lastAudio.sampleRate * 1000) }
          : null;
      },
      clearAudio() { stopPlayback(); lastAudio = null; },
      isRunning() { return isRunning; },
      release() {
        isRunning = false; stopping = false;
        stopPlayback(); lastAudio = null;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        closeMic();
      }
    };
  }

  /* ----------------------------------------------------------------------
     ATTEMPT EXPORT
     ----------------------------------------------------------------------
     Writes the captured PCM out as a 16-bit mono WAV so an attempt can be sent
     off for diagnosis exactly as the engine received it.

     WAV rather than MP3 on purpose: an MP3 encoder is a ~100 KB dependency AND
     lossy, so the exported file would no longer be the audio that was scored.
     A WAV header is a few lines and the samples are bit-exact. Verified: an
     mp3 and a WAV re-encode of it score identically through the offline
     harness (12/12, 97%, same centre, same per-syllable scores).

     The buffer is exported UNTRIMMED. playLast() trims to the speech span for
     listening, but the analysis pipeline re-derives that span itself, so a
     pre-trimmed file would hide exactly the segmentation bugs worth seeing.
     ---------------------------------------------------------------------- */
  function encodeWav(samples, sampleRate) {
    var n = samples.length;
    var buf = new ArrayBuffer(44 + n * 2);
    var v = new DataView(buf);
    function str(off, t) { for (var i = 0; i < t.length; i++) v.setUint8(off + i, t.charCodeAt(i)); }
    str(0, 'RIFF');  v.setUint32(4, 36 + n * 2, true);
    str(8, 'WAVE');  str(12, 'fmt ');
    v.setUint32(16, 16, true);          // PCM chunk size
    v.setUint16(20, 1, true);           // format = PCM
    v.setUint16(22, 1, true);           // mono
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * 2, true);
    v.setUint16(32, 2, true);           // block align
    v.setUint16(34, 16, true);          // bits per sample
    str(36, 'data'); v.setUint32(40, n * 2, true);
    var o = 44;
    for (var i = 0; i < n; i++) {
      var x = samples[i];
      if (x > 1) x = 1; else if (x < -1) x = -1;
      v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true);
      o += 2;
    }
    return buf;
  }

  /* Hand a Blob to the user. Two routes, both fired inside the click handler
     because iOS requires a user gesture:
       - Web Share Level 2 when the platform can share FILES (iOS 15+, Android
         Chrome). This is the only route that reaches the iOS share sheet.
       - <a download> otherwise (desktop Chrome/Firefox/Edge/Safari).
     Returns a promise resolving to true if a route was taken. A cancelled
     share sheet is a normal outcome, not an error. */
  function saveBlob(blob, filename) {
    try {
      if (navigator.canShare && navigator.share) {
        var file = new File([blob], filename, { type: 'audio/wav' });
        if (navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file], title: filename })
            .then(function () { return true; })
            .catch(function () { return true; });   // user cancelled: still handled
        }
      }
    } catch (e) {}
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { document.body.removeChild(a); } catch (e) {}
        try { URL.revokeObjectURL(url); } catch (e) {}
      }, 4000);
      return Promise.resolve(true);
    } catch (e) { return Promise.resolve(false); }
  }

  /* Filename-safe: ASCII, no spaces or separators. Diacritics are stripped so
     a romanisation like "mǎa" cannot produce a name a phone refuses to save. */
  function safeName(s) {
    var t = String(s == null ? '' : s);
    if (t.normalize) t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return t.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  function clampFloor(v) {
    return Math.max(MIN_FLOOR_RMS, Math.min(MAX_FLOOR_RMS, v || 0));
  }

  function percentile(arr, q) {
    if (!arr || !arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const i = Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))));
    return s[i];
  }

  // =========================================================
  //  OFFLINE CONTOUR EXTRACTION
  //  -------------------------------------------------------
  //  Runs once, at the end of a capture, with the complete recording available.
  //  That is the whole point: the old pipeline had to commit to segmentation
  //  decisions live, frame by frame, and could never revise them.
  // =========================================================
  //  Steps 0-2 (octave path, noise floor, run building) are IDENTICAL for a
  //  single word and for a whole sentence; only run SELECTION differs. They are
  //  therefore factored into prepareRuns() and shared, so extractContour() and
  //  extractUtterance() cannot drift apart the way the Challenge's private copy
  //  of the capture loop once drifted from the Trainer's.
  function prepareRuns(frames, liveThreshold, centreHint) {
    if (!frames || frames.length < MIN_CORE_POINTS) return null;

    // 0. Re-solve the octave choice with the whole recording in hand. The live
    //    pass had to commit frame by frame; here we can see that (say) a halved
    //    creaky tail is inconsistent with everything before it.
    if (frames.some(f => f.cands && f.cands.length)) {
      const voiced = frames.filter(f => f.hz > 0).map(f => f.hz);
      const anchor = centreHint > 0 ? centreHint : (voiced.length ? median(voiced) : 0);
      if (anchor > 0) frames = resolveOctavePath(frames, anchor);
    }

    // 1. Re-derive the noise floor from the WHOLE capture, not just its opening
    //    180ms. p10 of every frame is silence in any realistic recording.
    const rmsAll = frames.map(f => f.rms);
    const p10 = percentile(rmsAll, 0.10);
    const p90 = percentile(rmsAll, 0.90);
    let thresh = clampFloor(p10) * Math.pow(10, ENERGY_MARGIN_DB / 20);
    // Never let the threshold sit above a quarter of the loud level, whatever the
    // floor says — that's the belt-and-braces guard against a poisoned floor.
    if (p90 > 0) thresh = Math.min(thresh, p90 * 0.25);
    thresh = Math.max(thresh, MIN_FLOOR_RMS * 1.6);
    if (liveThreshold > 0) thresh = Math.min(thresh, liveThreshold);

    // 2. Build speech runs: frames that are loud AND voiced, merging short
    //    unvoiced gaps (stop closures, mid-syllable devoicing).
    const runs = [];
    let cur = null;
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const on = (f.rms >= thresh && f.hz > 0);
      if (on) {
        if (cur && (f.t - cur.lastT) <= MERGE_GAP_MS) { cur.end = i; cur.lastT = f.t; cur.count++; }
        else { cur = { start: i, end: i, lastT: f.t, count: 1 }; runs.push(cur); }
      }
    }
    if (!runs.length) return null;
    return { frames, thresh, runs };
  }

  //  Steps 4-6 for ONE run: extend outward, take voiced points, smooth, trim.
  //  `terminal` says whether this run ends the utterance. Creak and terminal
  //  reversal are UTTERANCE-final phenomena; applying those trims to a
  //  mid-sentence word would eat real tone information (the low tone of a
  //  non-final syllable looks exactly like creak to that test), so they run
  //  only on the last run. That distinction does not exist for single words,
  //  where the only run is always terminal — which is why the default is true.
  function refineRun(frames, run, thresh, centreHint, terminal) {
    // 4. Extend outward while frames are still voiced and clearly above the
    //    floor. A falling tone's tail is quiet — that's the part the old energy
    //    trim removed, taking the falling evidence with it.
    const extGate = thresh * EXTEND_GATE;
    let lo = run.start, hi = run.end;
    while (lo > 0) {
      const f = frames[lo - 1];
      if (f.hz > 0 && f.rms >= extGate && (frames[run.start].t - f.t) <= EXTEND_MS) lo--;
      else break;
    }
    while (hi < frames.length - 1) {
      const f = frames[hi + 1];
      if (f.hz > 0 && f.rms >= extGate && (f.t - frames[run.end].t) <= EXTEND_MS) hi++;
      else break;
    }

    // 5. Voiced frames only, then the duration test — measured as a real span
    //    plus one hop, not fencepost-to-fencepost.
    let pts = [];
    for (let i = lo; i <= hi; i++) {
      if (frames[i].hz > 0) pts.push({ t: frames[i].t, hz: frames[i].hz, rms: frames[i].rms });
    }
    if (pts.length < MIN_VOICED_FRAMES) return null;
    const durMs = (pts[pts.length - 1].t - pts[0].t) + HOP_MS;
    if (durMs < MIN_SPEECH_MS) return null;

    // 6. Remove any tracked-noise plateau the extension in step 4 pulled in,
    //    BEFORE smoothing, so noise is never blended into the first real frames.
    //    This runs on both edges regardless of `terminal`: a flat quiet block
    //    joined to the word by a step is background noise wherever it occurs,
    //    and runs are already silence-delimited, so it is not a neighbouring
    //    syllable.
    pts = trimNoisePlateau(pts);
    if (pts.length < MIN_CORE_POINTS) return null;

    // 7. Centred median smoothing, then the de-spiker.
    const win = pts.length >= MEDIAN_LONG_MIN_PTS ? MEDIAN_WINDOW_LONG : MEDIAN_WINDOW;
    pts = medianSmooth(pts, win);
    pts = despike(pts);
    pts = trimEdgeGlitches(pts);
    if (terminal !== false) {
      pts = trimTerminalCreak(pts, centreHint);
      pts = trimTerminalRelease(pts, centreHint);
      pts = trimTerminalReversal(pts);
    }
    return pts.length >= MIN_CORE_POINTS ? pts : null;
  }

  function extractContour(frames, liveThreshold, centreHint) {
    const prep = prepareRuns(frames, liveThreshold, centreHint);
    if (!prep) return null;

    // 3. Keep the run with the most voiced frames. Picking the BEST run rather
    //    than the first is what makes a false start harmless.
    let best = prep.runs[0];
    for (const r of prep.runs) if (r.count > best.count) best = r;

    return refineRun(prep.frames, best, prep.thresh, centreHint, true);
  }

  /* ---- Whole-utterance extraction ---------------------------------------
     Same pipeline, but KEEPS EVERY RUN instead of picking the loudest one.
     That single difference is what separates a sentence from a word: step 3
     above throws away every syllable but one, which is exactly right for
     "maa" and exactly wrong for "ใครขายไข่ไก่".

     Returns null, or:
       {
         runs:   [ { pts, startMs, endMs, gapBeforeMs, index } ],
         points: all pts concatenated, with { gap:true } markers between runs
                 (the same marker the live drawing already understands),
         thresh, durMs, dropped
       }

     Short runs that fail the duration/voicing tests are dropped rather than
     rejecting the whole utterance — a lip smack before speech should not
     invalidate a good sentence — but they are COUNTED, because a caller
     comparing run count against expected syllable count needs to know that
     something was discarded.                                                */
  function extractUtterance(frames, liveThreshold, centreHint, opts) {
    opts = opts || {};
    const prep = prepareRuns(frames, liveThreshold, centreHint);
    if (!prep) return null;

    const minRunMs = (typeof opts.minRunMs === 'number') ? opts.minRunMs : MIN_SPEECH_MS;
    const out = [];
    let dropped = 0;
    for (let i = 0; i < prep.runs.length; i++) {
      const r = prep.runs[i];
      const spanMs = (prep.frames[r.end].t - prep.frames[r.start].t) + HOP_MS;
      if (spanMs < minRunMs) { dropped++; continue; }
      // Only the final surviving run is treated as utterance-terminal; see
      // refineRun. We do not know which that is until the loop ends, so every
      // run is refined as non-terminal and the last one is redone below.
      const pts = refineRun(prep.frames, r, prep.thresh, centreHint, false);
      if (!pts) { dropped++; continue; }
      out.push({ run: r, pts });
    }
    if (!out.length) return null;

    const last = out[out.length - 1];
    const lastPts = refineRun(prep.frames, last.run, prep.thresh, centreHint, true);
    if (lastPts && lastPts.length >= MIN_CORE_POINTS) last.pts = lastPts;

    const runs = [];
    const points = [];
    let prevEnd = null;
    for (let i = 0; i < out.length; i++) {
      const pts = out[i].pts;
      const startMs = pts[0].t;
      const endMs = pts[pts.length - 1].t + HOP_MS;
      runs.push({
        pts, startMs, endMs, index: i,
        gapBeforeMs: prevEnd === null ? 0 : Math.max(0, startMs - prevEnd)
      });
      if (prevEnd !== null) points.push({ gap: true });
      for (let k = 0; k < pts.length; k++) points.push(pts[k]);
      prevEnd = endMs;
    }
    return {
      runs, points, dropped,
      thresh: prep.thresh,
      durMs: runs[runs.length - 1].endMs - runs[0].startMs
    };
  }

  // CENTRED median. The window shrinks symmetrically at the edges (down to a
  // single raw sample at the very ends) so endpoints keep their true value —
  // unlike the old trailing median, which lagged and flattened them.
  function medianSmooth(pts, win) {
    const k = (win - 1) >> 1;
    if (k < 1 || pts.length < 3) return pts;
    const hz = pts.map(p => p.hz);
    const out = new Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
      const kk = Math.min(k, i, pts.length - 1 - i);
      out[i] = (kk <= 0) ? pts[i]
        : { t: pts[i].t, rms: pts[i].rms, hz: median(hz.slice(i - kk, i + kk + 1)) };
    }
    return out;
  }

  // Velocity de-spiker. Two fixes over the old velocityGate:
  //   • the limit is per MILLISECOND, so it means the same thing at any hop or
  //     frame rate (the old per-frame limit rejected legitimate glides on a
  //     30fps device);
  //   • when a step is rejected the anchor no longer freezes. The old code kept
  //     comparing against a stale value, so ONE fast frame at the start of a fall
  //     caused every subsequent frame to be dropped — amputating the entire fall
  //     and turning a falling tone into a level-high one.
  // A big step is accepted when the NEXT frame confirms it (a sustained move is
  // real phonation); it is dropped only when the contour springs straight back
  // (a one-frame tracker glitch).
  function despike(pts) {
    if (pts.length < MIN_CORE_POINTS) return pts;
    const out = [pts[0]];
    let anchor = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const dt = Math.max(1, pts[i].t - anchor.t);
      const limit = Math.max(MIN_STEP_ST, MAX_ST_PER_MS * dt);
      const step = Math.abs(12 * Math.log2(pts[i].hz / anchor.hz));
      if (step <= limit) { out.push(pts[i]); anchor = pts[i]; continue; }
      const nxt = pts[i + 1];
      if (nxt) {
        const dt2 = Math.max(1, nxt.t - pts[i].t);
        const lim2 = Math.max(MIN_STEP_ST, MAX_ST_PER_MS * dt2);
        const cont = Math.abs(12 * Math.log2(nxt.hz / pts[i].hz));
        // Settled at a new level...
        if (cont <= lim2) { out.push(pts[i]); anchor = pts[i]; continue; }
        // ...or still travelling the SAME way, i.e. a fast but genuine glide.
        // An octave glitch springs straight back and fails this; a steep fall
        // keeps going down and passes.
        if ((pts[i].hz - anchor.hz) * (nxt.hz - pts[i].hz) > 0) {
          out.push(pts[i]); anchor = pts[i]; continue;
        }
      }
      // Unconfirmed lurch (including a final-frame one, which has no successor to
      // corroborate it) — drop it and keep measuring from the last trusted point.
    }
    return out.length >= MIN_CORE_POINTS ? out : pts;
  }

  // NOTE: trimTerminalReversal and trimTerminalCreak were each declared TWICE
  // in this file (a bad merge). JS function declarations hoist, so the LAST
  // declaration wins and the first copy was dead code. The dead copies have been
  // removed; the surviving definitions below are byte-identical to the ones that
  // were already executing, so this is a pure cleanup with no behaviour change.
  // See the handoff: the two copies of trimTerminalCreak were NOT identical, so
  // it mattered which one ran.

  // A short single word carries ONE tone: it cannot be both rising and falling.
  // So once the word has established a clear direction, a brief tail that runs
  // sharply AGAINST that direction is an artifact — a tracker slip, a creaky
  // release, a breath, a mic bump — and not part of the tone. Establish the
  // trend from the body, then drop the longest trailing block that contradicts
  // it. Deliberately narrow: it needs a clear trend to begin with, the tail must
  // be brief, and it must be displaced by a real margin, so genuine contour
  // shapes (a falling tone's fall, a rising tone's rise) are never touched.
  function trimTerminalReversal(pts) {
    const n = pts.length;
    if (n < 10) return pts;
    const maxTrim = Math.min(Math.floor(n * 0.20), Math.round(REVERSAL_MAX_MS / HOP_MS));
    if (maxTrim < 1) return pts;
    const bodyEnd = n - maxTrim;
    if (bodyEnd < 6) return pts;

    const st = i => 12 * Math.log2(pts[i].hz / pts[0].hz);
    const mean = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += st(i); return s / (b - a); };

    const h = Math.max(2, Math.round(bodyEnd * 0.25));
    const trend = mean(bodyEnd - h, bodyEnd) - mean(0, h);
    if (Math.abs(trend) < TREND_MIN_ST) return pts;   // no clear direction to protect
    const dir = trend > 0 ? 1 : -1;
    const anchor = mean(Math.max(0, bodyEnd - 3), bodyEnd);

    // Largest trailing block whose AVERAGE runs against the trend. Averaging
    // rather than testing frame by frame catches a spike that then plateaus.
    for (let k = maxTrim; k >= 1; k--) {
      const tail = mean(n - k, n);
      if ((tail - anchor) * dir >= -REVERSAL_ST) continue;
      // The tail must also START abruptly. A genuine rise or fall arrives as a
      // glide; an artifact arrives as a step.
      const step = Math.abs(st(n - k) - st(n - k - 1));
      if (step >= REVERSAL_STEP_ST) return pts.slice(0, n - k);
    }
    return pts;
  }

  // Thai words said in isolation end with glottalisation: the voice collapses
  // into creak, energy falls away, and the tracked pitch dives (or halves). That
  // tail is not part of the tone, but because it sits at the END it dominates
  // every slope feature — in the native-speaker corpus it was turning high and
  // mid words into falling ones. Trim it, but only when BOTH signs agree: the
  // frames are much quieter than the word's body AND well below its pitch. A
  // genuine falling tone falls while still well voiced, so it is not affected.
  function trimTerminalCreak(pts, centreHint) {
    if (pts.length < 8) return pts;

    // ONSET TEST — the thing that separates a release from a falling tone.
    if (centreHint > 0) {
      const head = pts.slice(0, Math.max(2, Math.round(pts.length * 0.25)));
      const onsetSt = 12 * Math.log2(median(head.map(p => p.hz)) / centreHint);
      if (onsetSt > CREAK_ONSET_MAX_ST) return pts;   // started high: this is a falling tone
    }
    const p90 = percentile(pts.map(p => p.rms || 0), 0.90);
    if (!(p90 > 0)) return pts;
    const bodyHz = median(pts.slice(0, Math.max(2, Math.floor(pts.length * 0.6))).map(p => p.hz));
    if (!(bodyHz > 0)) return pts;
    const maxTrim = Math.floor(pts.length * CREAK_MAX_FRAC);
    let hi = pts.length - 1, cut = 0;
    while (cut < maxTrim && (hi + 1) > MIN_CORE_POINTS) {
      const p = pts[hi];
      const quiet = (p.rms || 0) < CREAK_RMS_FRAC * p90;
      const low = (12 * Math.log2(p.hz / bodyHz)) < -CREAK_DROP_ST;
      if (quiet && low) { hi--; cut++; } else break;
    }
    return pts.slice(0, hi + 1);
  }

  // The first and last frame of a word sit on a partial window: half of the
  // analysis window covers silence, the consonant release, or the following
  // breath. That makes them unreliable, and because they are the ENDPOINTS they
  // have outsized influence on every slope feature (and on maxV/minV, which
  // drive the falling score). Drop them when they disagree sharply with their
  // neighbours.
  function trimEdgeGlitches(pts) {
    if (pts.length < MIN_CORE_POINTS + 2) return pts;
    let lo = 0, hi = pts.length - 1;
    for (let k = 0; k < EDGE_GLITCH_MAX && (hi - lo) >= MIN_CORE_POINTS; k++) {
      const refA = median([pts[lo + 1].hz, pts[lo + 2].hz, pts[Math.min(hi, lo + 3)].hz]);
      if (Math.abs(12 * Math.log2(pts[lo].hz / refA)) >= EDGE_GLITCH_ST) lo++; else break;
    }
    for (let k = 0; k < EDGE_GLITCH_MAX && (hi - lo) >= MIN_CORE_POINTS; k++) {
      const refB = median([pts[hi - 1].hz, pts[hi - 2].hz, pts[Math.max(lo, hi - 3)].hz]);
      if (Math.abs(12 * Math.log2(pts[hi].hz / refB)) >= EDGE_GLITCH_ST) hi--; else break;
    }
    return pts.slice(lo, hi + 1);
  }

  // A steady background sound is pitch-tracked as a flat, quiet plateau and gets
  // pulled into the run by the outward extension in refineRun step 4. Because it
  // sits at an END it then defines maxV/minV, `first`/`last` and `net` — on the
  // corpus, four such frames of room buzz gave a MID word a peak 4.2 semitones
  // above centre, which is all the falling score's peakFactor needs to reach its
  // maximum, and the word was read as FALLING.
  //
  // Three conditions, all required (see the constants for why energy alone is
  // not enough). The block is grown under the quiet AND flat constraints
  // TOGETHER: taking every quiet frame first and testing flatness afterwards
  // overshoots by one frame into the first real vowel frame, which makes the
  // block look 7 semitones tall and hides the artifact.
  function trimNoisePlateau(pts) {
    const n = pts.length;
    if (n < 8) return pts;
    const body = percentile(pts.map(p => p.rms || 0), 0.90);
    if (!(body > 0)) return pts;
    const gate = PLATEAU_RMS_FRAC * body;
    const st = i => 12 * Math.log2(pts[i].hz / pts[0].hz);
    const maxCut = Math.floor(n * PLATEAU_MAX_FRAC);

    // Given a quiet run of length k at one edge, find the cut. The cut is the
    // largest single-frame STEP inside that run: the boundary where the noise
    // ends and the voice begins. Requiring the step to dwarf the run's own
    // internal variation is what makes this safe — a genuine quiet tail GLIDES,
    // so it varies as much as its biggest step and fails the ratio test, while a
    // noise plateau barely varies at all and then jumps.
    const decide = (idxAt, k) => {
      if (k < PLATEAU_MIN_BLOCK) return 0;
      let bestJ = 0, bestStep = 0;
      for (let j = 1; j <= k; j++) {
        const s = Math.abs(st(idxAt(j)) - st(idxAt(j - 1)));
        if (s > bestStep) { bestStep = s; bestJ = j; }
      }
      if (bestJ < PLATEAU_MIN_BLOCK || bestStep < PLATEAU_STEP_ST) return 0;
      let mn = Infinity, mx = -Infinity;
      for (let i = 0; i < bestJ; i++) {
        const v = st(idxAt(i));
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      const span = mx - mn;
      if (span > PLATEAU_FLAT_ST && bestStep < PLATEAU_STEP_RATIO * span) return 0;
      return bestJ;
    };

    let k = 0;
    while (k < maxCut && (pts[k].rms || 0) < gate) k++;
    const lo = decide(j => j, k);

    k = 0;
    while (k < maxCut && (pts[n - 1 - k].rms || 0) < gate) k++;
    const cutTail = decide(j => n - 1 - j, k);
    const hi = n - 1 - cutTail;

    if (lo === 0 && hi === n - 1) return pts;
    if (hi - lo + 1 < MIN_CORE_POINTS) return pts;
    const out = pts.slice(lo, hi + 1);
    return out;
  }

  // The voice falling away at the end of phonation. Keyed on the position of the
  // PEAK, which is what actually separates this from a falling tone (see the
  // RELEASE_* constants). Needs the calibrated centre only to be scale-free; the
  // test itself is about shape, not height.
  function trimTerminalRelease(pts, centreHint) {
    const n = pts.length;
    if (n < 10) return pts;
    const ref = centreHint > 0 ? centreHint : pts[0].hz;
    const st = i => 12 * Math.log2(pts[i].hz / ref);

    let pk = 0;
    for (let i = 1; i < n; i++) if (st(i) > st(pk)) pk = i;
    if (pk < 2) return pts;                              // peak at the very start: falling
    if (pk / (n - 1) < RELEASE_PEAK_MIN) return pts;     // peaked early: this IS a falling tone
    if ((n - 1 - pk) / (n - 1) > RELEASE_TAIL_MAX_FRAC) return pts;
    if ((pts[n - 1].t - pts[pk].t) > RELEASE_TAIL_MAX_MS) return pts;
    if ((st(pk) - st(n - 1)) < RELEASE_MIN_DROP_ST) return pts;

    const keep = pk + 1;
    return keep >= n || keep < MIN_CORE_POINTS ? pts : pts.slice(0, keep);
  }

  // Backwards-compatible wrapper. External callers used to hand us the raw
  // voiced points plus a live threshold; extractContour needs the same shape.
  function cleanCaptureCore(realPoints, thresholdRms, centreHint) {
    if (!realPoints || !realPoints.length) return null;
    const frames = realPoints.filter(p => !p.gap).map(p => ({
      t: p.t, hz: p.hz, hzD: p.hz, rms: (p.rms || 1), clarity: 1
    }));
    return extractContour(frames, thresholdRms, centreHint);
  }
  // Classify a trimmed contour into one of the five Thai tones.
  //
  // TWO-STAGE decision (this is the key design):
  //   Stage 1 — is this a CONTOUR tone or a LEVEL tone? Decided by how much the
  //     pitch MOVES (net slope from start to end). Substantial directed movement
  //     means rising/falling, judged by direction and shape — ABSOLUTE HEIGHT IS
  //     IGNORED here, so a low->mid rise is still "rising" even if it never goes
  //     above the centre.
  //   Stage 2 — only for relatively FLAT contours, use HEIGHT relative to the
  //     calibrated centre to pick low / mid / high, with a downward-DRIFT tiebreaker:
  //     Thai low tone sags slightly, mid stays flat. So a below-centre line that
  //     drifts down reads as low; a below-centre line that stays flat reads as mid.
  //
  // Drift is calibration-independent (a sag is a sag regardless of centre), which
  // makes the low/mid call less fragile to an imperfect calibration centre.
  function classifyTone(core, centreHz) {
    if (!core || core.length < 4) return null;
    const { sc, m } = computeToneScores(core, centreHz);

    // Pick the winner and compute confidence from the margin to the runner-up.
    const ranked = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
    const tone = ranked[0];
    const topScore = sc[tone];
    const margin = topScore - sc[ranked[1]];
    // Confidence blends absolute fit (topScore) with how decisively it beat #2.
    const confidence = clamp01(0.45 * clamp01(topScore) + 0.85 * clamp01(margin));

    return {
      tone, confidence,
      runnerUp: ranked[1],
      // Diagnostics (used by debug mode to understand misclassifications):
      m: Object.assign({}, m, {
        scores: { mid: +sc.mid.toFixed(2), low: +sc.low.toFixed(2),
                  falling: +sc.falling.toFixed(2), high: +sc.high.toFixed(2),
                  rising: +sc.rising.toFixed(2) } })
    };
  }

  // PURE scoring core (no DOM, no module-mutable state). Given a cleaned contour
  // `core` ([{hz}, ...]) and the speaker's centre pitch, returns the per-tone
  // match scores `sc` plus the derived features `m`. This is the single source of
  // truth for the acoustic model: classifyTone() (Tone Trainer) and
  // scoreToneAttempt() (Tone Challenge) both build on it, so the two modes can
  // never disagree about what a contour looks like.
  // NOTE: an earlier revision judged on an "inner core" with a couple of frames
  // shaved off each end, on the theory that no boundary frame should be able to
  // flip the verdict. Measured against the corpus it made things WORSE: the last
  // frames of a rising tone are its peak and the last frames of a falling tone
  // are its trough, so shaving them removes the very evidence that identifies
  // those tones. Endpoint robustness is handled instead where it belongs — by
  // trimming actual artifacts (trimEdgeGlitches / trimTerminalCreak /
  // trimTerminalReversal) and by using percentile extremes rather than raw
  // max/min, so a single stray frame cannot dominate.
  function computeToneScores(core, centreHz) {
    const semis = core.map(p => 12 * Math.log2(p.hz / centreHz));
    const n = semis.length;

    // Robust endpoints: average the first/last ~20% so a single frame doesn't
    // define the slope. mean = overall height. net = directed movement (drift).
    const head = Math.max(1, Math.round(n * 0.2));
    const first = avg(semis.slice(0, head));
    const last  = avg(semis.slice(n - head));
    const mean  = avg(semis);
    const net   = last - first;                  // + rises, - falls (also = drift)
    // ROBUST extremes. A single stray frame used to set maxV/minV outright, and
    // maxV drives the falling score's peak factor — one bad edge frame on a mid
    // word was enough to make it look like a falling tone. Percentiles over the
    // contour are stable; the true extremes are kept for display/diagnostics.
    const sorted = semis.slice().sort((a, b) => a - b);
    const at = q => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
    const maxV = n >= 8 ? at(0.95) : Math.max(...semis);
    const minV = n >= 8 ? at(0.05) : Math.min(...semis);
    const maxAbs = Math.max(...semis), minAbs = Math.min(...semis);
    const maxAt = semis.indexOf(maxV) / (n - 1);  // 0..1 position of the peak
    const minAt = semis.indexOf(minV) / (n - 1);  // 0..1 position of the trough
    const range = maxV - minV;                    // total excursion
    const drop  = first - last;                   // + when the contour falls overall

    // Extra features for two native shapes the endpoint-only model misses:
    //  • back-half recovery — a rising tone that DIPS in the body then sweeps up,
    //    ending near where it started (net ~ 0, so 'net' alone can't see it). We
    //    measure the climb from the trough to the highest point AFTER it; using the
    //    true post-trough peak (not the smeared 20% tail average) keeps a late
    //    one-frame sweep visible.
    //  • body level/flatness — a MID tone whose body sits flat near centre but
    //    plunges only at the very end (final declination). Whole-contour mean sags
    //    into the low band, so we look at the BODY (first 70%) separately.
    const troughIdx = semis.indexOf(minAbs);
    const afterTrough = semis.slice(troughIdx);
    const backPeak = Math.max(...afterTrough);
    const backPeakAt = (troughIdx + afterTrough.indexOf(backPeak)) / (n - 1);
    const recovery = backPeak - minV;             // how far it climbed up from the trough
    // Body = the front portion of the syllable, before any utterance-final
    // creak. Thai words said in isolation very often end with a steep creaky
    // drop that is not part of the tone; measuring the body separately is what
    // lets a MID tone survive it.
    const bodyN = Math.max(2, Math.round(n * 0.60));
    const body = semis.slice(0, bodyN);
    const bodyMean = avg(body);
    const bodyRange = Math.max(...body) - Math.min(...body);

    // MAX DRAWDOWN — the largest fall from any point to any LATER point, and
    // where that fall starts and ends. This is the feature the old model lacked.
    // It sees a fall wherever it happens in the syllable, so a native falling
    // tone that holds high and then drops only near the end still registers,
    // whereas `net` (a 20%-tail average minus a 20%-head average) smears that
    // late drop away and reported almost no movement.
    let runMax = semis[0], runMaxIdx = 0;
    let dd = 0, ddStartIdx = 0, ddEndIdx = 0;
    for (let i = 1; i < n; i++) {
      if (semis[i] > runMax) { runMax = semis[i]; runMaxIdx = i; }
      const d = runMax - semis[i];
      if (d > dd) { dd = d; ddStartIdx = runMaxIdx; ddEndIdx = i; }
    }
    const ddStartAt = ddStartIdx / (n - 1);
    const ddEndAt = ddEndIdx / (n - 1);

    // ...and the mirror image, the largest RISE to any later point.
    let runMin = semis[0], runMinIdx = 0;
    let du = 0, duStartIdx = 0, duEndIdx = 0;
    for (let i = 1; i < n; i++) {
      if (semis[i] < runMin) { runMin = semis[i]; runMinIdx = i; }
      const u = semis[i] - runMin;
      if (u > du) { du = u; duStartIdx = runMinIdx; duEndIdx = i; }
    }
    const duStartAt = duStartIdx / (n - 1);
    const duEndAt = duEndIdx / (n - 1);

    // How far the voice CLIMBED to reach its peak. A high tone arrives at its
    // peak from below (ref shape climbs ~4.5 st); a falling tone is already near
    // its peak when the vowel starts (~1.9 st, and less for casual native speech).
    // This separates the two even when both end up sitting high.
    const riseToPeak = maxV - first;

    // Does the contour still be climbing when it ends? A Thai RISING tone
    // terminates at its peak; a HIGH tone is canonically rising-then-slightly-
    // falling (the reference shapes encode exactly this: high ends 4.4 -> 4.0,
    // rising ends 0.5 -> 3.8). Measured over the last 60% only, so junk at the
    // start of a contour cannot set the peak.
    const tailFrom = Math.max(0, Math.floor(n * 0.40));
    const tailPeak = Math.max(...semis.slice(tailFrom));
    const endN = Math.max(1, Math.round(n * 0.10));
    const endLevel = avg(semis.slice(n - endN));
    const endDrop = tailPeak - endLevel;

    const sc = { mid: 0, low: 0, falling: 0, high: 0, rising: 0 };

    // --- FALLING: a peak followed by a substantial drop. GRADED, not gated. ---
    //
    // The old version was `if (net <= -1.5 && first >= 0.3)`, which produced a
    // hard ZERO whenever either condition missed — so a native falling tone with
    // a late or shallow drop didn't merely lose to HIGH, it scored 0, and in Tone
    // Challenge that reads as "Off · 0%". Two failure modes were common:
    //   • the drop lands in the last ~15% of the syllable, so the tail average
    //     smears it and `net` never reaches -1.5;
    //   • the speaker's centre is calibrated slightly high, so `first` misses +0.3.
    //
    // Now the score is built from max drawdown (position-independent), scaled by
    // how high the peak sits relative to the speaker's centre. That peak factor is
    // what keeps this from swallowing the other tones: a MID tone with normal
    // final declination has a real drawdown but peaks at ~0, so it is heavily
    // discounted, and a LOW tone that sags peaks below centre and is discounted
    // harder still.
    // A falling tone STARTS high: in the native recordings the peak sits +3 to
    // +9 semitones above the speaker's centre. A mid tone with heavy citation-
    // form final creak also has a large drawdown, but peaks at ~0 — so the peak
    // height, not the size of the drop, is what separates them.
    const peakFactor = 0.15 + 0.85 * clamp01((maxV - 0.5) / 3.0);
    const fallCore = clamp01((dd - 1.5) / 4.0);
    sc.falling = peakFactor * (
        fallCore                                             // size of the drop
      + (ddStartAt <= 0.70 ? fallCore * 0.30 : 0)            // fall begins early enough
      + fallCore * clamp01((2.5 - riseToPeak) / 2.5) * 0.50  // arrived already high
      + clamp01((-net - 0.5) / 3.5) * 0.35                   // overall downward drift
    );

    // --- RISING: upward movement that comes FROM a low body (dips low then climbs).
    //     A contour that merely rises but sits high is a HIGH tone, not rising — so
    //     rising requires a low-ish mean / low trough, not just positive net.
    //     It must also REACH toward the centre/high register (maxV >= -0.3): a mid
    //     tone with a low-pitched ONSET climbs into the mid band but tops out below
    //     centre (~-0.7 to -1.5) — that is a mid, not a rising, and the maxV gate
    //     keeps it out. A real rising reaches at least the centre. ---
    // --- RISING vs HIGH: judge the SHAPE of the rise, not its absolute height. ---
    //
    // Both tones climb, so height alone cannot separate them, and the previous
    // rule leaned on absolute trough depth ("a rising tone dips well below the
    // calibrated centre"). Real speech does not honour that: a native speaker's
    // question particle ไหม starts AT the centre, dips barely 1.5 semitones, and
    // rises 12 — a textbook rising tone that the depth rule scored at the floor
    // and handed to HIGH.
    //
    // What actually separates them, measured across seven speakers:
    //   • SIZE of the climb. Rising tones rose 11-16 semitones; high tones 3-8.
    //   • WHEN the climb starts. A rising tone holds low and then rises from
    //     around 20-45% through the syllable. A high tone climbs from the very
    //     first frame, because its "trough" is just the consonant onset.
    // Both are shape properties, independent of where the speaker's centre sits,
    // which is what makes them robust across voices and calibration error.
    // Ramp deliberately starts below the reference shape's own climb (6.8 st):
    // TONE_REFS is a schematic drawing, shallower than real speech, and a learner
    // who matches the target we draw for them must still score full marks.
    const riseSize = 0.15 + 0.85 * clamp01((du - RISE_SIZE_LO) / 5.0);
    const riseLate = RISE_LATE_FLOOR + (1 - RISE_LATE_FLOOR) * clamp01((duStartAt - 0.05) / 0.20);
    const riseFactor = riseSize * riseLate;
    if (net >= 1.5 && maxV >= -0.3) {
      sc.rising = riseFactor * (
                  clamp01((net - 1.0) / 3.5)                 // upward movement
                + (minAt <= 0.6 ? 0.2 : 0)                   // trough early (dip then rise)
                + clamp01((-mean - 0.5) / 3) * 0.6           // body sits low
                + (minV <= -1.5 ? 0.25 : 0));                // dipped below the centre
    } else if (minAt >= 0.30 && minAt <= 0.80 && recovery >= 2.5 &&
               backPeakAt >= 0.85 && minV <= -2.5 && backPeak > minV) {
      // VALLEY RISE: a natural native rising that dips low in the body then sweeps
      // up LATE, ending near its start (so net ~ 0 and the gate above never fires).
      // Tight conditions — trough in the body, a real recovery (>=2.5 st) peaking
      // at the very end, from a genuinely low trough — so a flat LOW tail or a
      // FALLING contour (which keeps dropping) cannot trigger it. (This branch is
      // intentionally NOT subject to the maxV gate: a genuine valley-rise can top
      // out just below centre, and its tight trough/recovery shape already
      // distinguishes it from a low-onset mid.)
      sc.rising = clamp01((recovery - 2.0) / 3.5)
                + 0.35
                + clamp01((-mean - 0.5) / 3) * 0.4;
    } else {
      // Neither branch fired. Rather than leave rising at a hard 0 — which made a
      // near-miss unscoreable in Tone Challenge — give it a small graded value
      // from the max drawup, so an attempt that genuinely climbed gets partial
      // credit. Deliberately weak: it cannot win against a properly-fitting tone.
      sc.rising = clamp01((du - 1.5) / 4.0) * 0.35
                * (duEndAt >= 0.5 ? 1 : 0.6);
    }

    // --- HIGH: sits in the upper part of the range. A high tone may rise INTO the
    //     high range, but its body ends/sits high (mean and last both up). ---
    // A HIGH tone is high THROUGHOUT; it does not travel 12 semitones to get
    // there. The two terms that simply reward "ends up high" are the ones a
    // rising tone also satisfies, so they are damped in proportion to how large
    // the climb was. Without this, a rising tone that finishes near the top of
    // the speaker's range outscores it on height alone — which is exactly how a
    // textbook ไหม came back as HIGH.
    const highFlatness = clamp01(1 - (du - 6.0) / 8.0);
    /* The height term is damped by highFlatness, at half weight.
       "Sits above the centre" is a LEVEL-tone property, but a rising tone spends
       its whole second half above the centre, so its mean lands there too and it
       collects this term at full strength. On a real user recording -- a fast
       "หมู" (rising) -- mean sat 2.67 st above centre and this ONE term supplied
       sc.high = 0.79, beating a correct rising 0.735, while the contour had
       climbed 14.67 semitones. Nothing that climbs 14 semitones is a level tone.
       The two neighbouring terms are already damped by highFlatness for exactly
       this reason; this one was not, and it is the largest of the three.

       Half weight, not full: at full damping the Trainer corpus loses F3/high
       (48 -> 47). Measured safe band is 0.5-1.0 for the corpus and up to about
       0.85 for the user recording, so 0.65 sits between the two cliffs rather
       than beside either. Trainer stays 48/50 with the same two F2 rows,
       contract 19/19, synthetic 20/20, TONE_REFS 5/5, and the Tongue Twister
       corpus is unchanged at 209/282 (measured at 0.5, 0.65 and 0.8 -- the
       failing configuration simply does not occur in it, which is why this was
       found by a user and not by the corpus). */
    sc.high = clamp01((mean - 0.3) / 3) * (0.65 + 0.35 * highFlatness) // height above centre
            + clamp01((last - 0.5) / 3) * 0.5 * highFlatness // ends high (if it did not climb far)
            + (Math.abs(net) < 3 ? 0.1 : 0)                 // not a wild contour
            - clamp01((-net) / 4) * 0.5                      // penalise big falls
            + clamp01(riseToPeak / 3) * 0.30                 // climbed INTO the peak,
                                                             // which is the high tone's
                                                             // signature and the falling
                                                             // tone's opposite...
              * clamp01((minV + 2.5) / 2.0)                  // ...but only when the voice
                                                             // never dipped deep first, and
              * highFlatness;                                // only when the climb was modest.
                                                             // A RISING tone also climbs into
                                                             // its peak and must not collect this.

    // BIG FALL FROM A HIGH BODY: a genuine falling tone can sit high for most of
    // the word (so mean/last are high) and then drop steeply only at the end.
    // The height terms above would otherwise let HIGH beat FALLING even though
    // the contour clearly falls. This now keys off max DRAWDOWN rather than
    // peak-to-end-average, so a high plateau followed by a late plunge counts —
    // the old `peakToEnd >= 3.0 && net <= -1.5` test needed the drop to survive
    // the 20% tail average, which is precisely what a late drop does not do.
    if (dd >= 2.5 && net <= -0.3) {
      sc.high -= clamp01((dd - 2.0) / 3.5) * 0.9;
    }

    // NATIVE LEVEL-HIGH: a native high tone in everyday speech is often spoken
    // almost flat, sitting only slightly above the centre rather than climbing
    // 3+ semitones. The height-based term above barely registers for such a
    // contour, so it loses to MID (which scores high near the centre). Detect the
    // signature and give HIGH a bump while damping MID.
    //
    // The flatness test now uses max drawdown instead of (first - last): a
    // contour that holds high and then drops 3 st at the very end has a small
    // first-minus-last but is emphatically not level, and the old test waved it
    // through — handing a falling tone a +0.6 bonus for the wrong tone.
    // `net < 1.5` keeps a strongly RISING contour out of the level-high bonus —
    // "level" should mean level.
    // `mean >= 0.8` (not -0.4) is essential: a MID tone is also flat, and sits at
    // the centre by definition. The old bound let a textbook-flat mid contour at
    // 0.0 collect the level-high bonus AND have its own mid score damped, which
    // read a perfect mid tone as high. A native level-high sits a semitone or
    // more above the speaker's centre.
    const levelHigh = (mean >= 0.8 && maxV >= 1.0 && minV >= -1.6 &&
                       dd < 1.6 && drop < 1.5 && net < 1.5);
    if (levelHigh) sc.high += 0.6;

    // --- LOW: sits in the LOWER part of the range, flat or gently sagging. The
    //     entry is at -1.7 (not -0.8): this speaker's mid words can sit as low as
    //     ~-2.5 while real lows are far deeper (-3 to -5), so low should only claim
    //     genuinely low words and leave the mid band the room between ~-1 and -2.5.
    //     Real lows are unaffected — they still win decisively. ---
    sc.low = clamp01((-mean - 1.7) / 3)                      // height clearly below centre
           + (net <= 0.5 ? 0.15 : 0)                         // not rising
           - clamp01(net / 4) * 0.5;                         // penalise big rises

    // --- MID: near the centre, only gentle movement. The band is WIDER than before
    //     (divisor 3.1, drift tolerance 1.5): mid words don't always sit at exactly
    //     0 — a relaxed mid can sit around -1.5 to -2.5 and drift gently — and the
    //     old narrow band (2.4 / 1.0) collapsed to ~0 by -2.4, leaking those words
    //     into LOW or RISING. Widening fills the gap up to where real low begins. ---
    sc.mid = clamp01(1 - Math.abs(mean) / 3.1)               // close-ish to centre
           * clamp01(1 - Math.max(0, Math.abs(net) - 1.5) / 3.0); // allow gentle drift
    if (levelHigh) sc.mid *= 0.55;                           // yield to a level-high

    // MID WITH FINAL DECLINATION: a native mid often holds flat near centre for the
    // body of the syllable, then drops steeply only at the very end. That terminal
    // plunge drags the whole-contour mean down into the low band, so the height-
    // based mid/low scores misread it. When the BODY (first 70%) is flat and sits
    // near centre, and the trough is right at the END (the drop is terminal, not
    // throughout), score it as the mid it is — judged on the body, not the tail.
    // FLAT BODY + LATE DROP = a mid tone with citation-form final creak, not a
    // falling tone. Every native mid word in the test corpus ends with a drop of
    // 5-8 semitones in its last quarter; judged on the whole contour they all
    // read as falling. The guards keep this narrow: the body must sit near the
    // speaker's centre (so a real falling tone, whose body is 3-9 semitones
    // high, cannot qualify) and the minimum must come late (so a high or rising
    // tone, which dips early or mid-word, cannot either).
    if (bodyRange <= 2.5 && bodyMean >= -1.3 && bodyMean <= 0.9 &&
        minAt >= 0.75 && first >= -1.0) {
      sc.mid = Math.max(sc.mid, clamp01(1 - Math.abs(bodyMean) / 2.4) * 0.9);
    }

    // NOTE: individual scores are intentionally left UN-clamped here (FALLING /
    // RISING / HIGH can sum slightly above 1). classifyTone()'s winner selection
    // and confidence math already handle that exactly as before; callers that need
    // bounded values (scoreToneAttempt) clamp locally. This keeps the Tone
    // Trainer's behaviour bit-for-bit identical to before the refactor.
    return { sc, m: { first, last, mean, net, minV, maxV, maxAt, minAt, range, drop,
                      recovery, backPeakAt, bodyMean, bodyRange, n, centreHz,
                      dd, ddStartAt, ddEndAt, du, duStartAt, duEndAt, endDrop, tailPeak,
                      riseToPeak, peakFactor, levelHigh } };
  }

  // Score how well a contour matches a SPECIFIC target tone (for Tone Challenge).
  // Returns { percent (0..100), tone (winner), isTarget, runnerUp, m }.
  //
  // The percent blends three things, so it means "how convincingly did you
  // produce the target tone":
  //   • absolute fit  — how strongly the target tone itself scored (0..1)
  //   • won?          — whether the target was the top-scoring tone
  //   • margin        — how decisively the target beat (or lost to) the next tone
  // A clean on-target tone that clearly wins reads high; an ambiguous one that
  // barely loses reads mid; a contour dominated by a different tone reads low.
  function scoreToneAttempt(core, centreHz, targetTone) {
    if (!core || core.length < 4 || !TONE_REFS[targetTone]) {
      return { percent: 0, tone: null, isTarget: false, runnerUp: null, m: null };
    }
    const { sc, m } = computeToneScores(core, centreHz);
    const ranked = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
    const winner = ranked[0];
    const isTarget = (winner === targetTone);

    const targetScore = clamp01(sc[targetTone]);
    // Margin of the target vs. its strongest competitor (positive if target wins).
    const best = sc[winner];
    const secondBest = sc[ranked[1]];
    const competitor = isTarget ? secondBest : best;
    const margin = sc[targetTone] - competitor;       // + when target leads

    // Blend: absolute fit dominates, margin sharpens it. A won attempt gets the
    // full positive margin bonus; a lost attempt is pulled down by the (negative)
    // margin so a clearly-wrong tone can't score high just by having some fit.
    let raw = 0.6 * targetScore + 0.55 * clamp01(0.5 + margin);
    raw = clamp01(raw);
    const percent = Math.round(raw * 100);

    return { percent, tone: winner, isTarget, runnerUp: ranked[1], m };
  }

  function reportDetection() {
    if (!detectedTone) { setStatus('', ''); return; }
    const ref = TONE_REFS[detectedTone.tone];
    const c = detectedTone.confidence;

    // Three confidence tiers from the score margin.
    //   >= 0.6  Clear   — confident
    //   >= 0.35 Likely  — probable but not certain
    //   <  0.35 Unsure  — ambiguous; the contour didn't strongly favour one tone
    let tier, tierClass;
    if (c >= 0.6)      { tier = 'Clear';  tierClass = 'conf-clear'; }
    else if (c >= 0.35){ tier = 'Likely'; tierClass = 'conf-likely'; }
    else               { tier = 'Unsure'; tierClass = 'conf-unsure'; }

    // Big readout: the tone name, ONCE (with the Thai name).
    const big = $('tone-detected');
    if (big) {
      big.textContent = ref.label + '  ' + ref.th;
      big.className = 'tone-detected show' + (c < 0.35 ? ' uncertain' : '');
    }

    // Second line: confidence, not a repeat of the tone.
    if (c < 0.35) {
      setStatus('Confidence: ' + tier + ' — could also be ' +
        TONE_REFS[detectedTone.runnerUp].label.toLowerCase() + '. Try again?', tierClass);
    } else {
      setStatus('Confidence: ' + tier, tierClass);
    }
  }

  function avg(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  // Stop and fully release the mic (turns off the OS mic indicator).
  function releaseMic() {
    try { if (capture) capture.release(); } catch (e) {}   // also stops + discards playback audio
    running = false;
    setPlayState(false);
    if (elPlayBtn) elPlayBtn.hidden = true;
    if (elSaveBtn) elSaveBtn.hidden = true;
  }

  function clearCapture(internal) {
    points = [];
    captureCentre = 0;
    trimmedPoints = null;
    detectedTone = null;
    frozen = false;
    if (elClearBtn) elClearBtn.hidden = true;
    if (elPlayBtn) elPlayBtn.hidden = true;
    if (elSaveBtn) elSaveBtn.hidden = true;
    try { if (capture) capture.stopPlayback(); } catch (e) {}
    stopRefPlayback();
    setPlayState(false);
    const big = $('tone-detected');
    if (big) big.className = 'tone-detected';
    if (!internal) {
      setStatus('Ready', '');
      showHint(true);
      draw();
    }
  }

  // ---- Drawing ----
  // Vertical span actually used for drawing: wide enough for this contour (and
  // for the guide overlay), never narrower than the default.
  let drawSpan = SEMITONE_SPAN;
  function spanFor(semis) {
    let hi = SEMITONE_SPAN / 2, lo = -SEMITONE_SPAN / 2;
    for (const v of semis) { if (v + SPAN_PAD > hi) hi = v + SPAN_PAD; if (v - SPAN_PAD < lo) lo = v - SPAN_PAD; }
    return Math.min(SPAN_MAX, 2 * Math.max(hi, -lo));
  }

  function semiToY(semi, h) {
    // 0 semitones (centre) maps to vertical middle; +span/2 at top.
    const half = drawSpan / 2;
    const clamped = Math.max(-half, Math.min(half, semi));
    return h / 2 - (clamped / half) * (h / 2 - h * 0.08);
  }

  function draw() {
    if (!elCtx || !elCanvas) return;
    const w = elCanvas.width, h = elCanvas.height;
    if (w === 0 || h === 0) return;
    elCtx.clearRect(0, 0, w, h);

    const ink = cssVar('--ink', '#2b2418');
    const inkSoft = cssVar('--ink-soft', '#6b5d44');
    const accent = cssVar('--accent', '#b8893a');
    const border = cssVar('--card-face-border', '#d4b87a');

    // ---- Decide the vertical span BEFORE anything is plotted, so the guide
    // overlay, the contour and the axis labels all agree.
    {
      const src = (frozen && trimmedPoints && trimmedPoints.length >= 2) ? trimmedPoints : points;
      const rr = src.filter(p => !p.gap);
      const pc = (activeProfile && activeProfile.centerHz > 0) ? activeProfile.centerHz : 0;
      const c = (frozen && captureCentre > 0) ? captureCentre
              : (pc || (rr.length ? median(rr.map(p => p.hz)) : 0));
      const vals = [];
      if (c > 0) for (const p of rr) vals.push(12 * Math.log2(p.hz / c));
      const refShape = TONE_REFS[selectedTone];
      if (refShape) for (const v of refShape.shape) vals.push(v);
      drawSpan = spanFor(vals);
    }

    // ---- Axis gutter. Labels live in a left margin so the contour never
    // overlaps them; the plot area starts after it.
    const gutter = Math.round(38 * dpr);
    const footer = Math.round(16 * dpr);
    const plotW = Math.max(10, w - gutter);
    const plotH = Math.max(10, h - footer);
    const fs = Math.round(11 * dpr);

    // Faint bands for the high and low regions, so the tone shape reads at a glance.
    const yHigh = semiToY(3.0, plotH), yLow = semiToY(-3.0, plotH);
    elCtx.globalAlpha = 0.07;
    elCtx.fillStyle = accent;
    elCtx.fillRect(gutter, 0, plotW, yHigh);
    elCtx.fillRect(gutter, yLow, plotW, plotH - yLow);
    elCtx.globalAlpha = 1;

    // Guide lines at the band edges + the centre (the speaker's mid level).
    elCtx.strokeStyle = border;
    elCtx.lineWidth = 1 * dpr;
    for (const [semi, alpha] of [[3.0, 0.30], [-3.0, 0.30], [0, 0.6]]) {
      elCtx.globalAlpha = alpha;
      if (semi === 0) elCtx.setLineDash([]); else elCtx.setLineDash([3 * dpr, 5 * dpr]);
      const y = semiToY(semi, plotH);
      elCtx.beginPath();
      elCtx.moveTo(gutter, y);
      elCtx.lineTo(w, y);
      elCtx.stroke();
    }
    elCtx.setLineDash([]);
    elCtx.globalAlpha = 1;

    // Left axis: "Pitch" plus High / Mid / Low.
    elCtx.fillStyle = inkSoft;
    elCtx.font = '600 ' + fs + 'px system-ui, -apple-system, sans-serif';
    elCtx.textAlign = 'left';
    elCtx.textBaseline = 'middle';
    elCtx.globalAlpha = 0.85;
    elCtx.fillText('High', 2 * dpr, semiToY(5.5, plotH));
    elCtx.fillText('Mid', 2 * dpr, semiToY(0, plotH));
    elCtx.fillText('Low', 2 * dpr, semiToY(-5.5, plotH));
    // Rotated "Pitch" caption down the far left.
    elCtx.save();
    elCtx.translate(fs * 0.9, plotH / 2);
    elCtx.rotate(-Math.PI / 2);
    elCtx.textAlign = 'center';
    elCtx.globalAlpha = 0.45;
    elCtx.fillText('Pitch', 0, -fs * 1.7);
    elCtx.restore();
    // Bottom axis caption.
    elCtx.textAlign = 'center';
    elCtx.textBaseline = 'bottom';
    elCtx.globalAlpha = 0.45;
    elCtx.fillText('Time \u2192', gutter + plotW / 2, h - 1 * dpr);
    elCtx.globalAlpha = 1;

    // Reference tone overlay (faint guide).
    const ref = TONE_REFS[selectedTone];
    if (ref) {
      elCtx.strokeStyle = accent;
      elCtx.globalAlpha = 0.35;
      elCtx.lineWidth = 6 * dpr;
      elCtx.lineCap = 'round';
      elCtx.lineJoin = 'round';
      elCtx.setLineDash([2 * dpr, 6 * dpr]);
      elCtx.beginPath();
      const n = ref.shape.length;
      for (let i = 0; i < n; i++) {
        const x = gutter + (i / (n - 1)) * plotW;
        const y = semiToY(ref.shape[i], plotH);
        if (i === 0) elCtx.moveTo(x, y); else elCtx.lineTo(x, y);
      }
      elCtx.stroke();
      elCtx.setLineDash([]);
      elCtx.globalAlpha = 1;
    }

    // User contour. When frozen, draw the edge-trimmed core (what we classified),
    // so the displayed line matches the detection and excludes the breathy tail.
    const source = (frozen && trimmedPoints && trimmedPoints.length >= 2)
      ? trimmedPoints
      : points;
    const real = source.filter(p => !p.gap);
    if (real.length >= 2) {
      // Centre reference. Prefer the calibrated profile mid-level (stable, so the
      // line sits at its true height even live). When frozen use the fixed
      // captureCentre; otherwise fall back to the running median if no profile.
      const profileCentre = (activeProfile && activeProfile.centerHz > 0) ? activeProfile.centerHz : 0;
      const centre = (frozen && captureCentre > 0)
        ? captureCentre
        : (profileCentre || median(real.map(p => p.hz)) || real[real.length - 1].hz);

      // Map captured time range across full width.
      const tEnd = real[real.length - 1].t;
      const tStart = real[0].t;
      const span = Math.max(1, tEnd - tStart);

      elCtx.strokeStyle = ink;
      elCtx.lineWidth = 3.5 * dpr;
      elCtx.lineCap = 'round';
      elCtx.lineJoin = 'round';
      elCtx.beginPath();
      let penDown = false;
      for (let i = 0; i < source.length; i++) {
        const p = source[i];
        if (p.gap) { penDown = false; continue; }
        const semi = 12 * Math.log2(p.hz / centre);
        const x = gutter + ((p.t - tStart) / span) * plotW;
        const y = semiToY(semi, plotH);
        if (!penDown) { elCtx.moveTo(x, y); penDown = true; }
        else elCtx.lineTo(x, y);
      }
      elCtx.stroke();
    }
  }

  // =========================================================
  //  PROFILES + SETUP / TRAINER MODE SWITCHING
  // =========================================================
  function getProfiles() {
    const st = window.state;
    return (st && Array.isArray(st.toneProfiles)) ? st.toneProfiles : [];
  }
  function persist() {
    try { if (typeof window.saveStorage === 'function') window.saveStorage(); } catch (e) {}
  }

  function setMode(m) {
    const view = $('view-tone');
    if (!view) return;
    view.classList.toggle('tone-mode-trainer', m === 'trainer');
    view.classList.toggle('tone-mode-setup', m === 'setup');
  }

  function renderProfileList() {
    const list = $('tone-profile-list');
    if (!list) return;
    list.innerHTML = '';
    const profiles = getProfiles();

    // If nothing is selected yet, default to last-used (or first).
    if (!selectedProfileId || !profiles.some(p => p.id === selectedProfileId)) {
      const st = window.state;
      const last = st && st.toneLastProfileId;
      selectedProfileId = (last && profiles.some(p => p.id === last))
        ? last
        : (profiles[0] ? profiles[0].id : null);
    }

    profiles.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'tone-profile-chip' + (p.id === selectedProfileId ? ' selected' : '');

      const avatar = document.createElement('div');
      avatar.className = 'tone-chip-avatar';
      avatar.textContent = p.name.charAt(0) || '?';

      const body = document.createElement('button');
      body.type = 'button';
      body.className = 'tone-chip-body';
      body.style.cssText = 'background:none;border:none;text-align:left;cursor:pointer;color:inherit;';
      body.innerHTML = '<div class="tone-chip-name"></div>' +
                       '<div class="tone-chip-meta">~' + Math.round(p.centerHz) + ' Hz centre</div>';
      body.querySelector('.tone-chip-name').textContent = p.name;
      body.addEventListener('click', () => { selectedProfileId = p.id; renderProfileList(); refreshStart(); });

      const recal = document.createElement('button');
      recal.type = 'button';
      recal.className = 'tone-chip-recal';
      recal.textContent = 'Recalibrate';
      recal.addEventListener('click', (e) => { e.stopPropagation(); openCalModal(p.id); });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'tone-chip-delete';
      del.setAttribute('aria-label', 'Delete profile');
      del.textContent = '×';
      del.addEventListener('click', (e) => { e.stopPropagation(); deleteProfile(p.id); });

      chip.appendChild(avatar);
      chip.appendChild(body);
      chip.appendChild(recal);
      chip.appendChild(del);

      // Make the whole chip selectable too (clicking padding).
      chip.addEventListener('click', () => { selectedProfileId = p.id; renderProfileList(); refreshStart(); });

      list.appendChild(chip);
    });

    // Add-profile button (hidden once at the cap).
    if (profiles.length < MAX_PROFILES) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'tone-add-profile';
      add.innerHTML = '<span>＋</span> Add profile';
      add.addEventListener('click', () => openCalModal(null));
      list.appendChild(add);
    } else {
      const note = document.createElement('div');
      note.className = 'tone-chip-meta';
      note.style.textAlign = 'center';
      note.textContent = 'Maximum of ' + MAX_PROFILES + ' profiles. Delete one to add another.';
      list.appendChild(note);
    }

    refreshStart();
  }

  function refreshStart() {
    const btn = $('tone-start-btn');
    const msg = $('tone-start-msg');
    if (!btn || !msg) return;
    const profiles = getProfiles();
    if (profiles.length === 0) {
      btn.disabled = true;
      msg.textContent = 'Add a voice profile to begin.';
    } else if (!selectedProfileId) {
      btn.disabled = true;
      msg.textContent = 'Select a profile to start.';
    } else {
      btn.disabled = false;
      msg.textContent = '';
    }
  }

  function deleteProfile(id) {
    const st = window.state;
    if (!st) return;
    st.toneProfiles = getProfiles().filter(p => p.id !== id);
    if (st.toneLastProfileId === id) st.toneLastProfileId = null;
    if (selectedProfileId === id) selectedProfileId = null;
    persist();
    renderProfileList();
  }

  function startTrainer() {
    const profiles = getProfiles();
    activeProfile = profiles.find(p => p.id === selectedProfileId) || null;
    if (!activeProfile) { refreshStart(); return; }
    // Remember last-used.
    const st = window.state;
    if (st) {
      st.toneLastProfileId = activeProfile.id;
      // Mark that the learner has actually STARTED a Tone Trainer session (not
      // merely opened the menu). This unlocks the Tone Challenge game mode.
      st.toneTrainerUsed = true;
      persist();
      // Re-evaluate the main-menu gate so the Tone Challenge button unlocks
      // immediately (it will apply on the next visit to the menu regardless).
      if (typeof window.applyToneChallengeGate === 'function') {
        try { window.applyToneChallengeGate(); } catch (e) {}
      }
    }
    // Reflect in trainer header.
    const nameEl = $('tone-active-name');
    if (nameEl) nameEl.textContent = activeProfile.name;
    clearCapture();
    setStatus('Ready', '');
    showHint(true);
    setMode('trainer');
    // Start the in-game screen at the top (the view is its own scroll container;
    // otherwise it keeps the setup screen's scroll offset and appears mid-page).
    const tv = $('view-tone');
    if (tv) tv.scrollTop = 0;
    requestAnimationFrame(() => { sizeCanvas(); draw(); });
  }

  function backToSetup() {
    // If recording, stop first.
    if (running) { window.teardownTone(); }
    setMode('setup');
    renderProfileList();
  }
  // Exposed so the app's footer "Back" button can return to the setup/calibration
  // screen when the trainer is in its live sub-screen (see index.html).
  window.backToToneSetup = backToSetup;

  // =========================================================
  //  CALIBRATION FLOW (modal)
  // =========================================================
  function openCalModal(recalId, onDone) {
    calRecalId = recalId || null;
    calOnDone = (typeof onDone === 'function') ? onDone : null;
    calName = '';
    // Fresh calibration run: start at word 1 with empty accumulators.
    calWordIdx = 0;
    calWordMedians = [];
    calAllFrames = [];
    // Reset steps.
    $('tone-cal-step-name').classList.toggle('hidden', !!recalId);
    $('tone-cal-step-record').classList.toggle('hidden', !recalId);
    $('tone-cal-step-done').classList.add('hidden');
    const nameInput = $('tone-cal-name');
    if (recalId) {
      const p = getProfiles().find(x => x.id === recalId);
      calName = p ? p.name : '';
    } else {
      nameInput.value = '';
      $('tone-cal-name-next').disabled = true;
    }
    renderCalWord();
    resetCalRecordBtn();
    $('tone-cal-modal').classList.remove('hidden');
    if (!recalId) setTimeout(() => { try { nameInput.focus(); } catch (e) {} }, 50);
  }

  // Paint the current calibration WORD (Thai/rom/gloss), the progress label
  // ("Word 1 of 3"), and the prompt. Called on open and after each word finishes.
  // The Thai is wrapped in .th-particle so it's tap-to-hear where the device has
  // Thai TTS (graceful no-op otherwise).
  function renderCalWord() {
    const w = CAL_WORDS[calWordIdx];
    if (!w) return;
    const thaiEl = $('tone-cal-thai');
    if (thaiEl) {
      thaiEl.innerHTML = '<span class="th-particle">' + w.thai + '</span>';
      try {
        if (typeof window.wireThaiTapToSpeak === 'function') {
          window.wireThaiTapToSpeak(thaiEl, '.th-particle');
        }
      } catch (e) {}
    }
    const romEl = $('tone-cal-rom'); if (romEl) romEl.textContent = w.rom;
    const glossEl = $('tone-cal-gloss'); if (glossEl) glossEl.textContent = w.gloss;
    const prog = $('tone-cal-progress');
    if (prog) prog.textContent = 'Word ' + (calWordIdx + 1) + ' of ' + CAL_WORD_COUNT;
    setCalStatus('Tap the Record button and say the word.', '');
  }

  function closeCalModal() {
    stopCalibration(true);
    $('tone-cal-modal').classList.add('hidden');
    try { if (window.tts && window.tts.supported) window.speechSynthesis.cancel(); } catch (e) {}
  }

  // Close the modal and refresh whichever picker opened it. When an external
  // caller (Tone Challenge) supplied a callback, fire that so ITS list updates;
  // otherwise refresh the trainer's own list. The callback is one-shot.
  function finishCalModal() {
    const cb = calOnDone;
    calOnDone = null;
    closeCalModal();
    if (cb) { try { cb(); } catch (e) {} }
    else { renderProfileList(); }
  }

  function calGotoRecord() {
    const nameInput = $('tone-cal-name');
    calName = nameInput.value.trim().slice(0, 10);
    if (!calName) return;
    // Begin the word cycle fresh from the first one.
    calWordIdx = 0;
    calWordMedians = [];
    calAllFrames = [];
    $('tone-cal-step-name').classList.add('hidden');
    $('tone-cal-step-record').classList.remove('hidden');
    renderCalWord();
    resetCalRecordBtn();
  }

  function setCalStatus(text, cls) {
    const el = $('tone-cal-status');
    if (el) { el.textContent = text; el.className = 'tone-cal-status' + (cls ? ' ' + cls : ''); }
  }
  function resetCalRecordBtn() {
    const b = $('tone-cal-rec-btn');
    if (b) {
      b.classList.remove('recording', 'busy');
      b.disabled = false;
      b.innerHTML = '<span class="tone-mic-icon">🎤</span> Record';
    }
  }

  async function onCalRecordTap() {
    if (starting) return;
    if (mode === 'calibrate' && running) { stopCalibration(false); return; }
    await startCalibration();
  }

  async function startCalibration() {
    mode = 'calibrate';
    starting = true;
    try {
      const b = $('tone-cal-rec-btn');
      // The button stays available purely as a manual safety stop (same as the
      // in-game mic button); normally the word auto-stops on its own.
      if (b) { b.classList.add('recording'); b.innerHTML = '<span class="tone-mic-icon">\u23FA</span> Stop'; }
      setCalStatus('Listening\u2026 say the word.', 'recording');

      // Capture this word EXACTLY like the game does, through the same shared
      // engine — so a calibration word is measured by the identical pipeline
      // that will later judge the learner's attempts.
      await getCapture().start({
        // No centre hint here: measuring the centre is the whole point.
        centreHint: 0,
        onFrame: (info) => {
          setCalStatus(info.inSpeech ? 'Listening\u2026 (speaking)' : 'Listening\u2026 say the word.', 'recording');
        },
        onEnd: onCalCaptureEnd
      });
      running = true;
    } catch (err) {
      mode = 'trainer';
      running = false;
      let msg = 'Could not access the microphone.';
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        msg = 'Microphone permission was blocked. Enable it in your browser settings.';
      } else if (err && err.name === 'NotFoundError') {
        msg = 'No microphone was found on this device.';
      }
      setCalStatus(msg, '');
      resetCalRecordBtn();
      releaseMic();
    } finally {
      starting = false;
    }
  }

  // A calibration word finished. Extract its contour with the shared offline
  // pipeline, take its median as this word's mid level, and advance.
  function onCalCaptureEnd(result) {
    running = false;
    mode = 'trainer';
    resetCalRecordBtn();
    if (calCancelled) { calCancelled = false; return; }

    // During calibration the centre is what we are measuring, so there is no
    // profile to lean on — but once the first word is done its median is a good
    // anchor for the ones that follow.
    const calHint = calWordMedians.length ? median(calWordMedians) : 0;
    const cleaned = extractContour(result.frames, result.thresholdRms, calHint);
    if (!cleaned || cleaned.length < MIN_CORE_POINTS) {
      setCalStatus('Didn\u2019t catch that clearly. Tap once and say the word again.', '');
      return;
    }

    const hzFrames = cleaned.map(p => p.hz);
    const wordMedian = median(hzFrames);
    calWordMedians.push(wordMedian);
    calAllFrames = calAllFrames.concat(hzFrames);

    // Success feedback: play the same place-word sound (at its configured volume)
    // and flash a green edge on the word card. Both are optional aids \u2014 the sound
    // is skipped if effects are muted, which is exactly why the visual flash also
    // exists. We then DELAY the next word until the effect finishes, keeping the
    // record button frozen + greyed so nobody taps mid-transition.
    try { if (typeof window.playSound === 'function') window.playSound('snd-sentence-put'); } catch (e) {}
    flashCalSuccess();

    const lastWord = (calWordIdx >= CAL_WORD_COUNT - 1);
    setCalRecBusy(true);
    setTimeout(() => {
      // If the modal was closed/cancelled during the pause, do nothing.
      const modal = $('tone-cal-modal');
      if (!modal || modal.classList.contains('hidden')) { setCalRecBusy(false); return; }
      setCalRecBusy(false);
      if (!lastWord) {
        calWordIdx++;
        renderCalWord();
        const n = CAL_WORD_COUNT, i = calWordIdx + 1;
        setCalStatus('Got it! Word ' + i + ' of ' + n + ' \u2014 tap once and say it.', '');
      } else {
        finalizeCalibration();
      }
    }, CAL_SUCCESS_MS);
  }

  // Stop a calibration capture. cancelled=true means the user backed out, so the
  // result is discarded; cancelled=false is a manual "Stop" tap, which is scored
  // exactly like an auto-stop (the engine's onEnd does the work either way).
  function stopCalibration(cancelled) {
    calCancelled = !!cancelled;
    if (!running) {
      if (cancelled) { try { getCapture().release(); } catch (e) {} mode = 'trainer'; resetCalRecordBtn(); }
      calCancelled = false;
      return;
    }
    getCapture().stop(cancelled ? 'cancel' : 'manual');
  }

  // Brief green-edge flash on the calibration word card (sound-off fallback cue).
  function flashCalSuccess() {
    const card = $('tone-cal-thai') ? $('tone-cal-thai').closest('.tone-cal-sentence') : null;
    if (!card) return;
    card.classList.add('cal-success');
    setTimeout(() => { try { card.classList.remove('cal-success'); } catch (e) {} }, CAL_SUCCESS_MS);
  }

  // Grey out + disable the calibration record button during the success pause.
  function setCalRecBusy(busy) {
    const b = $('tone-cal-rec-btn');
    if (!b) return;
    b.classList.toggle('busy', !!busy);
    b.disabled = !!busy;
  }

  // Compute the profile from the per-word medians. Centre = median of the three
  // word medians (robust to one off word). Range = 10th/90th percentile of all
  // cleaned frames pooled, for the visual reference band.
  function finalizeCalibration() {
    if (calWordMedians.length < CAL_WORD_COUNT || calAllFrames.length < CAL_MIN_SAMPLES) {
      // Something went thin overall — restart the whole short set (3 words).
      calWordIdx = 0;
      calWordMedians = [];
      calAllFrames = [];
      renderCalWord();
      setCalStatus('Didn\u2019t catch enough clear speech. Let\u2019s try the words again.', '');
      return;
    }

    const centerHz = median(calWordMedians.slice().sort((a, b) => a - b));
    const sorted = calAllFrames.slice().sort((a, b) => a - b);
    const pct = (q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
    const lowHz = pct(0.10);
    const highHz = pct(0.90);

    const st = window.state;
    if (!st) return;
    if (calRecalId) {
      const p = getProfiles().find(x => x.id === calRecalId);
      if (p) { p.centerHz = centerHz; p.lowHz = lowHz; p.highHz = highHz; }
    } else {
      if (getProfiles().length >= MAX_PROFILES) { finishCalModal(); return; }
      const prof = {
        id: 'tp_' + Math.random().toString(36).slice(2, 9),
        name: calName,
        centerHz, lowHz, highHz,
        createdAt: Date.now()
      };
      st.toneProfiles = getProfiles().concat([prof]);
      selectedProfileId = prof.id;
      st.toneLastProfileId = prof.id;
    }
    persist();

    // Show success step.
    $('tone-cal-step-record').classList.add('hidden');
    $('tone-cal-step-done').classList.remove('hidden');
    const msg = $('tone-cal-done-msg');
    if (msg) msg.textContent = (calRecalId ? 'Updated' : 'Saved') +
      ' “' + calName + '”. Centre pitch ~' + Math.round(centerHz) + ' Hz.';
  }

  // ---- Public hooks (called by the app's navigate machinery) ----
  window.enterTone = function () {
    wireOnce();
    applyHowtoDefaults();           // re-apply open/closed default each entry
    selectedProfileId = null;       // re-resolve to last-used on each entry
    activeProfile = null;
    clearCapture();
    setStatus('Ready', '');
    setMode('setup');               // always land on the profile picker
    renderProfileList();
  };

  /* Called by index.html just before the "How to use" guide opens over this
     screen, so nothing of ours plays or listens underneath it (the guide plays
     its own recordings). Every step is exactly what the student's own tap
     already does: stop a native example, stop the playback of their last
     attempt, and finish a live practice recording the way a second tap on the
     mic does. A capture still waiting on the permission prompt, and anything
     in calibration, is left alone. Safe when nothing is running. */
  window.toneQuietForGuide = function () {
    try { stopRefPlayback(); } catch (e) {}
    try { if (playing && capture) { capture.stopPlayback(); setPlayState(false); } } catch (e) {}
    try { if (running && mode === 'trainer') stopCapture(); } catch (e) {}
  };

  // Shared calibration entry point for OTHER features (e.g. Tone Challenge) that
  // reuse the same voice profiles + calibration modal. Ensures the modal's
  // controls are wired (the trainer may never have been opened this session),
  // then opens it. `onDone` fires once when the modal closes so the caller can
  // refresh its own profile picker. recalId is a profile id to recalibrate, or
  // null to add a new profile.
  window.openToneCalibration = function (recalId, onDone) {
    try { wireOnce(); } catch (e) {}
    openCalModal(recalId || null, onDone);
  };

  // Shared, DOM-free DSP toolkit so the Tone Challenge can reuse the exact same
  // pitch model as the Tone Trainer (one source of truth — the two modes can
  // never drift apart). The Challenge owns its own thin mic loop + canvas (the
  // mechanical, low-risk plumbing) and calls these pure functions for the
  // accuracy-critical parts. Nothing here touches the trainer's DOM or state.
  window.toneDsp = {
    // Acoustic model
    computeScores: computeToneScores,     // (core, centreHz) -> { sc, m }
    classify: classifyTone,               // (core, centreHz) -> { tone, confidence, ... }
    scoreAttempt: scoreToneAttempt,       // (core, centreHz, targetTone) -> { percent, tone, isTarget, ... }
    // Capture cleaning — offline segmentation + smoothing + de-spiking.
    extractContour: extractContour,       // (frames, thresholdRms) -> core | null
    cleanCapture: cleanCaptureCore,       // legacy alias: (points, thresholdRms) -> core | null
    foldOctave: foldOctave,               // (f, ref) -> corrected hz
    median: median,
    percentile: percentile,
    // THE SHARED CAPTURE ENGINE. The Tone Challenge no longer keeps its own copy
    // of the mic loop, VAD and pitch reader — it drives this, so the two modes
    // cannot drift apart on the capture side the way they previously could.
    createCapture: createToneCapture,
    // Shared by the Tongue Twister module so attempt filenames are sanitised
    // by ONE implementation. Also lets the offline harness test the encoder.
    encodeWav: encodeWav,
    saveBlob: saveBlob,
    safeName: safeName,
    analysisPlanFor: analysisPlanFor,   // window + search band for a given centre
    // Whole-sentence extraction: same cleanup pipeline as extractContour, but
    // keeps every run instead of the loudest one. Callers MUST pass centreHint.
    extractUtterance: extractUtterance,
    resolveVadPolicy: resolveVadPolicy, // exposed so callers can see the defaults
    // Pitch detector factory (Pitchy is a module import, unreachable from a
    // classic script; kept for any external caller that still wants one).
    createDetector: function (fftSize) {
      var det = PitchDetector.forFloat32Array(fftSize || WIN_WIDE);
      det.clarityThreshold = MPM_K;
      return det;
    },
    // Reference shapes + ordering + tuning constants (kept in lockstep)
    TONE_REFS: TONE_REFS,
    TONE_ORDER: TONE_ORDER,
    config: {
      HOP_MS, WIN_NARROW, WIN_WIDE, FFT_SIZE, MPM_K, CLARITY_MIN, F0_MIN, F0_MAX,
      SEMITONE_SPAN, MAX_GAP_MS, AUTO_STOP_SILENCE_MS, NO_SPEECH_TIMEOUT_MS,
      MAX_CAPTURE_MS, MEDIAN_WINDOW, MEDIAN_WINDOW_LONG,
      NOISE_SAMPLE_MS, ENERGY_MARGIN_DB, MIN_FLOOR_RMS, MAX_FLOOR_RMS,
      SPEECH_START_MS, SPEECH_END_MS, MIN_SPEECH_MS, MIN_VOICED_FRAMES,
      MIN_CORE_POINTS, MERGE_GAP_MS, MAX_ST_PER_MS, MIN_STEP_ST,
      MAX_CAPTURE_HARD_MS
    }
  };

  window.teardownTone = function () {
    // Stop whichever loop is live and release the mic.
    stopRefPlayback();
    if (running) {
      running = false;
      releaseMic();
      if (elMicBtn) {
        elMicBtn.classList.remove('recording');
        const lbl = elMicBtn.querySelector('.tone-mic-label');
        if (lbl) lbl.textContent = 'Tap to speak';
      }
      resetCalRecordBtn();
    } else {
      releaseMic();
    }
    mode = 'trainer';
    // Close the calibration modal if it was open.
    const m = $('tone-cal-modal');
    if (m) m.classList.add('hidden');
  };
})();
