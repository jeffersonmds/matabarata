import { dist, type Vec } from './geometry';
import { ARENA_W, ARENA_H, type RoachKind } from './level';

export interface Roach {
  id: number;
  kind: RoachKind;
  x: number;
  y: number;
  /** Rumo em radianos (0 = direita). */
  heading: number;
  /** Quanto falta pra sortear um rumo novo ao passear. */
  turnInMs: number;
  dead: boolean;
}

// Velocidades em px da arena por segundo. Ajuste de balanceamento é aqui.
export const ROACH = {
  comum: { speed: 110, flee: 260, fleeRadius: 230, turnMinMs: 800, turnMaxMs: 2000, radius: 22 },
  ligeira: { speed: 240, flee: 360, fleeRadius: 260, turnMinMs: 250, turnMaxMs: 700, radius: 18 },
} as const;

export const SLOW_FACTOR = 0.4;

export interface SteerCtx {
  chinelo: Vec;
  /** Inseticida ativo. */
  slow: boolean;
  /** Isca ativa: todas vão até ela. */
  bait: Vec | null;
}

export function steerRoach(r: Roach, ctx: SteerCtx, dtMs: number, rand: () => number): void {
  const spec = ROACH[r.kind];
  let speed: number = spec.speed;
  if (ctx.bait) {
    r.heading = Math.atan2(ctx.bait.y - r.y, ctx.bait.x - r.x);
  } else if (dist(r, ctx.chinelo) < spec.fleeRadius) {
    r.heading = Math.atan2(r.y - ctx.chinelo.y, r.x - ctx.chinelo.x);
    speed = spec.flee;
  } else {
    r.turnInMs -= dtMs;
    if (r.turnInMs <= 0) {
      r.heading += (rand() - 0.5) * Math.PI;
      r.turnInMs = spec.turnMinMs + rand() * (spec.turnMaxMs - spec.turnMinMs);
    }
  }
  if (ctx.slow) speed *= SLOW_FACTOR;

  const step = (speed * dtMs) / 1000;
  let x = r.x + Math.cos(r.heading) * step;
  let y = r.y + Math.sin(r.heading) * step;
  // parede: reflete o rumo e volta pra dentro
  if (x < spec.radius || x > ARENA_W - spec.radius) {
    r.heading = Math.PI - r.heading;
    x = Math.min(ARENA_W - spec.radius, Math.max(spec.radius, x));
  }
  if (y < spec.radius || y > ARENA_H - spec.radius) {
    r.heading = -r.heading;
    y = Math.min(ARENA_H - spec.radius, Math.max(spec.radius, y));
  }
  r.x = x;
  r.y = y;
}
