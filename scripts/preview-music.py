#!/usr/bin/env python3
"""Musique originale des vidéos d'aperçu (composée par programme : aucun droit tiers).

Ambiance légère et optimiste, 104 bpm, la mineur -> do majeur (Am – F – C – G) :
nappe douce, arpèges au piano électrique doux, basse ronde, percussions discrètes, montée d'intensité puis fin en douceur.
Usage : python scripts/preview-music.py sortie.wav [durée_en_secondes]
"""
import sys, wave
import numpy as np

SR = 48000
BPM = 104
BEAT = 60 / BPM
rng = np.random.default_rng(7)

def note(n):  # n en demi-tons depuis le la 440
    return 440.0 * 2 ** (n / 12)

def env(n, a, d, s, r, total):
    e = np.ones(n) * s
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    A = min(A, n); e[:A] = np.linspace(0, 1, A)
    D2 = min(A + D, n); e[A:D2] = np.linspace(1, s, D2 - A)
    if R and n > R: e[-R:] *= np.linspace(1, 0, R)
    return e

def pluck(freq, dur, bright=0.5):
    # Karplus-Strong : corde pincée, timbre doux
    n = int(dur * SR); period = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, period)
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = 0.5 * (buf[i % period] + buf[(i + 1) % period]) * (0.994 + 0.004 * bright)
    return out * env(n, 0.002, 0.08, 0.6, 0.15, dur)

def epiano(freq, dur, bright=0.5):
    # Piano électrique doux (synthèse FM, façon Rhodes)
    n = int(dur * SR); t = np.arange(n) / SR
    idx = (1.2 + 1.4 * bright) * np.exp(-t * 6)
    s = np.sin(2 * np.pi * freq * t + idx * np.sin(2 * np.pi * freq * t)) + 0.18 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 3)
    return s * env(n, 0.004, 0.25, 0.35, 0.2, dur) * np.exp(-t * 1.4)

def marimba(freq, dur, bright=0.5):
    # Marimba / kalimba : attaque boisée, résonance courte
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) * np.exp(-t * 5) + 0.35 * np.sin(2 * np.pi * freq * 3.98 * t) * np.exp(-t * 22) + 0.12 * np.sin(2 * np.pi * freq * 9.2 * t) * np.exp(-t * 60)
    return s * env(n, 0.002, 0.05, 0.9, 0.08, dur)

def bell(freq, dur, bright=0.5):
    # Clochettes douces (cloches de verre)
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 2.2), (2.76, .35, 4), (5.4, .18, 7), (8.93, .08, 11)))
    return s * env(n, 0.003, 0.1, 0.9, 0.2, dur)

LEAD = {"pluck": pluck, "epiano": epiano, "marimba": marimba, "bell": bell}
INSTR = "epiano"

def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            # dents de scie adoucies (quelques harmoniques seulement)
            for k in range(1, 6):
                out += np.sin(2 * np.pi * ff * k * t + det * 3) / (k * 1.6)
    out /= np.max(np.abs(out)) + 1e-9
    return out * env(n, 0.6, 0.4, 0.8, 0.7, dur)

def bass(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t)
    return s * env(n, 0.01, 0.15, 0.55, 0.08, dur)

def kick(dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 120 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def shaker(dur=0.09):
    n = int(dur * SR); x = rng.uniform(-1, 1, n)
    x = np.diff(np.concatenate([[0], x]))  # passe-haut simple
    return x * np.exp(-np.arange(n) / SR * 45)

def place(track, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= track.shape[1]: return
    j = min(track.shape[1], i + len(sig)); s = sig[: j - i] * gain
    track[0, i:j] += s * np.cos((pan + 1) * np.pi / 4)
    track[1, i:j] += s * np.sin((pan + 1) * np.pi / 4)

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y

def reverb(st, mix=0.22):
    out = st.copy()
    for d, g in ((0.031, 0.5), (0.047, 0.42), (0.071, 0.36), (0.113, 0.3), (0.167, 0.22), (0.241, 0.15)):
        k = int(d * SR)
        out[0, k:] += st[1, :-k] * g * mix
        out[1, k:] += st[0, :-k] * g * mix
    return out

def compose(total):
    n = int(total * SR) + SR
    tr = np.zeros((2, n))
    # Am, F, C, G (demi-tons depuis la 440)
    chords = [[-12, -9, -5], [-16, -12, -9], [-21, -17, -14], [-14, -10, -7]]
    roots = [-24, -28, -33, -26]
    bar = 4 * BEAT
    nbars = int(np.ceil(total / bar))
    for b in range(nbars):
        t0 = b * bar
        c = chords[b % 4]; r = roots[b % 4]
        part = b / max(1, nbars - 1)          # 0 -> 1 au fil de la vidéo
        place(tr, pad([note(x) for x in c], bar + 0.6), t0, 0.22)
        # arpège : croches, montée d'intensité après l'introduction
        arp = [c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 24]
        steps = 8 if b >= 1 else 4
        for s in range(steps):
            f = note(arp[s % 4]); at = t0 + s * (bar / steps)
            place(tr, LEAD[INSTR](f, 0.9 if INSTR != "marimba" else 0.6, bright=0.4 + 0.4 * part), at, (0.20 + 0.06 * part) * {"pluck": 1, "epiano": 0.75, "marimba": 0.85, "bell": 0.45}[INSTR], pan=-0.35 if s % 2 else 0.35)
        if b >= 1:
            place(tr, bass(note(r), BEAT * 1.6), t0, 0.24)
            place(tr, bass(note(r), BEAT * 1.6), t0 + 2 * BEAT, 0.20)
        if 1 <= b < nbars - 1:
            for k in range(4):
                place(tr, kick(), t0 + k * BEAT, 0.16 if k % 2 == 0 else 0.10)
            for k in range(8):
                place(tr, shaker(), t0 + k * BEAT / 2 + BEAT / 4, 0.05, pan=0.5)
    # Note finale tenue sur l'accord de la mineur
    place(tr, pad([note(x) for x in chords[0]], 2.4), nbars * bar, 0.14)
    tr = tr[:, : int(total * SR)]
    tr = np.vstack([lowpass(tr[0], 9000), lowpass(tr[1], 9000)])
    tr = reverb(tr)
    # Fondu d'entrée et de sortie ; le niveau final (-16 LUFS) est réglé au montage
    fi, fo = int(0.8 * SR), int(1.6 * SR)
    tr[:, :fi] *= np.linspace(0, 1, fi); tr[:, -fo:] *= np.linspace(1, 0, fo)
    tr *= 10 ** (-1 / 20) / (np.max(np.abs(tr)) + 1e-9)
    return tr

if __name__ == "__main__":
    out = sys.argv[1]; total = float(sys.argv[2]) if len(sys.argv) > 2 else 28.0
    if len(sys.argv) > 3: INSTR = sys.argv[3]
    st = compose(total)
    pcm = (st.T * 32767).astype(np.int16)
    with wave.open(out, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f"{out} : {total:.1f} s")
