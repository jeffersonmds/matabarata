import { audio } from './beeper';

// Efeitos sintetizados (nada de arquivo de terceiros): tons com envelope curto e um ruído filtrado pro "PAF!".

function tone(f0: number, f1: number, ms: number, wave: OscillatorType, vol: number, delayMs = 0): void {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + delayMs / 1000;
  const d = ms / 1000;
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + d);
}

function noise(ms: number, vol: number): void {
  const a = audio();
  if (!a) return;
  const len = Math.floor((a.ctx.sampleRate * ms) / 1000);
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.ctx.createBufferSource();
  const filter = a.ctx.createBiquadFilter();
  const g = a.ctx.createGain();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(filter).connect(g).connect(a.out);
  src.start();
}

export const sfx = {
  /** Chinelada: estalo + baque grave. */
  paf: () => {
    noise(90, 0.35);
    tone(160, 50, 140, 'sine', 0.35);
  },
  /** Combo: bip que sobe a cada barata da sequência. */
  combo: (streak: number) => {
    const f = 440 * Math.pow(2, Math.min(streak, 8) / 6);
    tone(f, f * 1.5, 90, 'square', 0.08, 60);
  },
  /** Nasceu um filhote: guinchinho. */
  spawn: () => tone(1400, 2200, 60, 'triangle', 0.05),
  power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 90, 'square', 0.08, i * 70)),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, i < 5 ? 120 : 400, 'square', 0.1, i * 120)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, i < 3 ? 180 : 500, 'triangle', 0.14, i * 200)),
  click: () => tone(880, 660, 50, 'square', 0.06),
};
