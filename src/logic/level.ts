import { pushOutOfRect, type Rect, type Vec } from './geometry';

// Arena da campanha em coordenadas próprias (em pé, 3:4); a cena desenha logo abaixo do HUD.
export const ARENA_W = 900;
export const ARENA_H = 1200;
export const START: Vec = { x: 450, y: 1050 };
export const CHINELO_RADIUS = 38;
export const MIN_OBSTACLE = 100;

export const ROACH_KINDS = ['comum', 'ligeira'] as const;
export const POWER_KINDS = ['inseticida', 'chinelada', 'isca'] as const;
export type RoachKind = (typeof ROACH_KINDS)[number];
export type PowerKind = (typeof POWER_KINDS)[number];

export interface LevelData {
  id: string;
  name: string;
  roaches: Partial<Record<RoachKind, number>>;
  /** A cada quantos ms nasce um filhote. */
  breedEveryMs: number;
  /** Vivas acima disto = derrota. */
  limit: number;
  /** Vencer até este tempo vale a 2ª estrela. */
  targetMs: number;
  obstacles: Rect[];
  powerUps: { kind: PowerKind; atMs: number }[];
}

/** Lista de problemas da fase; vazia = válida. */
export function validateLevel(d: LevelData): string[] {
  const errors: string[] = [];
  const counts = Object.entries(d.roaches);
  const total = counts.reduce((sum, [, n]) => sum + (n ?? 0), 0);
  if (total < 1) errors.push('sem baratas');
  if (!(d.limit > total)) errors.push('limit precisa ser maior que as baratas iniciais');
  if (!(d.breedEveryMs >= 1000)) errors.push('breedEveryMs abaixo de 1000');
  if (!(d.targetMs > 0)) errors.push('targetMs inválido');
  for (const [kind, n] of counts) {
    if (!(ROACH_KINDS as readonly string[]).includes(kind)) errors.push(`barata desconhecida: ${kind}`);
    if (!Number.isInteger(n) || n! < 1) errors.push(`quantidade inválida de ${kind}`);
  }
  d.obstacles.forEach((o, i) => {
    // negado: NaN também cai aqui
    if (!(o.w > 0 && o.h > 0 && o.x >= 0 && o.y >= 0 && o.x + o.w <= ARENA_W && o.y + o.h <= ARENA_H)) errors.push(`obstáculo ${i} fora da arena`);
    // o chinelo anda até 45 px por quadro (900 px/s × 50 ms): mais fino que isso ele atravessa
    if (o.w < MIN_OBSTACLE || o.h < MIN_OBSTACLE) errors.push(`obstáculo ${i} fino demais`);
    // pushOutOfRect devolve o mesmo objeto quando não há sobreposição
    if (pushOutOfRect(START, CHINELO_RADIUS, o) !== START) errors.push(`obstáculo ${i} em cima do chinelo`);
  });
  for (const p of d.powerUps) {
    if (!(POWER_KINDS as readonly string[]).includes(p.kind) || !(p.atMs >= 0)) errors.push(`power-up inválido: ${p.kind}`);
  }
  return errors;
}
