// Progresso salvo no navegador. A chave carrega a versão; campo inválido vira o padrão, sem perder os outros.
const KEY = 'matabarata:v1';

export interface LevelRecord {
  stars: number;
  best: number;
}

export interface SaveData {
  classicBest: number;
  levels: Record<string, LevelRecord>;
}

export const EMPTY: SaveData = { classicBest: 0, levels: {} };

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const isCount = (n: unknown, max = Infinity): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;

export function parseSave(raw: string | null): SaveData {
  try {
    const d = JSON.parse(raw ?? '');
    const levels: Record<string, LevelRecord> = {};
    for (const [id, r] of Object.entries(d?.levels ?? {})) {
      const rec = r as Partial<LevelRecord> | null;
      if (isCount(rec?.stars, 3) && isCount(rec?.best)) levels[id] = { stars: rec.stars, best: rec.best };
    }
    return { classicBest: isCount(d?.classicBest) ? d.classicBest : 0, levels };
  } catch {
    return { classicBest: 0, levels: {} };
  }
}

// O acesso a localStorage fica dentro do try: no modo privado do Safari ele pode lançar.
export function loadSave(store?: Store): SaveData {
  try {
    return parseSave((store ?? localStorage).getItem(KEY));
  } catch {
    return { classicBest: 0, levels: {} };
  }
}

export function writeSave(data: SaveData, store?: Store): void {
  try {
    (store ?? localStorage).setItem(KEY, JSON.stringify(data));
  } catch {
    // sem espaço ou modo privado: segue sem salvar
  }
}
