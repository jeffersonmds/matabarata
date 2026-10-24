import Phaser from 'phaser';
import { newGame, turn, step, CURSOR_FRAMES, type ClassicState, type Dir } from '../logic/classic';
import { swipeDir } from '../logic/swipe';
import { loadSave, writeSave } from '../save';
import { play, KILL_BEEP, GAME_OVER } from '../audio/beeper';
import { CrtPipeline } from './crt';
import { INTRO_ART, RULES, type ArtColor } from './classicArt';
import { fitCamera } from './ui';

// Uma célula do console em px: 80×25 células = canvas de 960×600.
const CW = 12;
const CH = 24;
const FONT = 'Consolas, Menlo, "Courier New", monospace';
const COLOR: Record<ArtColor, string> = { green: '#7dff8f', red: '#ff6a5a', blue: '#5a7dff', white: '#e8ffe8' };

const KEYS: Record<string, Dir> = {
  w: 'up', W: 'up', ArrowUp: 'up',
  s: 'down', S: 'down', ArrowDown: 'down',
  a: 'left', A: 'left', ArrowLeft: 'left',
  d: 'right', D: 'right', ArrowRight: 'right',
};

type Phase = 'intro' | 'rules' | 'play' | 'end';

export class ClassicScene extends Phaser.Scene {
  private phase: Phase = 'intro';
  private g!: ClassicState;
  private acc = 0;
  private best = 0;
  private spacing = 0;
  private layer!: Phaser.GameObjects.Container;
  private roachTexts: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private swipeFrom: { x: number; y: number } | null = null;

  constructor() {
    super('classic');
  }

