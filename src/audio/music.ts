import { audio } from './beeper';

// Musiquinha 8-bit da Cozinha, gerada no código: 16 colcheias de melodia + baixo em loop, 112 BPM.
const STEP_S = 60 / 112 / 2;
// notas MIDI; 0 = pausa
const MELODY = [72, 0, 76, 79, 0, 76, 74, 72, 74, 0, 77, 81, 0, 79, 77, 74];
const BASS = [48, 0, 55, 0, 48, 0, 55, 0, 50, 0, 57, 0, 53, 0, 55, 0];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextAt = 0;

function note(a: { ctx: AudioContext; out: GainNode }, midi: number, t: number, wave: OscillatorType, vol: number): void {
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = wave;
  osc.frequency.value = hz(midi);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + STEP_S * 0.9);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + STEP_S);
}

/** Agenda as notas um pouco à frente do relógio do áudio (timer de 50 ms, janela de 200 ms). */
export function startMusic(): void {
  if (timer) return;
  step = 0;
  nextAt = 0;
  timer = setInterval(() => {
    const a = audio();
    if (!a) return;
    if (nextAt < a.ctx.currentTime) nextAt = a.ctx.currentTime + 0.05;
    while (nextAt < a.ctx.currentTime + 0.2) {
      const i = step % MELODY.length;
      if (MELODY[i]) note(a, MELODY[i], nextAt, 'square', 0.035);
      if (BASS[i]) note(a, BASS[i], nextAt, 'triangle', 0.08);
      nextAt += STEP_S;
      step++;
    }
  }, 50);
}

export function stopMusic(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
