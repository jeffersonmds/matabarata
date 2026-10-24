import { describe, it, expect } from 'vitest';
import { steerRoach, ROACH, type Roach, type SteerCtx } from './roach';

const roach = (over: Partial<Roach> = {}): Roach => ({
  id: 1, kind: 'comum', x: 450, y: 600, heading: 0, turnInMs: 1e9, dead: false, ...over,
});
const ctx = (over: Partial<SteerCtx> = {}): SteerCtx => ({ chinelo: { x: 0, y: 0 }, slow: false, bait: null, ...over });
const half = () => 0.5;

describe('steerRoach', () => {
  it('passeia na velocidade base', () => {
    const r = roach();
    steerRoach(r, ctx(), 1000, half);
    expect(r.x).toBeCloseTo(450 + ROACH.comum.speed);
    expect(r.y).toBeCloseTo(600);
  });

  it('a ligeira é mais rápida', () => {
    const r = roach({ kind: 'ligeira' });
    steerRoach(r, ctx(), 1000, half);
    expect(r.x).toBeCloseTo(450 + ROACH.ligeira.speed);
  });

  it('foge do chinelo perto, na velocidade de fuga', () => {
    const r = roach({ heading: Math.PI });
    steerRoach(r, ctx({ chinelo: { x: 350, y: 600 } }), 100, half);
    expect(r.x).toBeCloseTo(450 + ROACH.comum.flee * 0.1);
  });

  it('inseticida deixa a 40%', () => {
    const r = roach();
    steerRoach(r, ctx({ slow: true }), 1000, half);
    expect(r.x).toBeCloseTo(450 + ROACH.comum.speed * 0.4);
  });

  it('com isca vai até ela em vez de fugir', () => {
    const r = roach();
    steerRoach(r, ctx({ chinelo: { x: 350, y: 600 }, bait: { x: 450, y: 900 } }), 100, half);
    expect(r.x).toBeCloseTo(450);
    expect(r.y).toBeCloseTo(600 + ROACH.comum.speed * 0.1);
  });

  it('muda de rumo quando acaba o tempo', () => {
    const r = roach({ turnInMs: 0 });
    steerRoach(r, ctx(), 10, () => 1);
    expect(r.heading).toBeCloseTo(Math.PI / 2);
    expect(r.turnInMs).toBe(ROACH.comum.turnMaxMs);
  });

  it('bate na parede, volta pra dentro e inverte o rumo', () => {
    const r = roach({ x: 880 });
    steerRoach(r, ctx(), 1000, half);
    expect(r.x).toBeLessThanOrEqual(900 - ROACH.comum.radius);
    expect(Math.cos(r.heading)).toBeLessThan(0);
  });
});
