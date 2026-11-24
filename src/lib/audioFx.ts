let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctor) audioCtx = new Ctor();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(freq: number, duration = 0.1, type: OscillatorType = 'sine', volume = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export const gameFx = {
  click: () => playTone(520, 0.06, 'triangle', 0.05),
  success: () => {
    playTone(523.25, 0.09, 'sine', 0.07);
    setTimeout(() => playTone(659.25, 0.09, 'sine', 0.07), 75);
    setTimeout(() => playTone(783.99, 0.16, 'sine', 0.08), 150);
  },
  fail: () => {
    playTone(220, 0.12, 'sawtooth', 0.05);
    setTimeout(() => playTone(165, 0.2, 'sawtooth', 0.05), 110);
  },
  kick: () => playTone(115, 0.12, 'triangle', 0.12),
  boost: () => {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  },
  blockPlace: () => playTone(340, 0.07, 'square', 0.04),
  blockBreak: () => playTone(190, 0.08, 'triangle', 0.05),
};
