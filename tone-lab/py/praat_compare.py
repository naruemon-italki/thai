import json, numpy as np, parselmouth
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out')
meta = json.load(open(os.path.join(OUT, 'takes', 'meta.json')))
out = []
tot_frames = tot_gross = 0
for m in meta:
    snd = parselmouth.Sound(m['file'])
    # Two-pass speaker-adaptive range (Hirst): wide first pass, then q25*0.75 .. q75*1.5
    p1 = snd.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=600)
    f1 = p1.selected_array['frequency']; f1 = f1[f1 > 0]
    lo, hi = (np.percentile(f1, 25) * 0.75, np.percentile(f1, 75) * 2.0) if len(f1) > 5 else (60, 600)
    p = snd.to_pitch_ac(time_step=0.005, pitch_floor=max(50, lo), pitch_ceiling=min(700, hi), very_accurate=True)
    ts = p.xs(); f = p.selected_array['frequency']
    eng = np.array(m['engine'])
    diffs = []
    for t_ms, hz in eng:
        k = int(round((t_ms / 1000 - ts[0]) / 0.005))
        if 0 <= k < len(f) and f[k] > 0:
            diffs.append(12 * np.log2(hz / f[k]))
        else:
            diffs.append(np.nan)
    d = np.array(diffs)
    valid = ~np.isnan(d)
    gross = int(np.sum(np.abs(d[valid]) > 3))
    tot_frames += int(valid.sum()); tot_gross += gross
    # Praat contour over the same span as the engine's, for later use
    t0, t1 = eng[0][0] / 1000, eng[-1][0] / 1000
    sel = (ts >= t0 - 0.0001) & (ts <= t1 + 0.0001) & (f > 0)
    out.append(dict(file=m['file'], speaker=m['speaker'], label=m['label'], detected=m['detected'],
                    n=len(eng), valid=int(valid.sum()), gross=gross,
                    med_abs=float(np.nanmedian(np.abs(d))) if valid.any() else None,
                    worst=[round(float(x), 1) for x in d[valid][np.argsort(-np.abs(d[valid]))][:3]],
                    praat=[[float(a)*1000, float(b)] for a, b in zip(ts[sel], f[sel])]))
json.dump(out, open(os.path.join(OUT, 'praat.json'), 'w'))
print(f'engine vs praat: {tot_gross}/{tot_frames} frames differ by >3 st ({100*tot_gross/tot_frames:.1f}%)')
for o in out:
    if o['gross'] > 0 or o['label'] != o['detected']:
        print(f"{os.path.basename(o['file']):34s} {o['label']:8s}->{o['detected']:8s} gross {o['gross']:2d}/{o['valid']:3d}  median|d| {o['med_abs']:.2f}  worst {o['worst']}")
