# tone-lab — offline test bench for the Tone Trainer engine

Runs the **real `tone-trainer.js`** (and the Challenge's scoring code from
`tone-challenge.js`) in Node, feeding the corpus mp3s through a fake
microphone. Nothing is re-implemented: the app's own capture engine, live
VAD, pitch path, contour cleaning, calibration steps and tone model analyse
the audio. Any engine version can be tested, so every change is measured
against the frozen v1 baseline.

## Requirements

- Node 18+ and `ffmpeg` on the PATH (mp3 → PCM)
- Optional: `pip install numpy praat-parselmouth` for the Praat pitch check

## Everyday workflow

```sh
cd tone-lab
LABEL=new node run.mjs                                    # ~2 min -> out/results-new.json
node report.mjs results/results-v2.1.json out/results-new.json # before/after + every changed word
node twister-invariance.mjs                               # Tongue Twister path must stay identical
node ui-flow.mjs                                          # drives the real calibration modal + Trainer UI
```

`report.mjs` with one file prints that run in full (per-word strips across
calibration errors); with two files it prints a before/after comparison and
lists every word that was **fixed** or **broken**.

## The corpus (`corpus.mjs`)

| Group | What | Words |
|---|---|---|
| native | 16 speakers saying one syllable in all 5 tones (`Female1..11`, `Male1..5`) | 80 |
| native, holdout | 4 more such speakers (`Female12..15`), added AFTER the v2 model was trained | 20 |
| native | partner: `mid/low/falling/high/rising_female.mp3` | 18 |
| native | native male: `*_male.mp3` | 25 |
| learner | beginner learner: `*_male-2.mp3` (labels = the tone he *intended*) | 14 |
| native | partner: `pom.mp3`, `chan.mp3` (slow, lesson-style rising tones; set `new2`, not used for training) | 2 |
| learner, app | attempts exported from the app with "Save attempt" (used as-is, judged at the profile centre in the file name): `tone_trainer_138_high_1801.wav`, `mistake-1/2/3.wav` | 4 |
| volume | `Female7_maa-LOUD` (same file, +7 dB) | 5 |
| examples | the 19 example-button mp3s (`audio/tone-words/`) + their baked contours | 19 |

To add an app attempt, list it under `L1app` (or a new `kind: 'takes'` speaker)
in `corpus.mjs` with the tone that was intended.

Every speaker is calibrated **the app's way** (three mid-tone captures through
the engine's own `calibrationWord` / `finalizeCalibration`, including the
"one more word" request). Each word is then captured with 450 ms of room
noise before it and auto-stop after it, exactly as on a phone, at 48 kHz and
44.1 kHz.

## Metrics (`metrics.mjs`)

- native accuracy at the calibrated centre, by tone, at both sample rates
- accuracy when the calibration is off by −2 … +2 semitones
- speakers whose every word survives any calibration error within ±1 st
- same verdict at 44.1 vs 48 kHz; same verdict at normal vs +7 dB
- wrong answers shown as "Clear" / right answers shown as "Unsure"
- Tone Challenge: score for the tone actually said vs for every other tone
- the 19 example buttons must read correct and Clear
- learner verdicts (reported, not scored)

## Results

`results/compare-v1-v2.txt` is the full before/after. Headline (143 native
words from 22 speakers, 48 kHz):

| | v1 | v2 |
|---|---|---|
| accuracy at calibrated centre | 118 (82.5%) | 138 (96.5%) |
| … the 4 holdout speakers the v2 model never saw | 19 / 20 | 20 / 20 |
| … every speaker unseen (leave-one-speaker-out over all 22) | — | 136 (95.1%) |
| calibration off by −1 / +1 st | 99 / 117 | 135 / 137 |
| calibration off by −2 / +2 st | 76 / 107 | 123 / 133 |
| calibrations an octave (or more) wrong | 2 / 24 | 0 / 24 |
| wrong answers shown as "Clear" | 14 of 25 | 2 of 5 |
| Challenge: wrong tone scoring Good or better | 9.3% | 0.5% |
| Challenge: right tone scoring Good or better | 88% | 95% |
| pitch frames > 3 st off Praat (first 20 speakers) | 3.98% | 0.61% |

