import { describe, it, expect } from 'vitest';
import { newScore, registerKill, starsFor } from './scoring';

describe('combo', () => {
  it('100, 150, 200 em sequência rápida', () => {
    const s = newScore();
    expect([registerKill(s, 0), registerKill(s, 1000), registerKill(s, 2500)]).toEqual([100, 150, 200]);
    expect([s.score, s.streak]).toEqual([450, 3]);
  });

  it('mais de 1,5 s depois recomeça', () => {
    const s = newScore();
    registerKill(s, 0);
    registerKill(s, 1000);
    expect(registerKill(s, 2501)).toBe(100);
    expect(s.streak).toBe(1);
  });

  it('mortes no mesmo instante (chinelada) contam como combo', () => {
    const s = newScore();
    expect([registerKill(s, 500), registerKill(s, 500)]).toEqual([100, 150]);
  });
});

describe('estrelas', () => {
  it.each([
    [false, 1000, 0.1, 0],
    [true, 99000, 0.9, 1],
    [true, 30000, 0.9, 2],
    [true, 99000, 0.5, 2],
    [true, 30000, 0.5, 3],
  ])('venceu=%s em %d ms com infestação máx %d → %d', (won, ms, inf, stars) => {
    expect(starsFor(won, ms, inf, 30000)).toBe(stars);
  });
});
