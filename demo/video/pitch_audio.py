"""Cue sheet + original soundtrack for the tourty pitch video.

Everything is synthesized here (no samples, no licensed music): marimba, pad, bass,
drums and sound effects, placed on the same cue times the video animation uses.
Writes cues.json (read by the video build) and pitch-audio.wav.
"""
import json
import math
import sys
import wave

import numpy as np

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
SR = 44100
DUR = 50.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM          # 0.5 s
BAR = 4 * BEAT           # 2 s
rng = np.random.default_rng(7)

# ------------------------------------------------------------------ cue sheet (seconds)
# Map route timing must match the video: progress r = inOut((t - MAP_A) / (MAP_B - MAP_A)).
MAP_A, MAP_B = 24.0, 28.5
PLACES = {'airport': (7.18, 79.88), 'sigiriya': (7.957, 80.76), 'kandy': (7.29, 80.63), 'nuwara': (6.97, 80.78),
          'ella': (6.87, 81.05), 'yala': (6.37, 81.4), 'mirissa': (5.95, 80.46), 'galle': (6.03, 80.22)}
STOPS = ['sigiriya', 'kandy', 'nuwara', 'ella', 'yala', 'mirissa', 'galle']


def xy(k):
    lat, lon = PLACES[k]
    return np.array([(lon - 79.45) * 100, (9.95 - lat) * 100])


def quad_len(p0, p2):
    c = (p0 + p2) / 2 + np.array([-(p2 - p0)[1], (p2 - p0)[0]]) * 0.2
    ts = np.linspace(0, 1, 200)[:, None]
    pts = (1 - ts) ** 2 * p0 + 2 * (1 - ts) * ts * c + ts ** 2 * p2
    return float(np.sum(np.linalg.norm(np.diff(pts, axis=0), axis=1)))


keys = ['airport'] + STOPS + ['airport']
seg = [quad_len(xy(keys[i]), xy(keys[i + 1])) for i in range(len(keys) - 1)]
cum = np.cumsum(seg) / np.sum(seg)


def in_out(x):
    # gentle sine ease: steady travel so pins arrive evenly (the video uses the same curve)
    return 0.5 - 0.5 * math.cos(math.pi * min(1.0, max(0.0, x)))


def time_for_progress(target):
    for t in np.arange(MAP_A, MAP_B, 0.001):
        if in_out((t - MAP_A) / (MAP_B - MAP_A)) >= target:
            return round(float(t), 3)
    return MAP_B


pin_times = [time_for_progress(float(c)) for c in cum[:len(STOPS)]]

CUES = {
    'hook': [0.25, 1.0, 1.75],
    'tags': [4.0, 4.5, 5.0, 5.5, 6.0, 6.5],
    'tooMany': [7.0, 7.5],
    'riser': [8.0, 10.0],
    'drop': 10.0,
    'tagline': 11.0,
    'sub': 12.4,
    'scenes': [14.0, 18.0, 23.0, 30.0, 34.0, 38.0, 42.0, 46.0],
    'oneApp': [14.4, 15.0],
    'tap': 19.5,
    'sent': 20.0,
    'stamp': 21.0,
    'map': [MAP_A, MAP_B],
    'pins': pin_times,
    'cards': [30.5, 31.3, 32.1],
    'tuk': [34.3, 35.8],
    'horn': 35.0,
    'opts': [35.8, 36.2, 36.6],
    'pick': 37.0,
    'status': [39.0, 39.8],
    'notifs': [40.3, 41.0],
    'why': [42.3, 42.7, 43.5, 44.4],
    'end': 46.0,
    'endText': [46.8, 47.6, 48.2],
    'duration': DUR,
}
json.dump(CUES, open(f'{OUT}/cues.json', 'w'), indent=1)

