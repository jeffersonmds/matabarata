import { describe, it, expect } from 'vitest';
import { coverCrop } from './cover';

describe('coverCrop', () => {
  it('mesma proporção usa a imagem inteira', () => {
    expect(coverCrop(900, 1200, 450, 600)).toEqual({ x: 0, y: 0, w: 900, h: 1200 });
  });

  it('imagem quadrada num retângulo largo corta em cima e embaixo', () => {
    expect(coverCrop(600, 600, 300, 200)).toEqual({ x: 0, y: 100, w: 600, h: 400 });
  });

  it('imagem larga numa área menos larga corta dos lados', () => {
    const c = coverCrop(1376, 768, 960, 600);
    expect(c.y).toBe(0);
    expect(c.h).toBe(768);
    expect(c.w).toBeCloseTo(1228.8);
    expect(c.x).toBeCloseTo(73.6);
  });
});
