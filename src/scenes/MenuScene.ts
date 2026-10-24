import Phaser from 'phaser';
import { loadSave } from '../save';
import { isMuted } from '../audio/beeper';
import { fitCamera, text, button, coverImage, toggleMute } from './ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    fitCamera(this, 960, 600);
    this.cameras.main.setBackgroundColor('#ffd27a');
    if (this.textures.exists('titulo')) coverImage(this, 'titulo', { x: 0, y: 0, w: 960, h: 600 });

    text(this, 480, 120, 'MATA BARATA', 84, '#7a3b10', '900').setShadow(0, 6, '#00000033', 0).setStroke('#ffffff', 10);
    text(this, 480, 195, 'REMASTERED', 28, '#e8513a').setStroke('#ffffff', 6);

    button(this, 480, 320, 420, 70, 'Modo Clássico', () => this.scene.start('classic'));
    button(this, 480, 410, 420, 70, 'Campanha', () => this.scene.start('map'), 0x3fbf6a);

    const best = loadSave().classicBest;
    if (best > 0) text(this, 480, 520, `Recorde do Clássico: ${best}`, 24, '#5a3300', '700').setStroke('#ffffff', 6);

    const sound = text(this, 910, 50, isMuted() ? '🔇' : '🔊', 40);
    sound.setInteractive({ useHandCursor: true }).on('pointerup', () => sound.setText(toggleMute() ? '🔇' : '🔊'));

    this.input.keyboard?.once('keydown-ONE', () => this.scene.start('classic'));
    this.input.keyboard?.once('keydown-TWO', () => this.scene.start('map'));
  }
}
