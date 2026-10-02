# Prototype: data-driven tone classifier on engine contours, honest
# leave-one-speaker-out (LOSO) evaluation, with calibration-error sweep.
import json, numpy as np
import os
R = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'results.json')))
TONES = ['mid', 'low', 'falling', 'high', 'rising']
SR = '48000'
run = R['runs'][SR]
toks = []
for name, sp in run['speakers'].items():
    for r in sp['res']:
        toks.append(dict(spk=name, y=TONES.index(r['label']), s=np.array(r['semis']), eng=r['tone']))
offs = R['offsets']

def resample(s, K=20):
    x = np.linspace(0, 1, len(s)); xi = np.linspace(0, 1, K)
    return np.interp(xi, x, s)

def robust(s):
    # Light cleanup the engine doesn't do: median-of-5, then clamp isolated
    # octave jumps (>7 st away from local median) back to the local median.
    s = np.array(s, float); n = len(s); out = s.copy()
    for i in range(n):
        lo, hi = max(0, i - 3), min(n, i + 4)
        med = np.median(s[lo:hi])
        if abs(s[i] - med) > 7: out[i] = med
    return out

def feats(s, shift=0.0, drop_tail=0.0):
    s = robust(s) - shift
    if drop_tail: s = s[:max(4, int(round(len(s) * (1 - drop_tail))))]
    v = resample(s, 20)
    k = np.arange(20)
    dct = [np.mean(v * np.cos(np.pi * j * (k + 0.5) / 20)) for j in range(4)]
    return np.array(dct)

def fit_lda(X, y, shrink=0.1):
    mus = np.array([X[y == c].mean(0) for c in range(5)])
    Sw = sum(np.cov((X[y == c] - mus[c]).T, bias=True) * (y == c).sum() for c in range(5)) / len(y)
    Sw = (1 - shrink) * Sw + shrink * np.eye(X.shape[1]) * np.trace(Sw) / X.shape[1]
    return mus, np.linalg.inv(Sw)

def predict(model, X):
    mus, P = model
    d = np.array([[(x - m) @ P @ (x - m) for m in mus] for x in X])
    ll = -0.5 * d
    p = np.exp(ll - ll.max(1, keepdims=True)); p /= p.sum(1, keepdims=True)
    return d.argmin(1), p

spks = sorted(set(t['spk'] for t in toks))
y = np.array([t['y'] for t in toks])

def loso(feat_fn, test_shift=0.0):
    pred = np.zeros(len(toks), int); post = np.zeros(len(toks))
    for sp in spks:
        tr = [i for i, t in enumerate(toks) if t['spk'] != sp]
        te = [i for i, t in enumerate(toks) if t['spk'] == sp]
        Xtr = np.array([feat_fn(toks[i]['s'], 0.0) for i in tr])
        model = fit_lda(Xtr, y[tr])
        Xte = np.array([feat_fn(toks[i]['s'], test_shift) for i in te])
        p, pp = predict(model, Xte)
        pred[te] = p; post[te] = pp[np.arange(len(te)), p]
    return pred, post

print('Current engine, correct/50 by calibration offset (from sweep):')
eng_row = {o: sum(1 for name, sp in run['speakers'].items() for r in sp['res'] if r['sweep'][offs.index(o)] == r['label']) for o in offs}
print('  ' + '  '.join(f'{o:+.1f}:{eng_row[o]}' for o in offs if abs(o * 2 - round(o * 2)) < 1e-9))

for name, fn in [('LDA on DCT0-3 of contour (st re centre)', lambda s, sh: feats(s, sh)),
                 ('  same, ignoring last 15% (creak/release)', lambda s, sh: feats(s, sh, 0.15))]:
    row = []
    for o in [x / 2 for x in range(-6, 7)]:
        # Calibration error of +o st means the centre is too HIGH by o, so the
        # contour reads o st LOWER: shift = +o.
        p, _ = loso(fn, o)
        row.append(f'{o:+.1f}:{(p == y).sum()}')
    print(name); print('  ' + '  '.join(row))

p, post = loso(lambda s, sh: feats(s, sh, 0.15))
print('\nLOSO errors at true calibration (LDA, last 15% ignored):')
for i, t in enumerate(toks):
    if p[i] != t['y']: print(f"  {t['spk']:14s} {TONES[t['y']]:8s} -> {TONES[p[i]]:8s} (p={post[i]:.2f})   engine said {t['eng']}")
cm = np.zeros((5, 5), int)
for a, b in zip(y, p): cm[a, b] += 1
print('confusion (rows=true M L F H R):'); print(cm)

print('\n--- Speaker normalisation variants (LOSO, LDA, last 15% ignored) ---')
def spk_stats(spk):
    allv = np.concatenate([robust(t['s'])[:max(4, int(round(len(t['s']) * 0.85)))] for t in toks if t['spk'] == spk])
    return allv.mean(), allv.std(), np.percentile(allv, 5), np.percentile(allv, 95)
stats = {sp: spk_stats(sp) for sp in spks}
for sp in spks:
    mu, sd, p5, p95 = stats[sp]
    print(f'  {sp:14s} mean of all 5 tones re mid-calibration {mu:+.2f} st   sd {sd:.2f}   5-95% range {p95 - p5:.1f} st')

def loso_norm(norm, test_shift=0.0):
    pred = np.zeros(len(toks), int)
    F = lambda i, sh: feats(norm(toks[i], sh), 0.0, 0.15)
    for sp in spks:
        tr = [i for i, t in enumerate(toks) if t['spk'] != sp]
        te = [i for i, t in enumerate(toks) if t['spk'] == sp]
        model = fit_lda(np.array([F(i, 0.0) for i in tr]), y[tr])
        p, _ = predict(model, np.array([F(i, test_shift) for i in te]))
        pred[te] = p
    return pred
variants = {
  'mid-anchored, semitones (current units)':      lambda t, sh: t['s'] - sh,
  'mid-anchored, scaled by speaker range (sd)':   lambda t, sh: (t['s'] - sh) / stats[t['spk']][1] * 4.0,
  'all-tone mean anchored (no mid cal needed)':   lambda t, sh: t['s'] - stats[t['spk']][0],
  'all-tone z-score (mean & sd from 5 tones)':    lambda t, sh: (t['s'] - stats[t['spk']][0]) / stats[t['spk']][1] * 4.0,
}
for k, fn in variants.items():
    row = [f'{o:+.1f}:{(loso_norm(fn, o) == y).sum()}' for o in [-2, -1, 0, 1, 2]]
    print(f'  {k:46s} ' + '  '.join(row))
