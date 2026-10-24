import Phaser from 'phaser';
import { LEVELS } from '../levels';
import { isUnlocked, totalStars } from '../logic/progress';
import type { Vec } from '../logic/geometry';
import { loadSave } from '../save';
import { fitCamera, button, text } from './ui';
import { VIEW_W, VIEW_H } from './LevelScene';

// ponytail: trilha fixa das 5 fases da Cozinha; Banheiro e Quintal (etapa 4) ganham suas trilhas
const NODES: Vec[] = [
  { x: 250, y: 1120 },
  { x: 620, y: 960 },
  { x: 330, y: 780 },
  { x: 640, y: 590 },
  { x: 420, y: 400 },
];

export class MapScene extends Phaser.Scene {
  constructor() {
    super('map');
  }

  create() {
    fitCamera(this, VIEW_W, VIEW_H);
    this.cameras.main.setBackgroundColor('#ffd27a');
    const save = loadSave();
    const ids = LEVELS.map((l) => l.id);

    button(this, 110, 70, 180, 70, '← Menu', () => this.scene.start('menu'), 0x7a3b10);
    text(this, VIEW_W - 140, 70, `★ ${totalStars(save)}/${LEVELS.length * 3}`, 34, '#7a3b10', '900');
    text(this, VIEW_W / 2, 200, 'Cozinha', 72, '#7a3b10', '900');

    const path = this.add.graphics().fillStyle(0xc98a3c);
    for (let i = 1; i < NODES.length; i++) {
      const a = NODES[i - 1];
      const b = NODES[i];
      const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 34);
      for (let k = 1; k < n; k++) path.fillCircle(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n, 7);
    }

    LEVELS.forEach((level, i) => {
      const { x, y } = NODES[i];
      const rec = save.levels[level.id];
      const open = isUnlocked(ids, i, save);
      const node = this.add.circle(x, y, 62, !open ? 0xbbbbbb : rec ? 0x3fbf6a : 0x2a9df4).setStrokeStyle(8, 0xffffff);
      text(this, x, y, open ? String(i + 1) : '🔒', 48, '#ffffff', '900');
      if (!open) return;
      const stars = rec?.stars ?? 0;
      text(this, x, y + 90, '★'.repeat(stars) + '☆'.repeat(3 - stars), 34, '#e0a100', '900');
      node.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('level', { index: i }));
      if (!rec) this.tweens.add({ targets: node, scale: 1.1, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
    });
  }
}
