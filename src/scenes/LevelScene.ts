import Phaser from 'phaser';
import { LEVELS } from '../levels';
import { ARENA_W, ARENA_H, type PowerKind } from '../logic/level';
import { createWorld, stepWorld, infestation, aliveRoaches, type World, type WorldEvent } from '../logic/world';
import { starsFor } from '../logic/scoring';
import { recordResult } from '../logic/progress';
import type { Roach } from '../logic/roach';
import type { Rect, Vec } from '../logic/geometry';
import { loadSave, writeSave } from '../save';
import { ensureTextures } from '../art/textures';
import { sfx } from '../audio/sfx';
import { startMusic, stopMusic } from '../audio/music';
import { isMuted } from '../audio/beeper';
import { fitCamera, button, text, coverImage, toggleMute } from './ui';

// Área de design: faixa do HUD em cima + arena (coordenadas da arena + HUD_H no eixo y).
export const HUD_H = 120;
export const VIEW_W = ARENA_W;
export const VIEW_H = ARENA_H + HUD_H;
const POWER_LABEL: Record<PowerKind, string> = { inseticida: 'INSETICIDA!', chinelada: 'CHINELADA!', isca: 'ISCA!' };

export class LevelScene extends Phaser.Scene {
  private index = 0;
  private w!: World;
  private roachImgs = new Map<number, Phaser.GameObjects.Image>();
  private powerImgs = new Map<number, Phaser.GameObjects.Image>();
  private chinelo!: Phaser.GameObjects.Image;
  private bar!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private target: Vec | null = null;
  private pauseLayer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('level');
  }

  init(data: { index: number }) {
    this.index = data.index;
  }

  create() {
    ensureTextures(this);
    fitCamera(this, VIEW_W, VIEW_H);
    this.cameras.main.setBackgroundColor('#ffd27a');
    const level = LEVELS[this.index];
    this.w = createWorld(level, Math.random);
    this.roachImgs.clear();
    this.powerImgs.clear();
    this.target = null;
    this.pauseLayer = null;

    if (this.textures.exists('cozinha-piso')) coverImage(this, 'cozinha-piso', { x: 0, y: HUD_H, w: ARENA_W, h: ARENA_H });
    else this.add.tileSprite(0, HUD_H, ARENA_W, ARENA_H, 'floor').setOrigin(0);
    for (const o of level.obstacles) this.addObstacle(o);
    for (const r of this.w.roaches) this.addRoach(r, false);
    this.chinelo = this.add.image(this.w.chinelo.x, HUD_H + this.w.chinelo.y, 'chinelo').setDepth(4);
    this.drawHud(level.name);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.aim(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.aim(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) this.target = null;
    });
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    startMusic();
    this.events.once('shutdown', stopMusic);
  }

  private addObstacle(o: Rect) {
    const r = { x: o.x, y: HUD_H + o.y, w: o.w, h: o.h };
    // ponytail: o móvel sai do formato (comprido = balcão, senão mesa); cenários novos trazem os seus móveis
    const key = o.w / o.h >= 1.8 ? 'cozinha-balcao' : 'cozinha-mesa';
    this.add.rectangle(r.x + 8, r.y + 10, r.w, r.h, 0x000000, 0.25).setOrigin(0).setDepth(3); // sombra
    if (this.textures.exists(key)) coverImage(this, key, r).setDepth(3);
    else this.add.rectangle(r.x, r.y, r.w, r.h, 0xb07a46).setOrigin(0).setDepth(3);
    this.add.rectangle(r.x, r.y, r.w, r.h).setOrigin(0).setStrokeStyle(6, 0x3b1d0b).setDepth(3);
  }

  update(time: number, delta: number) {
    if (this.pauseLayer || this.w.status !== 'playing') return;
    // teto evita um salto enorme depois de um engasgo
    for (const e of stepWorld(this.w, Math.min(delta, 50), this.target, Math.random)) this.onEvent(e);
    this.sync(time);
  }

  /** Mouse: segue sempre. Toque: só com o dedo na tela. Em cima do HUD não mira (ir até o botão II não arrasta o chinelo). */
  private aim(p: Phaser.Input.Pointer) {
    if (this.pauseLayer || (p.wasTouch && !p.isDown) || p.worldY < HUD_H) return;
    this.target = { x: p.worldX, y: p.worldY - HUD_H };
  }

  private onEvent(e: WorldEvent) {
    switch (e.type) {
      case 'kill':
        sfx.paf();
        if (e.streak > 1) sfx.combo(e.streak);
        this.splat(e.roach, e.streak);
        break;
      case 'spawn':
        sfx.spawn();
        this.addRoach(e.roach, true);
        break;
      case 'power-spawn': {
        const img = this.add.image(e.power.x, HUD_H + e.power.y, `power-${e.power.kind}`).setDepth(2.5);
        this.tweens.add({ targets: img, y: img.y - 10, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
        this.powerImgs.set(e.power.id, img);
        break;
      }
      case 'power-pick':
        sfx.power();
        this.popText(e.power.x, e.power.y, POWER_LABEL[e.power.kind], '#3fbf6a');
        this.removePower(e.power.id);
        break;
      case 'power-expire':
        this.removePower(e.power.id);
        break;
      case 'won':
      case 'lost':
        this.finish(e.type === 'won');
        break;
    }
  }

  private sync(time: number) {
    const slow = this.w.elapsedMs < this.w.slowUntilMs;
    for (const r of aliveRoaches(this.w)) {
      const img = this.roachImgs.get(r.id);
      if (!img) continue;
      img.setPosition(r.x, HUD_H + r.y).setRotation(r.heading);
      img.scaleY = img.scaleX * (1 + 0.1 * Math.sin(time / 35 + r.id)); // "passinhos"
      img.setTint(slow ? 0xa8e6a8 : 0xffffff);
    }
    const c = this.w.chinelo;
    const dx = c.x - this.chinelo.x;
    const dy = HUD_H + c.y - this.chinelo.y;
    if (Math.hypot(dx, dy) > 1) this.chinelo.setRotation(Math.atan2(dy, dx));
    this.chinelo.setPosition(c.x, HUD_H + c.y).setTint(this.w.chineladaArmed ? 0xffb347 : 0xffffff);
    this.updateHud();
  }

  private addRoach(r: Roach, animate: boolean) {
    const img = this.add.image(r.x, HUD_H + r.y, `roach-${r.kind}`).setOrigin(0.42, 0.5).setDepth(2);
    const size = r.kind === 'ligeira' ? 0.85 : 1;
    img.setScale(animate ? 0 : size);
    if (animate) this.tweens.add({ targets: img, scale: size, duration: 300, ease: 'Back.out' });
    this.roachImgs.set(r.id, img);
  }

  private splat(r: Roach, streak: number) {
    const img = this.roachImgs.get(r.id);
    this.roachImgs.delete(r.id);
    if (img) {
      this.tweens.killTweensOf(img);
      img.setTint(0x3b1d0b);
      this.tweens.add({ targets: img, scaleY: 0.2, alpha: 0, duration: 450, onComplete: () => img.destroy() });
    }
    this.popText(r.x, r.y, 'PAF!', '#e8513a');
    if (streak > 1) this.popText(r.x, r.y + 40, `COMBO x${streak}`, '#2a9df4', 28);
    this.cameras.main.shake(60, 0.004);
  }

  private removePower(id: number) {
    const img = this.powerImgs.get(id);
    this.powerImgs.delete(id);
    if (!img) return;
    this.tweens.killTweensOf(img);
    this.tweens.add({ targets: img, scale: 1.5, alpha: 0, duration: 250, onComplete: () => img.destroy() });
  }

  private popText(x: number, y: number, s: string, color: string, size = 40) {
    const t = text(this, x, HUD_H + y, s, size, color, '900').setDepth(6).setStroke('#ffffff', 6);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 700, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  private drawHud(name: string) {
    this.add.rectangle(0, 0, VIEW_W, HUD_H, 0xffe7a8).setOrigin(0).setDepth(9);
    for (const o of button(this, 60, 40, 80, 56, 'II', () => this.togglePause(), 0x7a3b10)) o.setDepth(10);
    text(this, VIEW_W / 2, 40, `Fase ${this.index + 1} · ${name}`, 30, '#7a3b10', '900').setDepth(10);
    this.scoreText = text(this, VIEW_W - 90, 40, '0', 30, '#5a3300', '900').setDepth(10);
    text(this, 40, 88, 'INFESTAÇÃO', 18).setOrigin(0, 0.5).setDepth(10);
    this.bar = this.add.graphics().setDepth(10);
    this.updateHud();
  }

  private updateHud() {
    const f = Math.min(1, infestation(this.w));
    const x = 170;
    const y = 78;
    const w = VIEW_W - x - 40;
    const h = 20;
    this.bar.clear();
    this.bar.fillStyle(0xffffff).fillRoundedRect(x, y, w, h, h / 2);
    const color = f < 0.5 ? 0x3fbf6a : f < 0.8 ? 0xf2c94c : 0xe8513a;
    this.bar.fillStyle(color).fillRoundedRect(x, y, Math.max(h, w * f), h, h / 2);
    this.scoreText.setText(`${this.w.score.score} pts`);
  }

  private togglePause() {
    if (this.w.status !== 'playing') return;
    if (this.pauseLayer) {
      this.pauseLayer.destroy();
      this.pauseLayer = null;
      this.tweens.resumeAll();
      startMusic();
      return;
    }
    this.tweens.pauseAll();
    stopMusic();
    this.target = null;
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    this.pauseLayer = this.add
      .container(0, 0, [
        // retângulo interativo engole os cliques no jogo por baixo
        this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.55).setOrigin(0).setInteractive(),
        text(this, cx, cy - 200, 'PAUSADO', 72, '#ffffff', '900'),
        ...button(this, cx, cy - 40, 420, 90, 'Continuar', () => this.togglePause()),
        ...button(this, cx, cy + 80, 420, 90, 'Reiniciar', () => this.scene.restart({ index: this.index }), 0xf2994a),
        ...button(this, cx, cy + 200, 420, 90, 'Mapa', () => this.scene.start('map'), 0x7a3b10),
        ...this.soundButton(cx, cy + 320),
      ])
      .setDepth(20);
  }

  private soundButton(x: number, y: number) {
    const label = () => `Som: ${isMuted() ? 'desligado' : 'ligado'}`;
    const parts = button(this, x, y, 420, 90, label(), () => {
      toggleMute();
      parts[1].setText(label());
    }, 0x3fbf6a);
    return parts;
  }

  private finish(won: boolean) {
    stopMusic();
    if (won) sfx.win();
    else sfx.lose();
    const level = LEVELS[this.index];
    const score = this.w.score.score;
    const stars = starsFor(won, this.w.elapsedMs, this.w.maxInfestation, level.targetMs);
    let newBest = false;
    if (won) {
      const r = recordResult(loadSave(), level.id, stars, score);
      writeSave(r.save);
      newBest = r.newBest;
    }
    this.time.delayedCall(900, () => this.scene.start('result', { index: this.index, won, stars, score, newBest }));
  }
}
