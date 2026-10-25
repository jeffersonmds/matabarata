import Phaser from 'phaser';
import { setMuted } from '../audio/beeper';
import { loadSave } from '../save';
import { fitCamera } from './ui';

export const BACKGROUNDS = ['titulo', 'cozinha-piso', 'cozinha-mesa', 'cozinha-balcao', 'cozinha-concluida'] as const;
/** Personagens do Flow (PNG transparente); carregam como `sprite-<nome>`. */
export const SPRITES = ['chinelo', 'barata-comum', 'barata-ligeira'] as const;

/** Carrega a arte com barra de progresso. Imagem que falhar não trava: as cenas usam o desenho provisório. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    fitCamera(this, 960, 600);
    this.add.rectangle(480, 300, 400, 24).setStrokeStyle(3, 0xffd27a);
    const bar = this.add.rectangle(280, 300, 0, 24, 0xffd27a).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => bar.setSize(400 * p, 24));
    for (const key of BACKGROUNDS) this.load.image(key, `bg/${key}.webp`);
    for (const key of SPRITES) this.load.image(`sprite-${key}`, `sprites/${key}.png`);
  }

  create() {
    setMuted(loadSave().muted);
    this.scene.start('menu');
  }
}
