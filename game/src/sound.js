// All sound is synthesized in the browser with the Web Audio API —
// short oscillator blips and filtered noise, no audio files, no network.
// The context is created lazily on the first user gesture, so the page
// never tries to play sound before the player has interacted with it.

export function makeSoundBank() {
  let context = null;
  let muted = false;

  function ensureContext() {
    if (context !== null) return context;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    return context;
  }

  function tone(freqStart, freqEnd, seconds, type, gainValue, delay = 0) {
    if (muted) return;
    const ctx = ensureContext();
    if (ctx === null) return;
    const when = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), when + seconds);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(gainValue, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + seconds + 0.05);
  }

  function noiseBurst(seconds, gainValue, lowFreq) {
    if (muted) return;
    const ctx = ensureContext();
    if (ctx === null) return;
    const when = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(when);
  }

  return {
    unlock() {
      const ctx = ensureContext();
      if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMuted() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    collect(combo) {
      const base = 620 + Math.min(combo, 24) * 18;
      tone(base, base * 1.6, 0.12, 'sine', 0.16);
      tone(base * 2, base * 2.4, 0.09, 'triangle', 0.07, 0.02);
    },
    pulse() {
      tone(320, 90, 0.22, 'sawtooth', 0.1);
      tone(880, 240, 0.16, 'square', 0.05);
    },
    asteroidBreak() {
      noiseBurst(0.18, 0.16, 900);
    },
    hurt() {
      tone(180, 55, 0.35, 'sawtooth', 0.2);
      noiseBurst(0.25, 0.2, 500);
    },
    pickup(kind) {
      if (kind === 'shield') {
        tone(520, 780, 0.16, 'sine', 0.14);
        tone(780, 1040, 0.2, 'sine', 0.12, 0.09);
      } else if (kind === 'magnet') {
        tone(440, 660, 0.12, 'triangle', 0.14);
        tone(660, 880, 0.14, 'triangle', 0.12, 0.07);
      } else {
        tone(700, 1050, 0.1, 'square', 0.08);
        tone(1050, 1400, 0.16, 'square', 0.07, 0.06);
      }
    },
    comet() {
      tone(980, 1560, 0.5, 'sine', 0.14);
      tone(1560, 2340, 0.4, 'sine', 0.08, 0.12);
    },
    waveClear() {
      tone(523, 523, 0.12, 'triangle', 0.13);
      tone(659, 659, 0.12, 'triangle', 0.13, 0.1);
      tone(784, 784, 0.22, 'triangle', 0.15, 0.2);
    },
    victory() {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((note, i) => tone(note, note, 0.3, 'triangle', 0.14, i * 0.13));
    },
    gameOver() {
      const notes = [392, 330, 262, 196];
      notes.forEach((note, i) => tone(note, note * 0.94, 0.34, 'sawtooth', 0.1, i * 0.18));
    },
    click() {
      tone(900, 700, 0.06, 'sine', 0.1);
    },
  };
}
