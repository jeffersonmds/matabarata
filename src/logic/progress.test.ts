import { describe, it, expect } from 'vitest';
import { isUnlocked, recordResult, totalStars } from './progress';
import type { SaveData } from '../save';

const ids = ['a', 'b', 'c'];
const save = (levels: SaveData['levels'] = {}): SaveData => ({ classicBest: 0, levels, muted: false });

describe('progress', () => {
  it('a 1ª fase está sempre aberta; as outras abrem quando a anterior tem estrela', () => {
    const s = save({ a: { stars: 1, best: 100 } });
    expect([0, 1, 2].map((i) => isUnlocked(ids, i, s))).toEqual([true, true, false]);
  });

  it('guarda o melhor de estrelas e de pontos, separadamente', () => {
    let s = recordResult(save(), 'a', 3, 500).save;
    s = recordResult(s, 'a', 1, 900).save;
    expect(s.levels.a).toEqual({ stars: 3, best: 900 });
  });

  it('newBest só quando passa o recorde', () => {
    const s = recordResult(save(), 'a', 2, 500).save;
    expect(recordResult(s, 'a', 2, 400).newBest).toBe(false);
    expect(recordResult(s, 'a', 2, 501).newBest).toBe(true);
  });

  it('não mexe no save recebido', () => {
    const s = save();
    recordResult(s, 'a', 2, 500);
    expect(s.levels).toEqual({});
  });

  it('soma as estrelas', () => {
    expect(totalStars(save({ a: { stars: 3, best: 1 }, b: { stars: 1, best: 1 } }))).toBe(4);
  });
});
