import Phaser from 'phaser';
import { loadSave } from '../save';
import { fitCamera, text, button } from './ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    fitCamera(this, 960, 600);
    this.cameras.main.setBackgroundColor('#ffd27a');

    text(this, 480, 120, 'MATA BARATA', 84, '#7a3b10', '900').setShadow(0, 6, '#00000033', 0);
    text(this, 480, 195, 'REMASTERED', 28, '#e8513a');

    button(this, 480, 320, 420, 70, 'Modo Clássico', () => this.scene.start('classic'));
    button(this, 480, 410, 420, 70, 'Campanha', () => this.scene.start('map'), 0x3fbf6a);

    const best = loadSave().classicBest;
    if (best > 0) text(this, 480, 520, `Recorde do Clássico: ${best}`, 24, '#5a3300', '700');

    this.input.keyboard?.once('keydown-ONE', () => this.scene.start('classic'));
    this.input.keyboard?.once('keydown-TWO', () => this.scene.start('map'));
  }
}
