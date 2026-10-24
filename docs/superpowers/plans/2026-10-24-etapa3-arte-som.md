# Etapa 3 — Arte do Google Flow + som — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pôr no jogo a arte gerada no Google Flow (fundo do menu, piso, mesa, balcão, ícone, tela de Cozinha concluída) e dar som à campanha (efeitos + música), com botão de mudo salvo.

**Architecture:** Uma `BootScene` carrega as imagens de `public/bg/*.webp` com barra de progresso; as cenas usam `coverImage` (recorte sem distorção, com a conta pura em `logic/cover.ts`) e caem no desenho provisório se a imagem faltar. O áudio passa por um ganho mestre em `audio/beeper.ts` (mudo = ganho 0); efeitos e música são sintetizados com Web Audio em `audio/sfx.ts` e `audio/music.ts` — sem arquivos de terceiros, sem licença a conferir, funciona offline.

**Tech Stack:** Vite 8, Phaser 3.90, TypeScript 5, Vitest. Repo `C:\repos\matabarata`, branch `etapa3`.

**Já feito antes deste plano:** originais do Flow em `art/flow/*.jpg`; `scripts/prep-art.py` gerou `public/bg/{titulo,cozinha-piso,cozinha-mesa,cozinha-balcao,cozinha-concluida}.webp` e `public/{icon-192,icon-512,apple-touch-icon}.png`.

**Decisões:**
- Móvel sai do formato do obstáculo: largura ÷ altura ≥ 1,8 → balcão; senão mesa (vale pra Cozinha).
- A imagem de conclusão aparece no resultado ao vencer a última fase da Cozinha ("Cozinha limpa!").
- Música e efeitos sintetizados (a spec previa CC0 baixado; síntese cumpre o mesmo objetivo — sem IA, sem licença — sem download).

Código, comentários e commits em **português**; commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Crie/edite arquivos com Write/Edit, nunca com heredoc do Bash.**

---

### Task 1: Arte no jogo

**Files:**
- Create: `src/logic/cover.ts`, `src/logic/cover.test.ts`, `src/scenes/BootScene.ts`
- Modify: `src/scenes/ui.ts`, `src/scenes/LevelScene.ts`, `src/scenes/MenuScene.ts`, `src/scenes/ResultScene.ts`, `src/main.ts`, `vite.config.ts`, `index.html`
- Delete: `public/icon.svg`

- [ ] **Step 1: Teste `src/logic/cover.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { coverCrop } from './cover';

describe('coverCrop', () => {
  it('mesma proporção usa a imagem inteira', () => {
    expect(coverCrop(900, 1200, 450, 600)).toEqual({ x: 0, y: 0, w: 900, h: 1200 });
  });

  it('imagem quadrada num retângulo largo corta em cima e embaixo', () => {
    expect(coverCrop(600, 600, 300, 200)).toEqual({ x: 0, y: 100, w: 600, h: 400 });
  });

  it('imagem larga numa área menos larga corta dos lados', () => {
    const c = coverCrop(1376, 768, 960, 600);
    expect(c.y).toBe(0);
    expect(c.h).toBe(768);
    expect(c.w).toBeCloseTo(1228.8);
    expect(c.x).toBeCloseTo(73.6);
  });
});
```

Run `npm test` → FAIL ("Failed to resolve import ./cover").

- [ ] **Step 2: `src/logic/cover.ts`**

```ts
import type { Rect } from './geometry';

/** Parte da imagem (iw×ih) que preenche w×h sem distorcer, centralizada — como o `object-fit: cover` do CSS. */
export function coverCrop(iw: number, ih: number, w: number, h: number): Rect {
  const s = Math.max(w / iw, h / ih);
  const cw = w / s;
  const ch = h / s;
  return { x: (iw - cw) / 2, y: (ih - ch) / 2, w: cw, h: ch };
}
```

Run `npm test` → PASS (88 testes).

- [ ] **Step 3: `coverImage` em `src/scenes/ui.ts`**

Imports no topo:

```ts
import { coverCrop } from '../logic/cover';
import type { Rect } from '../logic/geometry';
```

E no fim do arquivo:

```ts
/** Imagem que preenche o retângulo sem distorcer (corta as sobras). */
export function coverImage(scene: Phaser.Scene, key: string, r: Rect): Phaser.GameObjects.Image {
  const src = scene.textures.get(key).getSourceImage();
  const c = coverCrop(src.width, src.height, r.w, r.h);
  const s = r.w / c.w;
  // com crop, posição e origin continuam relativas à imagem inteira
  return scene.add.image(r.x - c.x * s, r.y - c.y * s, key).setOrigin(0).setScale(s).setCrop(c.x, c.y, c.w, c.h);
}
```

- [ ] **Step 4: `src/scenes/BootScene.ts`**

```ts
import Phaser from 'phaser';
import { fitCamera } from './ui';

export const BACKGROUNDS = ['titulo', 'cozinha-piso', 'cozinha-mesa', 'cozinha-balcao', 'cozinha-concluida'] as const;

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
  }

  create() {
    this.scene.start('menu');
  }
}
```

- [ ] **Step 5: `src/main.ts`** — importar `BootScene` e pô-la **primeiro** na lista:

```ts
import { BootScene } from './scenes/BootScene';
```

```ts
  scene: [BootScene, MenuScene, ClassicScene, MapScene, LevelScene, ResultScene],
```

- [ ] **Step 6: Piso e móveis em `src/scenes/LevelScene.ts`**

Imports: acrescentar `coverImage` ao import de `./ui` e `type Rect` ao import de `../logic/geometry` (que hoje traz `type Vec`).

Em `create()`, trocar a linha do `tileSprite` e o laço dos obstáculos:

```ts
    this.add.tileSprite(0, HUD_H, ARENA_W, ARENA_H, 'floor').setOrigin(0);
    for (const o of level.obstacles) {
      this.add.rectangle(o.x, HUD_H + o.y, o.w, o.h, 0xb07a46).setOrigin(0).setStrokeStyle(6, 0x6b4423).setDepth(3);
    }
```

por:

```ts
    if (this.textures.exists('cozinha-piso')) coverImage(this, 'cozinha-piso', { x: 0, y: HUD_H, w: ARENA_W, h: ARENA_H });
    else this.add.tileSprite(0, HUD_H, ARENA_W, ARENA_H, 'floor').setOrigin(0);
    for (const o of level.obstacles) this.addObstacle(o);
```

e acrescentar o método:

```ts
  private addObstacle(o: Rect) {
    const r = { x: o.x, y: HUD_H + o.y, w: o.w, h: o.h };
    // ponytail: o móvel sai do formato (comprido = balcão, senão mesa); cenários novos trazem os seus móveis
    const key = o.w / o.h >= 1.8 ? 'cozinha-balcao' : 'cozinha-mesa';
    this.add.rectangle(r.x + 8, r.y + 10, r.w, r.h, 0x000000, 0.25).setOrigin(0).setDepth(3); // sombra
    if (this.textures.exists(key)) coverImage(this, key, r).setDepth(3);
    else this.add.rectangle(r.x, r.y, r.w, r.h, 0xb07a46).setOrigin(0).setDepth(3);
    this.add.rectangle(r.x, r.y, r.w, r.h).setOrigin(0).setStrokeStyle(6, 0x3b1d0b).setDepth(3);
  }
```

- [ ] **Step 7: Fundo do menu em `src/scenes/MenuScene.ts`**

Acrescentar `coverImage` ao import de `./ui`. Logo depois de `setBackgroundColor`:

```ts
    if (this.textures.exists('titulo')) coverImage(this, 'titulo', { x: 0, y: 0, w: 960, h: 600 });
```

e dar contorno branco aos textos pra lerem bem sobre a ilustração: acrescentar `.setStroke('#ffffff', 10)` ao texto `MATA BARATA`, `.setStroke('#ffffff', 6)` ao `REMASTERED` e ao do recorde.

- [ ] **Step 8: Cozinha concluída em `src/scenes/ResultScene.ts`**

Acrescentar `coverImage` ao import de `./ui`. No começo de `create`, depois de `setBackgroundColor`:

```ts
    const kitchenDone = d.won && d.index === LEVELS.length - 1;
    if (kitchenDone && this.textures.exists('cozinha-concluida')) {
      coverImage(this, 'cozinha-concluida', { x: 0, y: 0, w: VIEW_W, h: VIEW_H });
      this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0xffffff, 0.3).setOrigin(0);
    }
```

Trocar o título por:

```ts
    text(this, cx, 230, kitchenDone ? 'Cozinha limpa!' : d.won ? 'Fase limpa!' : 'Infestou!', 96, d.won ? '#7a3b10' : '#9b2c1c', '900').setStroke('#ffffff', 10);
```

e acrescentar `.setStroke('#ffffff', 6)` aos textos do nome da fase, dos pontos e do "NOVO RECORDE!".

- [ ] **Step 9: Ícone e cache offline**

`vite.config.ts`: `includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']`; trocar o comentário `// ponytail: só SVG...` e a linha `icons` por:

```ts
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
```

e `globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}']`.

`index.html`: `<link rel="icon" href="icon-192.png" />` e `<link rel="apple-touch-icon" href="apple-touch-icon.png" />`. Apagar `public/icon.svg` (`git rm`).

- [ ] **Step 10: Verificar e commitar**

Run `npm run build && npm test` → sem erro; 88 testes. Conferir que `dist/sw.js` precacheia os `.webp` e PNGs (`grep -o 'bg/[a-z-]*\.webp' dist/sw.js`). Teste visual fica pendente se não houver navegador.

```bash
git add -A src vite.config.ts index.html public/icon.svg
git commit -m "feat: arte do Google Flow no menu, nas fases e no resultado; ícone PNG"
```

---

### Task 2: Som da campanha e botão de mudo

**Files:**
- Modify: `src/audio/beeper.ts`, `src/save.ts`, `src/save.test.ts`, `src/logic/progress.test.ts`, `src/scenes/ui.ts`, `src/scenes/BootScene.ts`, `src/scenes/MenuScene.ts`, `src/scenes/LevelScene.ts`
- Create: `src/audio/sfx.ts`, `src/audio/music.ts`

- [ ] **Step 1: Save guarda o mudo — testes primeiro**

Em `src/save.test.ts`:
- no teste "lê o que gravou", acrescentar `muted: true` ao objeto `data`;
- no teste "fase com registro inválido…", a expectativa vira `{ classicBest: 10, levels: { c: { stars: 3, best: 50 } }, muted: false }`;
- no teste "save da etapa 1…", a expectativa vira `{ classicBest: 5000, levels: {}, muted: false }`;
- acrescentar:

```ts
  it('mudo só liga com true de verdade', () => {
    expect(parseSave('{"muted":true}').muted).toBe(true);
    expect(parseSave('{"muted":"sim"}').muted).toBe(false);
  });
```

Em `src/logic/progress.test.ts`, o helper vira:

```ts
const save = (levels: SaveData['levels'] = {}): SaveData => ({ classicBest: 0, levels, muted: false });
```

Run `npm test` → FAIL.

- [ ] **Step 2: `src/save.ts`**

- `SaveData` ganha `muted: boolean;`
- `EMPTY` vira `{ classicBest: 0, levels: {}, muted: false }`
- o `return` de sucesso de `parseSave` vira `return { classicBest: isCount(d?.classicBest) ? d.classicBest : 0, levels, muted: d?.muted === true };`
- os dois `return { classicBest: 0, levels: {} };` (catch de `parseSave` e de `loadSave`) viram `return { classicBest: 0, levels: {}, muted: false };`

Run `npm test` → PASS (89 testes).

- [ ] **Step 3: `src/audio/beeper.ts` (substituir o arquivo inteiro)**