### v2.1: rising tones that turn up early

Native speakers hold a rising tone low until ~65% of the word and only then
go up. Learners usually turn up much earlier (at 35-50%), and the v2 model,
which had never seen such a rise, called a 12-15 st climb from well below
the centre "high" (`mistake-1.wav`, which the partner heard as หมา "dog";
`mistake-3.wav`; the earlier pom). v2.1 trains the rising class on two extra
copies of every native rising tone with its time axis warped so the turn
comes earlier (u → u^1.4 and u^1.8: turn at ~55% and ~46%). The copies shape
only the rising class: the other four tones' models are bit-for-bit those of
v2, and training uses the same 18 speakers, so the 5 later voices stay an
honest test (`experiments/rise-shape.mjs` has the search).

`results/compare-v2-v2.1.txt` (both engines on the current corpus):

| | v2 | v2.1 |
|---|---|---|
| native words right at the calibrated centre (145) | 140 | 140, the same words |
| … unseen speakers (leave-one-speaker-out, 23 speakers) | 138 | 138 |
| calibration off by −1 / +1 st | 137 / 139 | 137 / 139 |
| calibration off by −2 / +2 st | 124 / 135 | 123 / 134 |
| Challenge: right tone Good+ / wrong tone Good+ | 95.2% / 0.5% | 95.2% / 0.5% |
| example buttons right and Clear | 19 / 19 | 19 / 19 |
| learner rising attempts read as rising (6) | 2 | 6 |
| learner high / falling attempts unchanged | | yes |
| Tongue Twister (168 syllables) | 138 | 138, no attempt changed |

The cost: one native high tone that starts low (Female3) reads as rising
when the calibration is 1.5-2 st too high; one native rising tone (Female13)
reads as high at −2 st, and two other native words go the other way.

The learner's app attempts at his 138 Hz profile (48 kHz):

| attempt | intended | v2 | v2.1 |
|---|---|---|---|
| `tone_trainer_138_high_1801.wav` (pom) | rising | high 99% Clear | rising 70% Likely |
| `mistake-1.wav` (หมา) | rising | high 65% Likely | rising 96% Clear |
| `mistake-2.wav` (ม้า) | high | falling 97% Clear | falling 97% Clear |
| `mistake-3.wav` (ฉัน) | rising | high 67% Likely | rising 99% Clear |

`mistake-2` is left as falling on purpose: the voice rises to +9.5 st and
then drops 7.8 st *at full loudness* (within 2 dB of the loudest point, so
it is not a trailing release the trimmer missed). No native high tone in the
corpus drops more than 2.2 st from its peak, while native falling tones with
exactly this rise-then-fall shape exist (Female10, Male4).

Decisions recorded by experiments (October 2026, after the holdout test):
- Retraining on all 22 speakers changed nothing measurable (138/143 either
  way, one word fixed and one broken), so the tested model was kept.
- Heavier-tailed class models (`experiments/student-t.mjs`) did not change
  native accuracy and only softened in-between learner productions from
  ~99% to ~88%, so the Gaussian model was kept.

## Retraining the model

```sh
node train.mjs --dry     # leave-one-speaker-out evaluation only
node train.mjs           # also writes the model into ../tone-trainer.js and model/tone-model.json
```

Retrain whenever the front end (pitch path, trimming, calibration) changes, or
new native recordings are added to `corpus.mjs`. Only `group: 'native'`
speakers are used for training, and by default only the 18 that v2 was built
from (`ALL_SPEAKERS=1` adds the holdout sets). Every native rising tone is
also added time-warped (v2.1; `AUG_GAMMA=` with nothing after it trains
without). Features come from the engine's own `toneFeatures()`, so training
and the app cannot disagree.

## Other tools

- `pitchcheck.mjs` — engine contour vs Praat frame by frame, and calibrated
  centre vs Praat (needs `node export-takes.mjs && python3 py/praat_ref.py`)
