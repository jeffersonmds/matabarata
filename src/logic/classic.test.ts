import { describe, it, expect } from 'vitest';
import { newGame, turn, step, ROACH_COUNT, type ClassicState } from './classic';

/** Jogo com baratas em posições escolhidas. */
function game(roaches: [number, number][]): ClassicState {
  const g = newGame(() => 0);
  g.roaches = roaches.map(([x, y]) => ({ x, y, dead: false }));
  return g;
}

describe('newGame', () => {
  it('começa como em 2013', () => {
    const g = newGame(Math.random);
    expect([g.x, g.y, g.score, g.stepMs, g.status, g.dir]).toEqual([40, 13, 0, 100, 'waiting', null]);
    expect(g.roaches).toHaveLength(ROACH_COUNT);
  });

  it('baratas ficam dentro da arena (x 2..77, y 2..22)', () => {
    expect(newGame(() => 0).roaches[0]).toEqual({ x: 2, y: 2, dead: false });
    expect(newGame(() => 0.9999999).roaches[0]).toEqual({ x: 77, y: 22, dead: false });
  });
});

describe('step', () => {
  it('fica parado até escolher uma direção', () => {
    const g = game([[10, 10]]);
    step(g);
    expect([g.x, g.y]).toEqual([40, 13]);
  });

  it('anda uma célula por passo e continua na mesma direção', () => {
    const g = game([[10, 10]]);
    turn(g, 'right');
    step(g);
    step(g);
    expect([g.x, g.y, g.status]).toEqual([42, 13, 'playing']);
  });

  it.each([
    ['left', 2, 13],
    ['right', 78, 13],
    ['up', 40, 2],
    ['down', 40, 22],
  ] as const)('encostar na borda (%s) perde', (dir, x, y) => {
    const g = game([[10, 10]]);
    g.x = x;
    g.y = y;
    turn(g, dir);
    step(g);
    expect(g.status).toBe('lost');
  });

  it('a última célula antes da borda é segura', () => {
    const g = game([[10, 10]]);
    g.x = 77;
    turn(g, 'right');
    step(g);
    expect([g.x, g.status]).toEqual([78, 'playing']);
  });

  it('matar dá 1000 pontos e acelera 3 ms', () => {
    const g = game([[41, 13], [10, 10]]);
    turn(g, 'right');
    expect(step(g).killed).toBe(1);
    expect([g.score, g.stepMs]).toEqual([1000, 97]);
  });

  it('duas baratas na mesma célula morrem juntas', () => {
    const g = game([[41, 13], [41, 13], [10, 10]]);
    turn(g, 'right');
    expect(step(g).killed).toBe(2);
    expect([g.score, g.stepMs]).toEqual([2000, 94]);
  });

  it('barata morta não conta de novo', () => {
    const g = game([[41, 13], [10, 10]]);
    turn(g, 'right');
    step(g);
    turn(g, 'left');
    step(g);
    expect(g.score).toBe(1000);
  });

  it('matar todas vence e o jogo para', () => {
    const g = game([[41, 13]]);
    turn(g, 'right');
    step(g);
    expect(g.status).toBe('won');
    turn(g, 'left');
    step(g);
    expect([g.x, g.status]).toEqual([41, 'won']);
  });

  it('com as 30 mortas o passo chega a 10 ms', () => {
    const g = game(Array.from({ length: 30 }, (_, i): [number, number] => [41 + i, 13]));
    turn(g, 'right');
    for (let i = 0; i < 30; i++) step(g);
    expect([g.stepMs, g.score, g.status]).toEqual([10, 30000, 'won']);
  });

  it('o cursor gira | / - \ a cada passo', () => {
    const g = game([[10, 10]]);
    turn(g, 'right');
    const frames = [0, 1, 2, 3, 4].map(() => {
      step(g);
      return g.frame;
    });
    expect(frames).toEqual([1, 2, 3, 0, 1]);
  });
});
