import Phaser from 'phaser';
import { LEVELS } from '../levels';
import { fitCamera, button, text, coverImage } from './ui';
import { VIEW_W, VIEW_H } from './LevelScene';

interface ResultData {
  index: number;
  won: boolean;
  stars: number;
  score: number;
  newBest: boolean;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result');
  }

  create(d: ResultData) {
    fitCamera(this, VIEW_W, VIEW_H);
    this.cameras.main.setBackgroundColor(d.won ? '#ffd27a' : '#f4b6a8');
    const kitchenDone = d.won && d.index === LEVELS.length - 1;
    if (kitchenDone && this.textures.exists('cozinha-concluida')) {
      coverImage(this, 'cozinha-concluida', { x: 0, y: 0, w: VIEW_W, h: VIEW_H });
      this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0xffffff, 0.3).setOrigin(0);
    }
    const cx = VIEW_W / 2;

    text(this, cx, 230, kitchenDone ? 'Cozinha limpa!' : d.won ? 'Fase limpa!' : 'Infestou!', 96, d.won ? '#7a3b10' : '#9b2c1c', '900').setStroke('#ffffff', 10);
    text(this, cx, 330, `Fase ${d.index + 1} · ${LEVELS[d.index].name}`, 34).setStroke('#ffffff', 6);
    for (let i = 0; i < 3; i++) {
      const star = this.add
        .star(cx + (i - 1) * 160, 520, 5, 34, 74, i < d.stars ? 0xf2c94c : 0xffffff)
        .setStrokeStyle(6, 0x7a3b10)
        .setScale(0);
      this.tweens.add({ targets: star, scale: 1, delay: 250 + i * 220, duration: 350, ease: 'Back.out' });
    }
    text(this, cx, 680, `${d.score} pontos`, 52, '#5a3300', '900').setStroke('#ffffff', 6);
    if (d.newBest) text(this, cx, 750, 'NOVO RECORDE!', 36, '#e8513a', '900').setStroke('#ffffff', 6);

    let y = 900;
    if (d.won && d.index + 1 < LEVELS.length) {
      button(this, cx, y, 480, 100, 'Próxima fase', () => this.scene.start('level', { index: d.index + 1 }), 0x3fbf6a);
      y += 130;
    }
    button(this, cx, y, 480, 100, d.won ? 'Repetir' : 'Tentar de novo', () => this.scene.start('level', { index: d.index }));
    button(this, cx, y + 130, 480, 100, 'Mapa', () => this.scene.start('map'), 0x7a3b10);
  }
}
