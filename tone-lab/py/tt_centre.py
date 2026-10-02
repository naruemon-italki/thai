# Engine-independent register estimate per Tongue Twister recording:
# Praat median F0 of the (first) attempt, shifted by the mean expected height
# of that sentence's tones (TONE_REFS means), so a sentence full of rising or
# low syllables does not drag the "mid" estimate. -> out/tt/centres.json
import json, os, numpy as np, parselmouth
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'tt')
idx = json.load(open(os.path.join(OUT, 'index.json')))
REF_MEAN = {'mid': -0.37, 'low': -3.15, 'falling': 0.95, 'high': 2.28, 'rising': -0.67}
res = {}
for e in idx:
    if e['id'] in res: continue          # one profile per speaker/file: its first attempt
    s = parselmouth.Sound(os.path.join(OUT, e['wav']))
    f = s.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=700).selected_array['frequency']; f = f[f > 0]
    lo, hi = np.percentile(f, 35) * 0.72, np.percentile(f, 65) * 1.9
    f = s.to_pitch_ac(time_step=0.01, pitch_floor=lo, pitch_ceiling=hi).selected_array['frequency']; f = f[f > 0]
    exp = np.mean([REF_MEAN[t] for t in e['tones']])
    res[e['id']] = round(float(np.median(f) * 2 ** (-exp / 12)), 1)
    print(f"{e['id']:12s} median {np.median(f):6.1f} Hz  tone-mix {exp:+.2f} st  -> centre {res[e['id']]}")
json.dump(res, open(os.path.join(OUT, 'centres.json'), 'w'))
