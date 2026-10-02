# Praat reference pitch for every exported take (two-pass, speaker-adaptive
# floor/ceiling: 0.72*q35 .. 1.9*q65, Hirst 2011). -> out/praat-ref.json
import json, os, numpy as np, parselmouth
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out')
idx = json.load(open(os.path.join(OUT, 'takes', 'index.json')))
by_spk = {}
for e in idx: by_spk.setdefault(e['spk'], []).append(e)
ref = {}
for spk, items in by_spk.items():
    snds = [parselmouth.Sound(os.path.join(OUT, 'takes', e['wav'])) for e in items]
    allf = np.concatenate([s.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=700).selected_array['frequency'] for s in snds])
    allf = allf[allf > 0]
    lo, hi = np.percentile(allf, 35) * 0.72, np.percentile(allf, 65) * 1.9   # Hirst (2011)
    for e, s in zip(items, snds):
        p = s.to_pitch_ac(time_step=0.005, pitch_floor=max(50, lo), pitch_ceiling=min(800, hi), very_accurate=True)
        ref[f"{spk}/{e['i']}"] = dict(t0=float(p.xs()[0]), dt=0.005, f=[round(float(x), 1) for x in p.selected_array['frequency']])
    print(spk, f'floor {lo:.0f} ceiling {hi:.0f}')
json.dump(ref, open(os.path.join(OUT, 'praat-ref.json'), 'w'))