# ------------------------------------------------------------------ synth helpers
L = np.zeros(N)
R = np.zeros(N)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(sig, t, gain=1.0, pan=0.0):
    """Add a mono signal at time t (seconds), pan -1..1."""
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    lg = gain * math.cos((pan + 1) * math.pi / 4)
    rg = gain * math.sin((pan + 1) * math.pi / 4)
    L[i:i + len(sig)] += sig * lg
    R[i:i + len(sig)] += sig * rg


def tvec(d):
    return np.arange(int(d * SR)) / SR


def lowpass(x, cutoff):
    """One-pole low-pass; cutoff may be a scalar or a per-sample array."""
    y = np.zeros_like(x)
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def env_ad(t, attack, decay_rate):
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t * decay_rate)


def marimba(m, d=0.9, bright=1.0):
    t = tvec(d)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 18) + 0.12 * np.sin(2 * np.pi * 10 * f * t) * np.exp(-t * 40)
    return s * env_ad(t, 0.003, 6.5)


def pad(notes, d, detune=0.0):
    t = tvec(d)
    s = np.zeros_like(t)
    for m in notes:
        f = midi(m) * (1 + detune)
        for h, a in ((1, 1.0), (2, 0.35), (3, 0.18), (4, 0.08)):
            s += a * np.sin(2 * np.pi * f * h * t + h)
    e = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.4)
    return s * np.clip(e, 0, 1) / len(notes)


def bass(m, d=0.45):
    t = tvec(d)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t) + 0.15 * np.sin(2 * np.pi * 3 * f * t)
    return s * env_ad(t, 0.004, 3.5)


def kick():
    t = tvec(0.35)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) + 0.15 * rng.standard_normal(len(t)) * np.exp(-t * 120)


def clap():
    t = tvec(0.25)
    n = rng.standard_normal(len(t))
    n = n - lowpass(n, 900)
    burst = sum(np.exp(-np.maximum(0, t - o) * 90) * (t >= o) for o in (0, 0.011, 0.022))
    return n * (0.6 * burst + 0.5 * np.exp(-t * 18))


def hat(d=0.06, rate=70):
    t = tvec(d)
    n = rng.standard_normal(len(t))
    n = n - lowpass(n, 6000)
    return n * np.exp(-t * rate)


def crash():
    t = tvec(2.2)
    n = rng.standard_normal(len(t))
    n = n - lowpass(n, 3500)
    return n * np.exp(-t * 2.4)


# sound effects
def pop(p=1.0):
    t = tvec(0.12)
    f = (1150 - 650 * np.minimum(1, t / 0.07)) * p
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32)


def click():
    t = tvec(0.03)
    n = rng.standard_normal(len(t))
    return (n - lowpass(n, 2500)) * np.exp(-t * 260)


def whoosh(d=0.7):
    t = tvec(d)
    n = rng.standard_normal(len(t))
    shape = np.sin(np.pi * t / d) ** 2
    return lowpass(n, 250 + 4200 * shape) * shape * 1.6


def riser(d=2.0):
    t = tvec(d)
    n = rng.standard_normal(len(t))
    x = t / d
    sweep = lowpass(n, 200 + 7000 * x ** 2) * x ** 1.5
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * x ** 2) / SR) * x ** 2 * 0.25
    return sweep + tone


def sparkle(n_notes=9, base=1800):
    out = np.zeros(int(0.7 * SR))
    for k in range(n_notes):
        t = tvec(0.35)
        f = base * 2 ** (k / 6)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t * 22)
        i = int(k * 0.035 * SR)
        out[i:i + len(s)] += s[: len(out) - i]
    return out


def bell(f, d=1.4):
    t = tvec(d)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 3) + 0.15 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 6)) * env_ad(t, 0.002, 3.2)


def chime():
    a = bell(1318.5)
    b = bell(1760.0)
    out = np.zeros(len(a) + int(0.12 * SR))
    out[: len(a)] += a
    out[int(0.12 * SR): int(0.12 * SR) + len(b)] += b
    return out


