// Progresso salvo no navegador. A chave carrega a versão: dado corrompido ou de outra versão = começa do zero.
const KEY = 'matabarata:v1';

export interface SaveData {
  classicBest: number;
}

export const EMPTY: SaveData = { classicBest: 0 };

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function parseSave(raw: string | null): SaveData {
  try {
    const best = JSON.parse(raw ?? '')?.classicBest;
    return Number.isFinite(best) && best >= 0 ? { classicBest: best } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

// O acesso a localStorage fica dentro do try: no modo privado do Safari ele pode lançar.
export function loadSave(store?: Store): SaveData {
  try {
    return parseSave((store ?? localStorage).getItem(KEY));
  } catch {
    return { ...EMPTY };
  }
}

export function writeSave(data: SaveData, store?: Store): void {
  try {
    (store ?? localStorage).setItem(KEY, JSON.stringify(data));
  } catch {
    // sem espaço ou modo privado: segue sem salvar
  }
}
