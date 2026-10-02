# tone-lab — offline test bench for the Tone Trainer engine

Runs the **real, unmodified `tone-trainer.js`** in Node, feeding it mp3s
through a fake microphone. Nothing is re-implemented: the same capture engine,
live VAD, octave path, contour cleaning and `classifyTone()` the app ships are
what analyse the audio here. Calibration is simulated the way the app does it
(three captures, `centreHint: 0`, median of word medians).

Fidelity check: on the 19 example words, the harness reproduces the contours
baked into `TONE_WORDS` to within 0.00–0.01 semitones at 44.1 kHz.

## Requirements

- Node 18+ and `ffmpeg` on the PATH (used only to decode mp3 → PCM)
- Optional, for the Python scripts: `pip install numpy praat-parselmouth`

## Run

```sh
cd tone-lab
node fidelity.mjs          # harness == app? (re-derives the baked example contours)
node run.mjs               # main experiment, ~2.5 min -> out/results.json
node report.mjs            # human-readable report (see baseline/)
node challenge-sweep.mjs   # does the Challenge's ±1.5 st centre sweep accept wrong tones?
node export-takes.mjs      # writes each test word as WAV exactly as the engine heard it
python3 py/praat_compare.py   # engine pitch vs Praat, frame by frame
python3 py/proto_lda.py       # prototype statistical classifier, leave-one-speaker-out
```

`ENGINE=/path/to/other/tone-trainer.js node run.mjs` tests a modified engine
against the same corpus, and `SRS=48000` limits the run to one sample rate.

## What run.mjs does

For each speaker file (5 words: mid, low, falling, high, rising):

1. Splits the file into words by energy (Male4 has hand-set cut points).
2. Builds a realistic "take" per word: 450 ms of mic noise, the word, trailing
   noise, so the live VAD, auto-stop and noise floor all behave as on a phone.
3. Calibrates the speaker the app's way, using their own mid-tone word.
4. Classifies all five words at that centre.
5. Re-runs every word with the centre shifted −3…+3 semitones in 0.25 steps,
   so you can see how much calibration error each word tolerates.

Both 48 kHz (most phones) and 44.1 kHz are run, because the analysis window is
a fixed number of samples and the results differ slightly between the two.

## Report strips

```
   high     máa   ##########RR|RRRRRRRRRRRRR  -> rising
```

One character per centre offset from −3 to +3 st; `|` marks the calibrated
centre; `#` = correct, otherwise the first letter of the wrong answer.
