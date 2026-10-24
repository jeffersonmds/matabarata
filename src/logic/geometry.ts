export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export const inRect = (p: Vec, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Empurra um círculo pra fora do retângulo. Sem sobreposição devolve o próprio `c`. */
export function pushOutOfRect(c: Vec, radius: number, r: Rect): Vec {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
  const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
  const dx = c.x - nx;
  const dy = c.y - ny;
  const d = Math.hypot(dx, dy);
  if (d >= radius) return c;
  if (d > 0) return { x: nx + (dx / d) * radius, y: ny + (dy / d) * radius };
  // centro dentro do retângulo: sai pelo lado mais perto
  const left = c.x - r.x;
  const right = r.x + r.w - c.x;
  const top = c.y - r.y;
  const bottom = r.y + r.h - c.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: r.x - radius, y: c.y };
  if (m === right) return { x: r.x + r.w + radius, y: c.y };
  if (m === top) return { x: c.x, y: r.y - radius };
  return { x: c.x, y: r.y + r.h + radius };
}

export function clampToArena(c: Vec, radius: number, w: number, h: number): Vec {
  return { x: Math.min(w - radius, Math.max(radius, c.x)), y: Math.min(h - radius, Math.max(radius, c.y)) };
}
