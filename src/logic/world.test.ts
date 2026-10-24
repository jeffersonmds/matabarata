import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld, aliveRoaches, CHINELO_SPEED, POWER_TTL_MS, SLOW_MS, SPAWN_SAFE_DIST, type World, type WorldEvent } from './world';
import { START, type LevelData } from './level';
import { dist, inRect } from './geometry';

const half = () => 0.5;
function lcg(seed = 7) {
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
}
function level(over: Partial<LevelData> = {}): LevelData {
  return { id: 't', name: 'Teste', roaches: { comum: 1 }, breedEveryMs: 100000, limit: 10, targetMs: 30000, obstacles: [], powerUps: [], ...over };
}
/** Mundo com baratas Comum em posições escolhidas (passos de 1 ms quase não as movem). */
function world(roaches: [number, number][], over: Partial<LevelData> = {}): World {
  const w = createWorld(level(over), half);
  w.roaches = roaches.map(([x, y], i) => ({ id: 100 + i, kind: 'comum' as const, x, y, heading: 0, turnInMs: 1e9, dead: false }));
  return w;
}
const kills = (ev: WorldEvent[]) => ev.flatMap((e) => (e.type === 'kill' ? [e.points] : []));

describe('createWorld', () => {
  it('espalha as baratas por tipo, fora dos móveis e longe do chinelo', () => {
    const mesa = { x: 0, y: 0, w: 900, h: 500 };
    const w = createWorld(level({ roaches: { comum: 4, ligeira: 2 }, obstacles: [mesa] }), lcg());
    expect(w.roaches.filter((r) => r.kind === 'comum')).toHaveLength(4);
    expect(w.roaches.filter((r) => r.kind === 'ligeira')).toHaveLength(2);
    for (const r of w.roaches) {
      expect(inRect(r, mesa)).toBe(false);
      expect(dist(r, START)).toBeGreaterThanOrEqual(SPAWN_SAFE_DIST);
    }
  });
});

describe('chinelo', () => {
  it('anda no máximo na velocidade dele até o alvo', () => {
    const w = world([[100, 100]]);
    stepWorld(w, 100, { x: 450, y: 0 }, half);
    expect(w.chinelo.x).toBeCloseTo(450);
    expect(w.chinelo.y).toBeCloseTo(START.y - CHINELO_SPEED * 0.1);
  });

  it('não atravessa móvel', () => {
    const w = world([[100, 100]], { obstacles: [{ x: 300, y: 850, w: 300, h: 100 }] });
    for (let i = 0; i < 10; i++) stepWorld(w, 50, { x: 450, y: 700 }, half);
    expect(w.chinelo.y).toBeGreaterThanOrEqual(950 + 38 - 0.001);
  });
});

describe('acertos', () => {
  it('encostar mata; duas no mesmo instante fazem combo', () => {
    const w = world([[450, 1010], [480, 1050], [100, 100]]);
    expect(kills(stepWorld(w, 1, null, half))).toEqual([100, 150]);
    expect(aliveRoaches(w)).toHaveLength(1);
  });

  it('combo recomeça depois de 1,5 s', () => {
    const w = world([[450, 1010], [100, 100], [100, 300]]);
    stepWorld(w, 1, null, half);
    stepWorld(w, 1600, null, half);
    w.roaches.push({ id: 200, kind: 'comum', x: 450, y: 1010, heading: 0, turnInMs: 1e9, dead: false });
    expect(kills(stepWorld(w, 1, null, half))).toEqual([100]);
  });

  it('barata com o centro debaixo de um móvel está escondida', () => {
    const w = world([[490, 1040], [100, 100]], { obstacles: [{ x: 470, y: 1000, w: 100, h: 100 }] });
    expect(kills(stepWorld(w, 1, null, half))).toEqual([]);
  });

  it('chinelada mata tudo no raio e se gasta', () => {
    const w = world([[450, 1010], [450, 900], [300, 1050], [100, 100]]);
    w.chineladaArmed = true;
    expect(kills(stepWorld(w, 1, null, half))).toHaveLength(3);
    expect(aliveRoaches(w)).toHaveLength(1);
    expect(w.chineladaArmed).toBe(false);
  });
});

