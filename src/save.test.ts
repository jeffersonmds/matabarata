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
    writeSave({ classicBest: 5000 }, s);
    expect(loadSave(s)).toEqual({ classicBest: 5000 });
  });

  it.each([null, '', '{', 'null', '{"classicBest":-1}', '{"classicBest":"9"}'])('dado inválido %j começa do zero', (raw) => {
    expect(parseSave(raw)).toEqual(EMPTY);
  });

  it('storage quebrado não lança', () => {
    expect(loadSave(broken)).toEqual(EMPTY);
    expect(() => writeSave({ classicBest: 1 }, broken)).not.toThrow();
  });
});
