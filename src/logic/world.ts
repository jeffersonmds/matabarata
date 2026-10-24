import { dist, inRect, clampToArena, pushOutOfRect, type Vec } from './geometry';
import { ARENA_W, ARENA_H, START, CHINELO_RADIUS, type LevelData, type PowerKind, type RoachKind } from './level';
import { steerRoach, ROACH, type Roach } from './roach';
import { newScore, registerKill, type ScoreState } from './scoring';

// Ajuste de balanceamento é aqui e nos JSON das fases.
export const CHINELO_SPEED = 900;
export const SPAWN_SAFE_DIST = 300;
export const POWER_RADIUS = 34;
export const POWER_TTL_MS = 8000;
export const SLOW_MS = 5000;
export const BAIT_MS = 4000;
export const AREA_RADIUS = 170;

export interface PowerUp {
  id: number;
  kind: PowerKind;
  x: number;
  y: number;
  expiresMs: number;
}

export type WorldEvent =
  | { type: 'kill'; roach: Roach; points: number; streak: number }
  | { type: 'spawn'; roach: Roach }
  | { type: 'power-spawn'; power: PowerUp }
  | { type: 'power-pick'; power: PowerUp }
  | { type: 'power-expire'; power: PowerUp }
  | { type: 'won' }
  | { type: 'lost' };

export interface World {
  level: LevelData;
  elapsedMs: number;
  chinelo: Vec;
  roaches: Roach[];
  powerUps: PowerUp[];
  /** Power-ups que ainda vão aparecer, em ordem de atMs. */
  pendingPowers: { kind: PowerKind; atMs: number }[];
  nextBreedMs: number;
  slowUntilMs: number;
  bait: (Vec & { untilMs: number }) | null;
  chineladaArmed: boolean;
  score: ScoreState;
  maxInfestation: number;
  status: 'playing' | 'won' | 'lost';
  nextId: number;
}

export const aliveRoaches = (w: World) => w.roaches.filter((r) => !r.dead);
export const infestation = (w: World) => aliveRoaches(w).length / w.level.limit;
const hidden = (w: World, p: Vec) => w.level.obstacles.some((o) => inRect(p, o));

/** Ponto livre: fora dos móveis e longe do início do chinelo (50 tentativas; ponytail: depois disso aceita o último). */
function freePoint(level: LevelData, rand: () => number): Vec {
  let p: Vec = { x: ARENA_W / 2, y: ARENA_H / 4 };
  for (let i = 0; i < 50; i++) {
    p = { x: 40 + rand() * (ARENA_W - 80), y: 40 + rand() * (ARENA_H - 80) };
    if (dist(p, START) >= SPAWN_SAFE_DIST && !level.obstacles.some((o) => inRect(p, o))) break;
  }
  return p;
}

function newRoach(w: World, kind: RoachKind, p: Vec, rand: () => number): Roach {
  return { id: w.nextId++, kind, x: p.x, y: p.y, heading: rand() * Math.PI * 2, turnInMs: 0, dead: false };
}

export function createWorld(level: LevelData, rand: () => number): World {
  const w: World = {
    level,
    elapsedMs: 0,
    chinelo: { ...START },
    roaches: [],
    powerUps: [],
    pendingPowers: [...level.powerUps].sort((a, b) => a.atMs - b.atMs),
    nextBreedMs: level.breedEveryMs,
    slowUntilMs: 0,
    bait: null,
    chineladaArmed: false,
    score: newScore(),
    maxInfestation: 0,
    status: 'playing',
    nextId: 1,
  };
  for (const [kind, n] of Object.entries(level.roaches) as [RoachKind, number][]) {
    for (let i = 0; i < n; i++) w.roaches.push(newRoach(w, kind, freePoint(level, rand), rand));
  }
  w.maxInfestation = infestation(w);
  return w;
}