```ts
// Áudio do jogo: um contexto e um ganho mestre (mudo = ganho 0). Os bips do Clássico imitam o Beep() de 2013.
export type Note = readonly [hz: number, ms: number];

export const KILL_BEEP: Note = [400, 50];
export const GAME_OVER: Note[] = [[196, 500], [292, 100], [350, 300], [330, 500], [306, 800]];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

/** O iOS só libera áudio depois de um gesto do usuário: chamado em todo toque/tecla. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    }
    if (ctx.state !== 'running') void ctx.resume(); // iOS também usa 'interrupted' (ligação, troca de app)
  } catch {
    ctx = null; // sem áudio: o jogo segue mudo
    master = null;
  }
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master) master.gain.value = m ? 0 : 1;
}

export const isMuted = () => muted;

/** Contexto pronto pra tocar, ou null (sem áudio ou ainda não liberado). */
export function audio(): { ctx: AudioContext; out: GainNode } | null {
  return ctx && master && ctx.state === 'running' ? { ctx, out: master } : null;
}

/** Toca as notas em sequência, como os Beep() bloqueantes do original. */
export function play(notes: readonly Note[]): void {
  const a = audio();
  if (!a) return;
  let t = a.ctx.currentTime;
  for (const [hz, ms] of notes) {
    const osc = a.ctx.createOscillator();
    const gain = a.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = hz;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(a.out);
    osc.start(t);
    osc.stop(t + ms / 1000);
    t += ms / 1000;
  }
}
```

- [ ] **Step 4: `src/audio/sfx.ts`**

```ts
import { audio } from './beeper';

// Efeitos sintetizados (nada de arquivo de terceiros): tons com envelope curto e um ruído filtrado pro "PAF!".

function tone(f0: number, f1: number, ms: number, wave: OscillatorType, vol: number, delayMs = 0): void {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + delayMs / 1000;
  const d = ms / 1000;
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + d);
}

function noise(ms: number, vol: number): void {
  const a = audio();
  if (!a) return;
  const len = Math.floor((a.ctx.sampleRate * ms) / 1000);
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.ctx.createBufferSource();
  const filter = a.ctx.createBiquadFilter();
  const g = a.ctx.createGain();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(filter).connect(g).connect(a.out);
  src.start();
}

export const sfx = {
  /** Chinelada: estalo + baque grave. */
  paf: () => {
    noise(90, 0.35);
    tone(160, 50, 140, 'sine', 0.35);
  },
  /** Combo: bip que sobe a cada barata da sequência. */
  combo: (streak: number) => {
    const f = 440 * Math.pow(2, Math.min(streak, 8) / 6);
    tone(f, f * 1.5, 90, 'square', 0.08, 60);
  },
  /** Nasceu um filhote: guinchinho. */
  spawn: () => tone(1400, 2200, 60, 'triangle', 0.05),
  power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 90, 'square', 0.08, i * 70)),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, i < 5 ? 120 : 400, 'square', 0.1, i * 120)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, i < 3 ? 180 : 500, 'triangle', 0.14, i * 200)),
  click: () => tone(880, 660, 50, 'square', 0.06),
};
```

- [ ] **Step 5: `src/audio/music.ts`**

```ts
import { audio } from './beeper';

// Musiquinha 8-bit da Cozinha, gerada no código: 16 colcheias de melodia + baixo em loop, 112 BPM.
const STEP_S = 60 / 112 / 2;
// notas MIDI; 0 = pausa
const MELODY = [72, 0, 76, 79, 0, 76, 74, 72, 74, 0, 77, 81, 0, 79, 77, 74];
const BASS = [48, 0, 55, 0, 48, 0, 55, 0, 50, 0, 57, 0, 53, 0, 55, 0];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextAt = 0;

function note(a: { ctx: AudioContext; out: GainNode }, midi: number, t: number, wave: OscillatorType, vol: number): void {
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = wave;
  osc.frequency.value = hz(midi);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + STEP_S * 0.9);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + STEP_S);
}

/** Agenda as notas um pouco à frente do relógio do áudio (timer de 50 ms, janela de 200 ms). */
export function startMusic(): void {
  if (timer) return;
  step = 0;
  nextAt = 0;
  timer = setInterval(() => {
    const a = audio();
    if (!a) return;
    if (nextAt < a.ctx.currentTime) nextAt = a.ctx.currentTime + 0.05;
    while (nextAt < a.ctx.currentTime + 0.2) {
      const i = step % MELODY.length;
      if (MELODY[i]) note(a, MELODY[i], nextAt, 'square', 0.035);
      if (BASS[i]) note(a, BASS[i], nextAt, 'triangle', 0.08);
      nextAt += STEP_S;
      step++;
    }
  }, 50);
}

export function stopMusic(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
```

