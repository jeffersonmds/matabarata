import type { SaveData } from '../save';

/** A 1ª fase está sempre aberta; cada uma abre quando a anterior tem pelo menos 1 estrela. */
export function isUnlocked(levelIds: string[], index: number, save: SaveData): boolean {
  return index === 0 || (save.levels[levelIds[index - 1]]?.stars ?? 0) > 0;
}

/** Junta uma vitória ao save (sem alterar o recebido). */
export function recordResult(save: SaveData, id: string, stars: number, score: number): { save: SaveData; newBest: boolean } {
  const prev = save.levels[id];
  const rec = { stars: Math.max(prev?.stars ?? 0, stars), best: Math.max(prev?.best ?? 0, score) };
  return { save: { ...save, levels: { ...save.levels, [id]: rec } }, newBest: score > (prev?.best ?? 0) };
}

export const totalStars = (save: SaveData) => Object.values(save.levels).reduce((sum, r) => sum + r.stars, 0);