describe('infestação e fim', () => {
  it('nasce um filhote do mesmo tipo ao lado de uma barata', () => {
    const w = world([[100, 100], [800, 200]], { breedEveryMs: 1000 });
    const ev = stepWorld(w, 1000, null, half);
    const spawn = ev.find((e) => e.type === 'spawn');
    expect(spawn).toBeDefined();
    expect(aliveRoaches(w)).toHaveLength(3);
    const child = aliveRoaches(w)[2];
    expect(child.kind).toBe('comum');
    expect(Math.min(...w.roaches.slice(0, 2).map((r) => dist(r, child)))).toBeLessThanOrEqual(31);
  });

  it('chegar exatamente no limite ainda não perde', () => {
    const w = world([[100, 100], [800, 200]], { limit: 3, breedEveryMs: 1000 });
    stepWorld(w, 1000, null, half);
    expect([aliveRoaches(w).length, w.status]).toEqual([3, 'playing']);
  });

  it('power-up não nasce em cima do chinelo', () => {
    const w = world([[100, 100]], { powerUps: [{ kind: 'isca', atMs: 1 }] });
    w.chinelo = { x: 450, y: 600 }; // onde o ponto livre cairia com rand = 0,5
    const ev = stepWorld(w, 1, null, lcg());
    expect(ev.some((e) => e.type === 'power-pick')).toBe(false);
    expect(dist(w.powerUps[0], w.chinelo)).toBeGreaterThanOrEqual(SPAWN_SAFE_DIST);
  });

  it('passar do limite perde e o mundo para', () => {
    const w = world([[100, 100], [800, 200], [100, 500]], { limit: 3, breedEveryMs: 1000 });
    const ev = stepWorld(w, 1000, null, half);
    expect(ev.some((e) => e.type === 'lost')).toBe(true);
    expect(w.status).toBe('lost');
    expect(stepWorld(w, 1000, null, half)).toEqual([]);
  });

  it('matar a última vence e o mundo para', () => {
    const w = world([[450, 1010]]);
    expect(stepWorld(w, 1, null, half).some((e) => e.type === 'won')).toBe(true);
    expect(w.status).toBe('won');
    expect(stepWorld(w, 1, null, half)).toEqual([]);
  });

  it('guarda a maior infestação', () => {
    const w = world([[100, 100], [800, 200]], { limit: 4, breedEveryMs: 1000 });
    stepWorld(w, 1000, null, half);
    expect(w.maxInfestation).toBeCloseTo(0.75);
  });
});

describe('power-ups', () => {
  it('aparece no atMs e some sozinho depois de 8 s', () => {
    const w = world([[100, 100]], { powerUps: [{ kind: 'inseticida', atMs: 500 }] });
    expect(stepWorld(w, 400, null, half).some((e) => e.type === 'power-spawn')).toBe(false);
    expect(stepWorld(w, 100, null, half).some((e) => e.type === 'power-spawn')).toBe(true);
    expect(stepWorld(w, POWER_TTL_MS, null, half).some((e) => e.type === 'power-expire')).toBe(true);
    expect(w.powerUps).toEqual([]);
  });

  it('pegar inseticida deixa as baratas lentas por 5 s', () => {
    const w = world([[100, 100]]);
    w.powerUps.push({ id: 1, kind: 'inseticida', x: START.x, y: START.y, expiresMs: 99999 });
    expect(stepWorld(w, 1, null, half).some((e) => e.type === 'power-pick')).toBe(true);
    expect(w.slowUntilMs).toBe(1 + SLOW_MS);
  });

  it('pegar isca põe a isca onde ela estava', () => {
    const w = world([[100, 100]]);
    w.powerUps.push({ id: 1, kind: 'isca', x: START.x, y: START.y - 20, expiresMs: 99999 });
    stepWorld(w, 1, null, half);
    expect(w.bait).toMatchObject({ x: START.x, y: START.y - 20 });
  });
});