/** Avança o mundo `dtMs`. `target` = para onde o dedo/mouse aponta (null = chinelo parado). */
export function stepWorld(w: World, dtMs: number, target: Vec | null, rand: () => number): WorldEvent[] {
  if (w.status !== 'playing') return [];
  const ev: WorldEvent[] = [];
  w.elapsedMs += dtMs;
  const now = w.elapsedMs;

  moveChinelo(w, dtMs, target);

  while (w.pendingPowers.length && w.pendingPowers[0].atMs <= now) {
    const { kind } = w.pendingPowers.shift()!;
    const p = freePoint(w.level, rand);
    const power: PowerUp = { id: w.nextId++, kind, x: p.x, y: p.y, expiresMs: now + POWER_TTL_MS };
    w.powerUps.push(power);
    ev.push({ type: 'power-spawn', power });
  }
  for (const power of [...w.powerUps]) {
    if (dist(power, w.chinelo) < CHINELO_RADIUS + POWER_RADIUS) {
      applyPower(w, power, now);
      ev.push({ type: 'power-pick', power });
    } else if (now >= power.expiresMs) {
      ev.push({ type: 'power-expire', power });
    } else {
      continue;
    }
    w.powerUps.splice(w.powerUps.indexOf(power), 1);
  }
  if (w.bait && now >= w.bait.untilMs) w.bait = null;

  const ctx = { chinelo: w.chinelo, slow: now < w.slowUntilMs, bait: w.bait };
  for (const r of aliveRoaches(w)) steerRoach(r, ctx, dtMs, rand);

  for (const r of aliveRoaches(w)) {
    if (r.dead || hidden(w, r) || dist(r, w.chinelo) >= CHINELO_RADIUS + ROACH[r.kind].radius) continue;
    const victims = w.chineladaArmed
      ? aliveRoaches(w).filter((o) => !hidden(w, o) && dist(o, w.chinelo) <= AREA_RADIUS)
      : [r];
    w.chineladaArmed = false;
    for (const v of victims) {
      v.dead = true;
      const points = registerKill(w.score, now);
      ev.push({ type: 'kill', roach: v, points, streak: w.score.streak });
    }
  }

  if (now >= w.nextBreedMs) {
    w.nextBreedMs += w.level.breedEveryMs;
    const alive = aliveRoaches(w);
    if (alive.length) {
      const parent = alive[Math.floor(rand() * alive.length)];
      const near = { x: parent.x + (rand() - 0.5) * 60, y: parent.y + (rand() - 0.5) * 60 };
      const child = newRoach(w, parent.kind, clampToArena(near, ROACH[parent.kind].radius, ARENA_W, ARENA_H), rand);
      w.roaches.push(child);
      ev.push({ type: 'spawn', roach: child });
    }
  }

  const alive = aliveRoaches(w).length;
  w.maxInfestation = Math.max(w.maxInfestation, alive / w.level.limit);
  if (alive === 0) {
    w.status = 'won';
    ev.push({ type: 'won' });
  } else if (alive > w.level.limit) {
    w.status = 'lost';
    ev.push({ type: 'lost' });
  }
  return ev;
}

function moveChinelo(w: World, dtMs: number, target: Vec | null): void {
  if (!target) return;
  const d = dist(w.chinelo, target);
  const max = (CHINELO_SPEED * dtMs) / 1000;
  let p: Vec = d <= max
    ? { x: target.x, y: target.y }
    : { x: w.chinelo.x + ((target.x - w.chinelo.x) / d) * max, y: w.chinelo.y + ((target.y - w.chinelo.y) / d) * max };
  p = clampToArena(p, CHINELO_RADIUS, ARENA_W, ARENA_H);
  for (const o of w.level.obstacles) p = pushOutOfRect(p, CHINELO_RADIUS, o);
  w.chinelo = p;
}

function applyPower(w: World, p: PowerUp, now: number): void {
  if (p.kind === 'inseticida') w.slowUntilMs = now + SLOW_MS;
  else if (p.kind === 'chinelada') w.chineladaArmed = true;
  else w.bait = { x: p.x, y: p.y, untilMs: now + BAIT_MS };
}
