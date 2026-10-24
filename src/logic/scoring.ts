export const BASE_POINTS = 100;
export const COMBO_WINDOW_MS = 1500;

export interface ScoreState {
  score: number;
  /** Mortes seguidas dentro da janela do combo. */
  streak: number;
  lastKillMs: number;
}

export const newScore = (): ScoreState => ({ score: 0, streak: 0, lastKillMs: -Infinity });

/** Registra uma morte e devolve os pontos: 100, 150, 200… enquanto cada morte vier até 1,5 s depois da anterior. */
export function registerKill(s: ScoreState, nowMs: number): number {
  s.streak = nowMs - s.lastKillMs <= COMBO_WINDOW_MS ? s.streak + 1 : 1;
  s.lastKillMs = nowMs;
  const points = BASE_POINTS * (1 + 0.5 * (s.streak - 1));
  s.score += points;
  return points;
}

/** 1 por vencer, +1 dentro do tempo-alvo, +1 se a infestação nunca passou da metade. */
export function starsFor(won: boolean, elapsedMs: number, maxInfestation: number, targetMs: number): number {
  if (!won) return 0;
  return 1 + (elapsedMs <= targetMs ? 1 : 0) + (maxInfestation <= 0.5 ? 1 : 0);
}
