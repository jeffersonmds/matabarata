import Phaser from 'phaser';
import { loadSave } from '../save';

const FONT = 'system-ui, "Segoe UI", sans-serif';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    const cx = this.scale.width / 2;
    this.cameras.main.setBackgroundColor('#ffd27a');

    this.add
      .text(cx, 120, 'MATA BARATA', { fontFamily: FONT, fontSize: '84px', fontStyle: '900', color: '#7a3b10' })
      .setOrigin(0.5)
      .setShadow(0, 6, '#00000033', 0);
    this.add
      .text(cx, 195, 'REMASTERED', { fontFamily: FONT, fontSize: '28px', fontStyle: '800', color: '#e8513a' })
      .setOrigin(0.5);

    this.button(cx, 320, 'Modo Clássico', () => this.scene.start('classic'));
    this.button(cx, 410, 'Campanha — em breve');

    const best = loadSave().classicBest;
    if (best > 0) {
      this.add
        .text(cx, 520, `Recorde do Clássico: ${best}`, { fontFamily: FONT, fontSize: '24px', fontStyle: '700', color: '#5a3300' })
        .setOrigin(0.5);
    }

    this.input.keyboard?.once('keydown-ONE', () => this.scene.start('classic'));
  }

  /** Botão sem onClick = desabilitado (cinza). */
  private button(x: number, y: number, label: string, onClick?: () => void) {
    const bg = this.add.rectangle(x, y, 420, 70, onClick ? 0x2a9df4 : 0xbbbbbb).setStrokeStyle(5, 0xffffff);
    this.add.text(x, y, label, { fontFamily: FONT, fontSize: '30px', fontStyle: '800', color: '#ffffff' }).setOrigin(0.5);
    if (onClick) bg.setInteractive({ useHandCursor: true }).on('pointerup', onClick);
  }
}
