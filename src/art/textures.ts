import Phaser from 'phaser';

// Personagens provisórios em vetor, virados pra direita (rumo 0). O Google Flow só faz os fundos (etapa 3).
const OUTLINE = 0x3b1d0b;
type G = Phaser.GameObjects.Graphics;

export function ensureTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('chinelo')) return;
  draw(scene, 'roach-comum', 76, 52, (g) => roach(g, 0x8a4b23, 0x5c2f14));
  draw(scene, 'roach-ligeira', 76, 52, (g) => roach(g, 0xb5452a, 0x7a2412));
  draw(scene, 'chinelo', 120, 70, chinelo);
  draw(scene, 'power-inseticida', 80, 80, (g) => power(g, 0x3fbf6a, inseticida));
  draw(scene, 'power-chinelada', 80, 80, (g) => power(g, 0xf28c28, chinelada));
  draw(scene, 'power-isca', 80, 80, (g) => power(g, 0xf2c94c, isca));
  draw(scene, 'floor', 120, 120, floor);
}

function draw(scene: Phaser.Scene, key: string, w: number, h: number, paint: (g: G) => void): void {
  const g = scene.make.graphics({}, false);
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Corpo centrado em (32, 26): a cena usa origin (0.42, 0.5). */
function roach(g: G, body: number, head: number): void {
  const cx = 32;
  const cy = 26;
  g.lineStyle(3, OUTLINE);
  for (const dx of [-10, 0, 10]) {
    g.lineBetween(cx + dx, cy - 8, cx + dx - 7, cy - 22);
    g.lineBetween(cx + dx, cy + 8, cx + dx - 7, cy + 22);
  }
  g.lineBetween(cx + 24, cy - 3, cx + 42, cy - 16);
  g.lineBetween(cx + 24, cy + 3, cx + 42, cy + 16);
  g.fillStyle(body).fillEllipse(cx, cy, 44, 26).strokeEllipse(cx, cy, 44, 26);
  g.fillStyle(head).fillCircle(cx + 22, cy, 9).strokeCircle(cx + 22, cy, 9);
  g.fillStyle(0xffffff).fillCircle(cx + 25, cy - 3, 2.5);
}

function chinelo(g: G): void {
  const cx = 60;
  const cy = 35;
  g.fillStyle(0x2a9df4).fillEllipse(cx, cy, 104, 52);
  g.lineStyle(5, 0x0b4f8a).strokeEllipse(cx, cy, 104, 52);
  g.lineStyle(8, 0xffffff);
  g.lineBetween(cx + 22, cy, cx - 4, cy - 18);
  g.lineBetween(cx + 22, cy, cx - 4, cy + 18);
}

function power(g: G, ring: number, icon: (g: G) => void): void {
  g.fillStyle(0xffffff).fillCircle(40, 40, 34);
  g.lineStyle(6, ring).strokeCircle(40, 40, 34);
  icon(g);
}

function inseticida(g: G): void {
  g.fillStyle(0x3fbf6a).fillRoundedRect(30, 26, 20, 34, 5);
  g.fillStyle(0x2a2a2a).fillRect(34, 18, 12, 8);
  g.fillStyle(0xffffff).fillRect(33, 36, 14, 8);
}

function chinelada(g: G): void {
  const points = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? 10 : 24;
    const a = (i * Math.PI) / 8;
    points.push({ x: 40 + Math.cos(a) * r, y: 40 + Math.sin(a) * r });
  }
  g.fillStyle(0xf28c28).fillPoints(points, true);
}

function isca(g: G): void {
  g.fillStyle(0xf2c94c).fillTriangle(22, 54, 58, 54, 40, 24);
  g.fillStyle(0xd9a92e).fillCircle(36, 46, 4).fillCircle(46, 50, 3);
}

function floor(g: G): void {
  g.fillStyle(0xf6efe2).fillRect(0, 0, 120, 120);
  g.fillStyle(0xe9dcc5).fillRect(0, 0, 60, 60).fillRect(60, 60, 60, 60);
  g.lineStyle(2, 0xdccdb2).strokeRect(0, 0, 120, 120);
}
