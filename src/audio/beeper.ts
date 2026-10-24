// Áudio do jogo: um contexto e um ganho mestre (mudo = ganho 0). Os bips do Clássico imitam o Beep() de 2013.
export type Note = readonly [hz: number, ms: number];

export const KILL_BEEP: Note = [400, 50];
export const GAME_OVER: Note[] = [[196, 500], [292, 100], [350, 300], [330, 500], [306, 800]];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

/** O iOS só libera áudio depois de um gesto do usuário: chamado em todo toque/tecla. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    }
    if (ctx.state !== 'running') void ctx.resume(); // iOS também usa 'interrupted' (ligação, troca de app)
  } catch {
    ctx = null; // sem áudio: o jogo segue mudo
    master = null;
  }
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master) master.gain.value = m ? 0 : 1;
}

export const isMuted = () => muted;

/** Contexto pronto pra tocar, ou null (sem áudio ou ainda não liberado). */
export function audio(): { ctx: AudioContext; out: GainNode } | null {
  return ctx && master && ctx.state === 'running' ? { ctx, out: master } : null;
}

/** Toca as notas em sequência, como os Beep() bloqueantes do original. */
export function play(notes: readonly Note[]): void {
  const a = audio();
  if (!a) return;
  let t = a.ctx.currentTime;
  for (const [hz, ms] of notes) {
    const osc = a.ctx.createOscillator();
    const gain = a.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = hz;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(a.out);
    osc.start(t);
    osc.stop(t + ms / 1000);
    t += ms / 1000;
  }
}