  create() {
    if (this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.renderer.pipelines.addPostPipeline('crt', CrtPipeline);
      this.cameras.main.setPostPipeline('crt');
    }
    fitCamera(this, 960, 600);
    this.layer = this.add.container();
    this.spacing = this.measureSpacing();
    this.best = loadSave().classicBest;

    // sem repetição: segurar S pra descer e morrer na borda pularia a tela de fim
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => !e.repeat && this.onKey(e.key));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.swipeFrom = { x: p.x, y: p.y }));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onSwipe(p));
    this.input.on('pointerup', () => (this.swipeFrom = null));

    this.showIntro();
  }

  update(_time: number, delta: number) {
    if (this.phase !== 'play' || this.g.status !== 'playing') return;
    // teto evita uma rajada de passos ao voltar de uma aba escondida
    this.acc = Math.min(this.acc + delta, 250);
    while (this.acc >= this.g.stepMs && this.g.status === 'playing') {
      this.acc -= this.g.stepMs;
      const { killed } = step(this.g);
      if (killed) {
        this.g.roaches.forEach((r, i) => this.roachTexts[i].setVisible(!r.dead));
        play(Array(killed).fill(KILL_BEEP));
        this.updateScore();
      }
      this.cursor.setPosition((this.g.x - 1) * CW, (this.g.y - 1) * CH).setText(CURSOR_FRAMES[this.g.frame]);
    }
    // cast: o TS estreita status pra 'playing' pelo return acima, mas step() o muda
    if ((this.g.status as ClassicState['status']) !== 'playing') this.showEnd();
  }

  private showIntro() {
    this.phase = 'intro';
    this.layer.removeAll(true);
    for (const [col, row, color, text] of INTRO_ART) this.put(col, row, text, color);
    this.button(33, 18, '1. Iniciar Jogo', () => this.showRules());
    this.button(33, 19, '2. Sair', () => this.scene.start('menu'));
  }

  private showRules() {
    this.phase = 'rules';
    this.layer.removeAll(true);
    for (const [col, row, color, text] of RULES) this.put(col, row, text, color);
    this.button(19, 23, 'Pressione ENTER para iniciar', () => this.showPlay(), 'green');
  }

  private showPlay() {
    this.phase = 'play';
    this.g = newGame(Math.random);
    this.acc = 0;
    this.layer.removeAll(true);
    this.drawBorder('blue');
    this.roachTexts = this.g.roaches.map((r) => this.put(r.x, r.y, '☼', 'red'));
    this.cursor = this.put(this.g.x, this.g.y, '+', 'green');
    this.scoreText = this.put(1, 24, '', 'white');
    this.updateScore();
    this.button(1, 25, 'ESC para voltar ao menu', () => this.showIntro());
  }

  private showEnd() {
    const won = this.g.status === 'won';
    const score = this.g.score;
    const record = score > this.best;
    if (record) {
      this.best = score;
      writeSave({ ...loadSave(), classicBest: score });
    }

    this.phase = 'end';
    this.layer.removeAll(true);
    if (won) {
      this.drawBorder('green');
      this.put(33, 9, 'PARABENS!!!', 'green');
      this.put(24, 13, 'VOCE MATOU TODAS AS BARATAS!!!', 'green');
      this.put(33, 15, `Pontuação: ${score}`, 'green');
    } else {
      this.drawBorder('red');
      this.put(33, 12, 'Voce Perdeu!', 'red');
      this.put(33, 14, `Pontuação: ${score}`, 'red');
      play(GAME_OVER);
    }
    if (record) this.put(33, 17, 'NOVO RECORDE!', 'white');
    this.put(27, 20, 'Voltar ao menu? (S/N)', 'white');
    // botões só depois de 300 ms: o deslize que matou o jogador pode terminar em cima deles
    this.time.delayedCall(300, () => {
      if (this.phase !== 'end') return;
      this.button(30, 22, '[ S ]', () => this.showIntro());
      this.button(40, 22, '[ N ]', () => this.scene.start('menu'));
    });
  }

  private onKey(key: string) {
    switch (this.phase) {
      case 'intro':
        if (key === '1') this.showRules();
        else if (key === '2') this.scene.start('menu');
        break;
      case 'rules':
        if (key === 'Enter') this.showPlay();
        break;
      case 'play':
        if (key === 'Escape') this.showIntro();
        else if (KEYS[key]) turn(this.g, KEYS[key]);
        break;
      case 'end':
        if (key === 's' || key === 'S') this.showIntro();
        else if (key === 'n' || key === 'N') this.scene.start('menu');
        break;
    }
  }

  /** Muda de direção assim que o dedo anda o bastante, sem esperar soltar. */
  private onSwipe(p: Phaser.Input.Pointer) {
    if (this.phase !== 'play' || !this.swipeFrom) return;
    const dir = swipeDir(p.x - this.swipeFrom.x, p.y - this.swipeFrom.y);
    if (dir) {
      turn(this.g, dir);
      this.swipeFrom = { x: p.x, y: p.y };
    }
  }

  private updateScore() {
    this.scoreText.setText(`Pontos: ${this.g.score}    Recorde: ${this.best}`);
  }

  private drawBorder(color: ArtColor) {
    const row = 'X'.repeat(79);
    this.put(1, 1, row, color);
    this.put(1, 23, row, color);
    for (let y = 2; y <= 22; y++) {
      this.put(1, y, 'X', color);
      this.put(79, y, 'X', color);
    }
  }

  /** Escreve na posição de console (coluna/linha 1-based), como o gotoxy + printf do original. */
  private put(col: number, row: number, text: string, color: ArtColor): Phaser.GameObjects.Text {
    const t = this.add.text((col - 1) * CW, (row - 1) * CH, text, { fontFamily: FONT, fontSize: '20px', color: COLOR[color], resolution: 2 });
    t.setLetterSpacing(this.spacing);
    t.setShadow(0, 0, COLOR[color], 8, false, true);
    this.layer.add(t);
    return t;
  }

  private button(col: number, row: number, text: string, onClick: () => void, color: ArtColor = 'white') {
    this.put(col, row, text, color).setInteractive({ useHandCursor: true }).on('pointerup', onClick);
  }

  /** Espaçamento extra pra cada caractere ocupar exatamente CW px, seja qual for a fonte mono do sistema. */
  private measureSpacing(): number {
    const t = this.add.text(0, 0, 'MMMMMMMMMM', { fontFamily: FONT, fontSize: '20px' });
    const advance = t.width / 10;
    t.destroy();
    return CW - advance;
  }
}
