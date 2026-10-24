import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#000000',
  // ponytail: canvas fixo 960×600 (o console 80×25 do Clássico); a campanha decide se precisa de outro layout
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 600 },
  scene: [MenuScene],
});
