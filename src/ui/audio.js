let context = null;
let enabled = true;

function ensureContext() {
  if (!context) {
    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    context = new AudioContextClass();
  }
  if (context.state === "suspended") {
    context.resume();
  }
  return context;
}

function tone(frequency, duration, type, gain, delay = 0) {
  const audio = ensureContext();
  if (!audio || !enabled) {
    return;
  }
  const oscillator = audio.createOscillator();
  const envelope = audio.createGain();
  const start = audio.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function setEnabled(value) {
  enabled = Boolean(value);
  if (!enabled && context) {
    context.suspend();
  }
}

export function isEnabled() {
  return enabled;
}

export function playRotate() {
  tone(660, 0.08, "triangle", 0.035);
}

export function playUi() {
  tone(440, 0.05, "sine", 0.022);
}

export function playError() {
  tone(180, 0.12, "sawtooth", 0.02);
}

export function playVictory() {
  tone(523.25, 0.16, "triangle", 0.035, 0);
  tone(659.25, 0.16, "triangle", 0.035, 0.1);
  tone(783.99, 0.2, "triangle", 0.04, 0.2);
  tone(1046.5, 0.32, "sine", 0.035, 0.32);
}
