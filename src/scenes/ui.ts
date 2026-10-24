import Phaser from 'phaser';
import { coverCrop } from '../logic/cover';
import type { Rect } from '../logic/geometry';

export const FONT = 'system-ui, "Segoe UI", sans-serif';

/** Encaixa a área de design (w×h) na tela inteira, centralizada, e reencaixa quando a janela muda. */
export function fitCamera(scene: Phaser.Scene, w: number, h: number): void {
  const fit = () => {
    const cam = scene.cameras.main;
    cam.setZoom(Math.min(scene.scale.width / w, scene.scale.height / h));
    cam.centerOn(w / 2, h / 2);
  };
  fit();
  scene.scale.on('resize', fit);
  scene.events.once('shutdown', () => scene.scale.off('resize', fit));
}

export function text(scene: Phaser.Scene, x: number, y: number, s: string, size: number, color = '#5a3300', weight = '800') {
  // resolution 2: o zoom da câmera amplia o texto; ponytail: canvas em px CSS (sem devicePixelRatio), telas retina ficam um pouco suaves
  return scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight, color, resolution: 2 }).setOrigin(0.5);
}

/** Botão arredondado. Sem onClick = desabilitado (cinza). Devolve as peças pra quem quiser pôr num container. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick?: () => void,
  color = 0x2a9df4,
): [Phaser.GameObjects.Graphics, Phaser.GameObjects.Text, Phaser.GameObjects.Zone] {
  const g = scene.add.graphics();
  g.fillStyle(onClick ? color : 0xbbbbbb).fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
  g.lineStyle(5, 0xffffff).strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
  const t = text(scene, x, y, label, Math.round(h * 0.42), '#ffffff');
  const zone = scene.add.zone(x, y, w, h);
  if (onClick) zone.setInteractive({ useHandCursor: true }).on('pointerup', onClick);
  return [g, t, zone];
}

/** Imagem que preenche o retângulo sem distorcer (corta as sobras). */
export function coverImage(scene: Phaser.Scene, key: string, r: Rect): Phaser.GameObjects.Image {
  const src = scene.textures.get(key).getSourceImage() as { width: number; height: number };
  const c = coverCrop(src.width, src.height, r.w, r.h);
  const s = r.w / c.w;
  // com crop, posição e origin continuam relativas à imagem inteira
  return scene.add.image(r.x - c.x * s, r.y - c.y * s, key).setOrigin(0).setScale(s).setCrop(c.x, c.y, c.w, c.h);
}
