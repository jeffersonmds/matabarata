// Bips em onda quadrada no lugar do Beep() do Windows usado em 2013 (mesmas notas, Hz e ms).
export type Note = readonly [hz: number, ms: number];

export const KILL_BEEP: Note = [400, 50];
export const GAME_OVER: Note[] = [[196, 500], [292, 100], [350, 300], [330, 500], [306, 800]];

let ctx: AudioContext | null = null;

/** O iOS só libera áudio depois de um gesto do usuário: chamado em todo toque/tecla. */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null; // sem áudio: o jogo segue mudo
  }
}

/** Toca as notas em sequência, como os Beep() bloqueantes do original. */
export function play(notes: readonly Note[]): void {
  if (!ctx || ctx.state !== 'running') return;
  let t = ctx.currentTime;
  for (const [hz, ms] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = hz;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000);
    t += ms / 1000;
  }
}