def stamp():
    t = tvec(0.6)
    f = 40 + 90 * np.exp(-t * 25)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    n = rng.standard_normal(len(t))
    return body + lowpass(n, 1800) * np.exp(-t * 35) * 1.2


def horn():
    out = np.zeros(int(0.42 * SR))
    for o in (0.0, 0.2):
        t = tvec(0.13)
        s = 0.0
        for f in (523.0, 659.0):
            ph = 2 * np.pi * f * t
            s = s + np.sin(ph) + 0.33 * np.sin(3 * ph) + 0.2 * np.sin(5 * ph)
        s = s * np.minimum(1, t / 0.01) * np.minimum(1, (0.13 - t) / 0.02)
        i = int(o * SR)
        out[i:i + len(s)] += s
    return out * 0.5


# ------------------------------------------------------------------ the music (D major, I-V-vi-IV, one chord per bar)
CHORDS = [  # pad voicing, bass root, arp tones
    ([62, 66, 69], 50, [74, 78, 81, 86]),
    ([61, 64, 69], 45, [73, 76, 81, 85]),
    ([62, 66, 71], 47, [74, 78, 83, 86]),
    ([62, 67, 71], 43, [74, 79, 83, 86]),
]
MELODY = [[81, 78, 74, 76], [76, 73, 69, 73], [74, 78, 83, 81], [79, 78, 76, 74]]
ARP = [0, 1, 2, 3, 2, 1, 3, 2]

drop, brk, end = CUES['drop'], CUES['scenes'][6], CUES['end']
n_bars = int(DUR / BAR)
duck = np.ones(N)
for b in range(n_bars):
    t0 = b * BAR
    if t0 >= end + BAR:
        break
    voicing, root, arp = CHORDS[b % 4]
    section = 'intro' if t0 < drop - 2 else 'riser' if t0 < drop else 'full' if t0 < brk else 'break' if t0 < end else 'outro'
    if section == 'outro':
        continue
    # pad
    place(pad(voicing, BAR + 0.2), t0, 0.10 if section != 'full' else 0.085, -0.25)
    place(pad(voicing, BAR + 0.2, detune=0.004), t0, 0.10 if section != 'full' else 0.085, 0.25)
    # marimba arpeggio in eighths
    for k in range(8):
        tk = t0 + k * BEAT / 2
        place(marimba(arp[ARP[k]], 0.6), tk, 0.06 if section in ('intro', 'riser') else 0.07, -0.5 if k % 2 else 0.5)
    if section in ('full', 'break'):
        # lead melody, a little swing on beat 4
        for k, m in enumerate(MELODY[b % 4]):
            place(marimba(m, 1.0, 1.2), t0 + k * BEAT + (0.03 if k == 3 else 0), 0.13, 0.1)
    if section == 'full':
        # bass: syncopated root / octave
        for k, (off, oct_) in enumerate(((0, 0), (0.75, 12), (1.0, 0), (1.5, 0), (1.75, 12))):
            place(bass(root + oct_, 0.4), t0 + off, 0.22)
        for k in range(4):
            tk = t0 + k * BEAT
            place(kick(), tk, 0.55)
            i = int(tk * SR)
            seglen = int(0.3 * SR)
            duck[i:i + seglen] = np.minimum(duck[i:i + seglen], 1 - 0.45 * np.exp(-np.arange(min(seglen, N - i)) / SR * 10))
            if k in (1, 3):
                place(clap(), tk, 0.2)
            place(hat(0.09, 45), tk + BEAT / 2, 0.07, 0.35)
            for s16 in (0.25, 0.75):
                place(hat(0.04, 110), tk + s16 * BEAT, 0.03, -0.35)
    elif section == 'break':
        for k in (1, 3):
            place(clap(), t0 + k * BEAT, 0.1)
    elif section == 'intro' and t0 >= CUES['tags'][0]:
        for k in range(4):
            place(hat(0.06, 70), t0 + k * BEAT + BEAT / 2, 0.045, 0.3)

