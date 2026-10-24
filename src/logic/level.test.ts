import { describe, it, expect } from 'vitest';
import { validateLevel, type LevelData } from './level';
import { LEVELS } from '../levels';

const ok: LevelData = {
  id: 'x',
  name: 'Teste',
  roaches: { comum: 3 },
  breedEveryMs: 5000,
  limit: 10,
  targetMs: 30000,
  obstacles: [{ x: 100, y: 100, w: 200, h: 100 }],
  powerUps: [{ kind: 'inseticida', atMs: 1000 }],
};

describe('validateLevel', () => {
  it('fase boa não tem erro', () => {
    expect(validateLevel(ok)).toEqual([]);
  });

  it.each<[string, Partial<LevelData>]>([
    ['sem baratas', { roaches: {} }],
    ['limite <= baratas iniciais', { limit: 3 }],
    ['limite abaixo do dobro das iniciais (3ª estrela impossível)', { limit: 5 }],
    ['multiplicação rápida demais', { breedEveryMs: 500 }],
    ['tempo-alvo inválido', { targetMs: 0 }],
    ['barata desconhecida', { roaches: { comum: 2, gigante: 1 } as LevelData['roaches'] }],
    ['obstáculo fora da arena', { obstacles: [{ x: 800, y: 0, w: 200, h: 100 }] }],
    ['obstáculo em cima do chinelo', { obstacles: [{ x: 400, y: 1000, w: 100, h: 100 }] }],
    ['obstáculo fino demais', { obstacles: [{ x: 100, y: 100, w: 300, h: 50 }] }],
    ['power-up desconhecido', { powerUps: [{ kind: 'bomba' as unknown as 'isca', atMs: 0 }] }],
  ])('%s é erro', (_nome, over) => {
    expect(validateLevel({ ...ok, ...over }).length).toBeGreaterThan(0);
  });
});

describe('fases da campanha', () => {
  it('são as 5 da Cozinha, na ordem, com ids únicos', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['cozinha-1', 'cozinha-2', 'cozinha-3', 'cozinha-4', 'cozinha-5']);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('%s é válida', (_id, level) => {
    expect(validateLevel(level)).toEqual([]);
  });
});
