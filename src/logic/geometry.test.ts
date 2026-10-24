import { describe, it, expect } from 'vitest';
import { dist, inRect, pushOutOfRect, clampToArena } from './geometry';

const box = { x: 100, y: 100, w: 200, h: 100 };

describe('geometry', () => {
  it('dist e inRect', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(inRect({ x: 150, y: 150 }, box)).toBe(true);
    expect(inRect({ x: 99, y: 150 }, box)).toBe(false);
  });

  it('círculo longe do retângulo não se mexe (mesmo objeto)', () => {
    const c = { x: 50, y: 150 };
    expect(pushOutOfRect(c, 20, box)).toBe(c);
  });

  it('círculo encostando é empurrado até tocar a borda', () => {
    const p = pushOutOfRect({ x: 90, y: 150 }, 20, box);
    expect(p.x).toBeCloseTo(80);
    expect(p.y).toBeCloseTo(150);
  });

  it('centro dentro do retângulo sai pelo lado mais perto', () => {
    expect(pushOutOfRect({ x: 290, y: 150 }, 20, box)).toEqual({ x: 320, y: 150 });
    expect(pushOutOfRect({ x: 200, y: 105 }, 20, box)).toEqual({ x: 200, y: 80 });
  });

  it('clampToArena mantém o círculo inteiro dentro', () => {
    expect(clampToArena({ x: -10, y: 5000 }, 30, 900, 1200)).toEqual({ x: 30, y: 1170 });
  });
});
