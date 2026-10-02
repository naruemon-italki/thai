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
node report.mjs results/results-v2.json out/results-new.json   # before/after + every changed word
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
| native | partner: `mid/low/falling/high/rising_female.mp3` | 18 |
| native | native male: `*_male.mp3` | 25 |
| learner | beginner learner: `*_male-2.mp3` (labels = the tone he *intended*) | 14 |
| volume | `Female7_maa-LOUD` (same file, +7 dB) | 5 |
| examples | the 19 example-button mp3s + their baked contours | 19 |

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

`results/compare-v1-v2.txt` is the full before/after. Headline (123 native
words, 48 kHz):

| | v1 | v2 |
|---|---|---|
| accuracy at calibrated centre | 99 (80.5%) | 118 (95.9%) |
| … unseen speakers (leave-one-speaker-out) | — | 116 (94.3%) |
| calibration off by −1 / +1 st | 86 / 98 | 115 / 117 |
| calibration off by −2 / +2 st | 66 / 90 | 106 / 113 |
| speakers robust to ±1 st calibration error | 3 / 18 | 11 / 18 |
| calibrations an octave (or more) wrong | 2 / 20 | 0 / 20 |
| wrong answers shown as "Clear" | 13 of 24 | 2 of 5 |
| Challenge: wrong tone scoring Good or better | 9.8% | 0.6% |
| Challenge: right tone scoring Good or better | 87% | 94% |
| pitch frames > 3 st off Praat | 3.98% | 0.61% |

The v2 model was trained on these natives, so 118 is partly in-sample; the
leave-one-speaker-out figure (116) is the honest estimate for a new voice.

## Retraining the model

```sh
node train.mjs --dry     # leave-one-speaker-out evaluation only
node train.mjs           # also writes the model into ../tone-trainer.js and model/tone-model.json
```

Retrain whenever the front end (pitch path, trimming, calibration) changes, or
new native recordings are added to `corpus.mjs`. Only `group: 'native'`
speakers are used for training. Features come from the engine's own
`toneFeatures()`, so training and the app cannot disagree.

## Other tools

- `pitchcheck.mjs` — engine contour vs Praat frame by frame, and calibrated
  centre vs Praat (needs `node export-takes.mjs && python3 py/praat_ref.py`)
- `side.mjs SPK IDX CENTRE` — one word, engine vs Praat, with NSDF candidates
- `dbg.mjs SPK IDX CENTRE` — one word's raw frames and runs
- `fidelity.mjs` — the frozen v1 engine re-derives the baked example contours
  (proves the bench reproduces the app)
- `experiments/classifier-search.mjs` — the feature/model search behind v2
  (needs `TRIMS=creak,release,reversal NOSWEEP=1 SRS=48000 LABEL=t_all node run.mjs`
  and the same with `SRS=44100 LABEL=t_all44`)

## Baseline

`baseline/v1/` holds the engine and Challenge exactly as they were before v2,
and `results/results-v1.json` their results on the full corpus. Compare any
future version against `results/results-v2.json` (or v1).
