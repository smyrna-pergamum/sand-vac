// Tiny WebAudio blips; silently does nothing where audio is unavailable.
let ac = null;
let lastSuck = 0;
let muted = false;

function audio() {
  if (muted) return null;
  if (!ac) {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      ac = Ctor ? new Ctor() : null;
    } catch {
      ac = null;
    }
  }
  return ac;
}

function blip(freq, dur, type = 'sine', vol = 0.05, delay = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  unlock() {
    const a = audio();
    if (a && a.state === 'suspended') a.resume().catch(() => {});
  },
  toggle() {
    muted = !muted;
    return !muted;
  },
  tap: () => blip(320, 0.05, 'square', 0.025),
  bad: () => blip(150, 0.12, 'square', 0.03),
  launch: () => blip(440, 0.09, 'triangle', 0.05),
  suck() {
    const now = performance.now();
    if (now - lastSuck < 60) return;
    lastSuck = now;
    blip(900 + Math.random() * 400, 0.025, 'triangle', 0.015);
  },
  pop() {
    blip(520, 0.08, 'sine', 0.07);
    blip(780, 0.12, 'sine', 0.06, 0.06);
  },
  win: () => [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.18, 'triangle', 0.07, i * 0.11)),
  fail: () => blip(180, 0.35, 'sawtooth', 0.04),
};