# riser + snare roll into the drop
place(riser(CUES['riser'][1] - CUES['riser'][0]), CUES['riser'][0], 0.35)
roll_t = CUES['riser'][0]
while roll_t < drop - 0.02:
    x = (roll_t - CUES['riser'][0]) / 2
    place(clap(), roll_t, 0.05 + 0.12 * x)
    roll_t += 0.25 if x < 0.5 else 0.125 if x < 0.8 else 0.0625
# small riser back in after the break
place(riser(1.0), end - 1.0, 0.2)

# the final chord
for m, pan in ((62, -0.4), (66, 0), (69, 0.4), (74, 0), (78, 0.2), (81, -0.2)):
    place(marimba(m, 3.5, 1.3), end, 0.12, pan)
place(pad([62, 66, 69], 4.0), end, 0.16, -0.2)
place(pad([62, 66, 69], 4.0, detune=0.004), end, 0.16, 0.2)
place(bass(38, 2.5), end, 0.3)
place(kick(), end, 0.6)

# duck pad/marimba on kicks (applied to everything placed so far)
L *= duck
R *= duck

# ------------------------------------------------------------------ sound effects on the cues
for i, t in enumerate(CUES['hook']):
    place(pop(0.8 + 0.15 * i), t, 0.28)
for i, t in enumerate(CUES['tags']):
    place(pop(1.0 + 0.08 * i), t, 0.3, (-0.6, 0.6)[i % 2])
for t in CUES['tooMany']:
    place(kick(), t, 0.45)
    place(click(), t, 0.3)
place(crash(), drop, 0.22)
place(kick(), drop, 0.7)
place(whoosh(0.8), drop - 0.3, 0.45)
place(sparkle(), drop + 0.3, 0.16, 0.2)
place(sparkle(6, 2600), CUES['tagline'], 0.1, -0.2)
for t in CUES['scenes'][:7]:
    place(whoosh(0.6), t - 0.25, 0.32, -0.3)
for t in CUES['oneApp']:
    place(pop(0.9), t, 0.18)
place(click(), CUES['tap'], 0.5)
place(bell(1567.98, 1.0), CUES['sent'], 0.3)
place(stamp(), CUES['stamp'], 0.75)
for i, t in enumerate(CUES['pins']):
    place(pop(1.0 + 0.07 * i), t, 0.26, -0.4 + i * 0.13)
for i, t in enumerate(CUES['cards']):
    place(whoosh(0.45), t - 0.15, 0.22, (-0.5, 0.5, -0.2)[i])
    place(pop(0.75), t + 0.25, 0.16)
place(whoosh(1.6), CUES['tuk'][0], 0.18, -0.2)
place(horn(), CUES['horn'], 0.3, 0.2)
for t in CUES['opts']:
    place(pop(1.1), t, 0.18)
place(click(), CUES['pick'], 0.45)
for t in CUES['status']:
    place(click(), t, 0.4)
    place(bell(1975.5, 0.5), t + 0.02, 0.06)
for t in CUES['notifs']:
    place(chime(), t, 0.42)
    place(pop(1.3), t, 0.12)
for t in CUES['why']:
    place(pop(0.7), t, 0.16)
place(crash(), end, 0.2)
place(sparkle(12, 1500), end + 0.05, 0.18, -0.3)
place(sparkle(10, 2200), end + 0.25, 0.14, 0.3)
place(sparkle(6, 2600), CUES['endText'][0], 0.1)

# ------------------------------------------------------------------ master
mix = np.stack([L, R], axis=1)
fade = np.ones(N)
fade_len = int(1.6 * SR)
fade[-fade_len:] = np.linspace(1, 0, fade_len) ** 2
mix *= fade[:, None]
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix *= 0.84 / np.max(np.abs(mix))
pcm = (mix * 32767).astype('<i2')
with wave.open(f'{OUT}/pitch-audio.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('pins', pin_times)
print('wrote', f'{OUT}/pitch-audio.wav', f'{DUR}s')