- [ ] **Step 6: Clique nos botões e alternar mudo em `src/scenes/ui.ts`**

Imports:

```ts
import { sfx } from '../audio/sfx';
import { isMuted, setMuted } from '../audio/beeper';
import { loadSave, writeSave } from '../save';
```

Em `button()`, trocar `zone.setInteractive({ useHandCursor: true }).on('pointerup', onClick);` por:

```ts
  if (onClick) {
    zone.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      sfx.click();
      onClick();
    });
  }
```

(e apagar a linha `if (onClick) ...` antiga). No fim do arquivo:

```ts
/** Liga/desliga o som e guarda a escolha. Devolve o novo estado (true = mudo). */
export function toggleMute(): boolean {
  const muted = !isMuted();
  setMuted(muted);
  writeSave({ ...loadSave(), muted });
  return muted;
}
```

- [ ] **Step 7: Aplicar o mudo salvo em `src/scenes/BootScene.ts`**

Imports `import { setMuted } from '../audio/beeper';` e `import { loadSave } from '../save';`; em `create()`, antes de `this.scene.start('menu')`:

```ts
    setMuted(loadSave().muted);
```

- [ ] **Step 8: Botão de som no menu (`src/scenes/MenuScene.ts`)**

Acrescentar `toggleMute` ao import de `./ui` e `import { isMuted } from '../audio/beeper';`. No fim de `create()`:

```ts
    const sound = text(this, 910, 50, isMuted() ? '🔇' : '🔊', 40);
    sound.setInteractive({ useHandCursor: true }).on('pointerup', () => sound.setText(toggleMute() ? '🔇' : '🔊'));
```

- [ ] **Step 9: Som na fase (`src/scenes/LevelScene.ts`)**

Imports: `import { sfx } from '../audio/sfx';`, `import { startMusic, stopMusic } from '../audio/music';`, `import { isMuted } from '../audio/beeper';` e `toggleMute` no import de `./ui`.

- Fim de `create()`:

```ts
    startMusic();
    this.events.once('shutdown', stopMusic);
```

- Em `onEvent`: no `case 'kill'`, antes do `this.splat(...)`: `sfx.paf(); if (e.streak > 1) sfx.combo(e.streak);` — no `case 'spawn'`: `sfx.spawn();` — no `case 'power-pick'`: `sfx.power();`.
- Em `finish()`, no começo: `stopMusic(); if (won) sfx.win(); else sfx.lose();`
- Em `togglePause()`: no ramo que **fecha** a pausa, acrescentar `startMusic();`; no ramo que **abre**, acrescentar `stopMusic();` e um 4º botão no container, depois do "Mapa":

```ts
        ...this.soundButton(cx, cy + 320),
```

com o método:

```ts
  private soundButton(x: number, y: number) {
    const label = () => `Som: ${isMuted() ? 'desligado' : 'ligado'}`;
    const parts = button(this, x, y, 420, 90, label(), () => {
      toggleMute();
      parts[1].setText(label());
    }, 0x3fbf6a);
    return parts;
  }
```

- [ ] **Step 10: Verificar e commitar**

Run `npm run build && npm test` → sem erro; 89 testes.

```bash
git add src
git commit -m "feat: som da campanha (efeitos e música sintetizados) e botão de mudo"
```

---

### Task 3: Documentação

- [ ] `CLAUDE.md`, seção Arquitetura: trocar a linha "Sprites provisórios em vetor (`art/textures.ts`); fundos virão do Google Flow (etapa 3)." por:

```markdown
- Arte: originais do Google Flow em `art/flow/` (prompts em `docs/prompts-flow.md`); `python scripts/prep-art.py`
  gera os `.webp` de `public/bg/` e os ícones PNG. `BootScene` carrega tudo; cena usa `coverImage` e cai no desenho
  provisório (`art/textures.ts`) se a imagem faltar. Personagens continuam vetoriais.
- Som: tudo passa pelo ganho mestre de `audio/beeper.ts` (mudo salvo em `save.muted`). Efeitos (`audio/sfx.ts`) e música
  (`audio/music.ts`) são sintetizados com Web Audio — sem arquivos de terceiros.
```

Commit: `docs: arte e som no CLAUDE.md`.
