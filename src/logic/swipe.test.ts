import { describe, it, expect } from 'vitest';
import { swipeDir } from './swipe';

describe('swipeDir', () => {
  it('ignora movimento curto', () => {
    expect(swipeDir(10, -5)).toBeNull();
  });

  it('o eixo dominante decide', () => {
    expect(swipeDir(40, 10)).toBe('right');
    expect(swipeDir(-40, 10)).toBe('left');
    expect(swipeDir(5, 30)).toBe('down');
    expect(swipeDir(5, -30)).toBe('up');
  });
});
