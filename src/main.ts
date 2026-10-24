import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { ClassicScene } from './scenes/ClassicScene';
import { MapScene } from './scenes/MapScene';
import { LevelScene } from './scenes/LevelScene';
import { ResultScene } from './scenes/ResultScene';
import { unlockAudio } from './audio/beeper';

for (const ev of ['pointerdown', 'keydown'] as const) addEventListener(ev, unlockAudio);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#000000',
  // canvas do tamanho da janela; cada cena encaixa sua área de design com fitCamera (scenes/ui.ts)
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [MenuScene, ClassicScene, MapScene, LevelScene, ResultScene],
});
