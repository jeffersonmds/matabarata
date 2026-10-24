import { describe, it, expect } from 'vitest';
import { parseSave, loadSave, writeSave, EMPTY } from './save';

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

const broken = {
  getItem: (): string | null => {
    throw new Error('bloqueado');
  },
  setItem: (): void => {
    throw new Error('cheio');
  },
};

describe('save', () => {
  it('lê o que gravou', () => {
    const s = memory();
    const data = { classicBest: 5000, levels: { 'cozinha-1': { stars: 2, best: 900 } } };
    writeSave(data, s);
    expect(loadSave(s)).toEqual(data);
  });

  it.each([null, '', '{', 'null', '{"classicBest":-1}', '{"classicBest":"9"}'])('dado inválido %j começa do zero', (raw) => {
    expect(parseSave(raw)).toEqual(EMPTY);
  });

  it('fase com registro inválido é descartada, o resto fica', () => {
    const raw = '{"classicBest":10,"levels":{"a":{"stars":4,"best":1},"b":{"stars":1,"best":-1},"c":{"stars":3,"best":50}}}';
    expect(parseSave(raw)).toEqual({ classicBest: 10, levels: { c: { stars: 3, best: 50 } } });
  });

  it('storage quebrado não lança', () => {
    expect(loadSave(broken)).toEqual(EMPTY);
    expect(() => writeSave(EMPTY, broken)).not.toThrow();
  });
});
