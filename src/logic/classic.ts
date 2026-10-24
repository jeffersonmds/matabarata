// Regras do MataBarata original (SENAI, 2013), em coordenadas de console 1-based (gotoxy do conio).
// Fiel ao .cpp de propósito: não "conserte" as regras.

export const COLS = 80;
export const ROWS = 25;
export const START_X = 40;
export const START_Y = 13;
export const ROACH_COUNT = 30;
export const START_STEP_MS = 100;
export const STEP_DECREMENT_MS = 3;
export const KILL_POINTS = 1000;

// Chegar numa destas linhas/colunas = game over.
const WALL_LEFT = 1;
const WALL_RIGHT = 79;
const WALL_TOP = 1;
const WALL_BOTTOM = 23;

export const CURSOR_FRAMES = ['|', '/', '-', '\'];

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Status = 'waiting' | 'playing' | 'lost' | 'won';

export interface Roach {
  x: number;
  y: number;
  dead: boolean;
}

export interface ClassicState {
  x: number;
  y: number;
  dir: Dir | null;
  roaches: Roach[];
  score: number;
  stepMs: number;
  status: Status;
  /** Índice em CURSOR_FRAMES. */
  frame: number;
}

const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** `rand` em [0, 1) — injetado pra teste. Baratas em x 2..77 e y 2..22, como o rand()%78 / %23 do original. */
export function newGame(rand: () => number): ClassicState {
  const roaches: Roach[] = [];
  for (let i = 0; i < ROACH_COUNT; i++) {
    roaches.push({ x: 2 + Math.floor(rand() * 76), y: 2 + Math.floor(rand() * 21), dead: false });
  }
  return { x: START_X, y: START_Y, dir: null, roaches, score: 0, stepMs: START_STEP_MS, status: 'waiting', frame: 0 };
}

/** Escolhe a direção; a primeira escolha começa o jogo. */
export function turn(s: ClassicState, dir: Dir): void {
  if (s.status === 'lost' || s.status === 'won') return;
  s.dir = dir;
  s.status = 'playing';
}

/** Um passo do cursor. Ordem do original: anda, testa borda, mata, testa vitória. */
export function step(s: ClassicState): { killed: number } {
  if (s.status !== 'playing' || !s.dir) return { killed: 0 };
  const [dx, dy] = DELTA[s.dir];
  s.x += dx;
  s.y += dy;
  s.frame = (s.frame + 1) % CURSOR_FRAMES.length;

  if (s.x <= WALL_LEFT || s.x >= WALL_RIGHT || s.y <= WALL_TOP || s.y >= WALL_BOTTOM) {
    s.status = 'lost';
    return { killed: 0 };
  }

  let killed = 0;
  for (const r of s.roaches) {
    if (!r.dead && r.x === s.x && r.y === s.y) {
      r.dead = true;
      killed++;
      s.score += KILL_POINTS;
      s.stepMs -= STEP_DECREMENT_MS;
    }
  }
  if (s.roaches.every((r) => r.dead)) s.status = 'won';
  return { killed };
}