- `side.mjs SPK IDX CENTRE` — one word, engine vs Praat, with NSDF candidates
- `dbg.mjs SPK IDX CENTRE` — one word's raw frames and runs
- `fidelity.mjs` — the frozen v1 engine re-derives the baked example contours
  (proves the bench reproduces the app)
- `experiments/dump-contours.mjs` + `experiments/rise-shape.mjs` — the
  augmentation search behind v2.1 (seconds per variant once the contours are
  dumped)
- `experiments/classifier-search.mjs` — the feature/model search behind v2
  (needs `TRIMS=creak,release,reversal NOSWEEP=1 SRS=48000 LABEL=t_all node run.mjs`
  and the same with `SRS=44100 LABEL=t_all44`)

## Baseline

`baseline/v1/` and `baseline/v2/` hold the engine and Challenge exactly as
they were before v2 and before v2.1; `results/results-v1.json`,
`results/results-v2.json` (the corpus as it was then) and
`results/results-v2-corpus2.json` (v2 on the current corpus) their results.
Compare any future version against `results/results-v2.1.json`.

## Tongue Twister bench (`twister/`)

Scores the native sentence recordings exactly as the Twister mode does:
`tongue-twister.js` and `tone-trainer.js` run together, every attempt goes
through the Twister's own capture (its VAD policy and pace watcher), and then
`analyse()` — the same call `onCaptureEnd` makes. `twister/ttexp.mjs` checks
that its switchable re-implementation reproduces the app's `analyse()` exactly
(54/54 attempts) before any variant is compared.

```sh
LABEL=new node twister/ttrun.mjs                                   # ~1 min
node twister/ttreport.mjs results/tt-results-v2.json out/tt-results-new.json
node twister/ttdbg.mjs moo.ref 0                                   # one attempt in detail
```

Corpus (`twister/ttcorpus.mjs`): the 8 shipped reference tracks, 12 native
alternatives, and two files said slow / medium / fast — 25 attempts, 168
syllables in the main set, plus 4 fast attempts reported apart (the speaker's
own note: at that speed the tones are gone). Multi-attempt files are split at
the speaker's long pauses. These speakers never calibrated in the app, so
each one's centre is estimated independently of any engine
(`py/tt_centre.py`: Praat median pitch, corrected for the sentence's tone
mix; committed as `twister/centres.json`), and every attempt is also scored
with that centre off by ±1 and ±2 semitones. App exports from the Twister's
"Save attempt" button can be added as `raw` entries (see the corpus file).

Results (`results/tt-compare-v1-v2.txt`):

| syllables right (of 168) | 44.1 kHz | 48 kHz | same verdict at both rates |
|---|---|---|---|
| Twister v1 | 137 (81.5%) | 135 (80.4%) | 158 / 188 |
| Twister v2 | 137 (81.5%) | 138 (82.1%) | 163 / 188 |

Twister v2 changes one thing: the sentence pitch path now uses the
subharmonic fix from the single-word path (`toneDsp.sentencePath`), which
makes the shipped `moo` and `kao` reference tracks read correctly on 48 kHz
phones. It also passes the capture's real noise threshold to `analyse()`
(the old code read a field that did not exist; no effect on this corpus).

What was tried and NOT adopted, with the numbers (`twister/ttexp.mjs`,
`twister/ttmodel-exp.mjs`, `twister/ttpath-exp.mjs`):
- The single-word v2 model on sentence syllables: 52-63%. Natives compress
  their tones in sentences (tonal undershoot): low sits at −2.0 st instead of
  −4.4, high at +0.7 instead of +3.2 and almost flat, rising barely rises
  inside its own syllable. Scaling the contours ×2 first: 68%.
- A model trained on these sentence syllables (leave-one-recording-out):
  64-68%. ~170 syllables are not enough; the Twister's hand-tuned rules use
  sentence context (register rank, declination) and stay best at ~81%.
- The full single-word pitch path for sentences: more robust to calibration
  error but broke the shipped `saao` track, because between syllables the
  voice legitimately jumps 9-12 st across a consonant, which the single-word
  leap cost treats as impossible.
The lever for the Twister is now data: native AND learner attempts, ideally
with a native's note of what she heard on each learner syllable.
