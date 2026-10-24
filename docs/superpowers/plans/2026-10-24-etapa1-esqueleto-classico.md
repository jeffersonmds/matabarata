# Etapa 1 — Esqueleto + Modo Clássico — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jogo no navegador com menu e o Modo Clássico fiel ao MataBarata de 2013, instalável (PWA) e publicado no GitHub Pages.

**Architecture:** Vite + Phaser 3 + TypeScript. Toda regra de jogo fica em `src/logic/` (TS puro, sem Phaser, testado com Vitest); as cenas em `src/scenes/` só desenham e repassam entrada. O Clássico usa as coordenadas de console do original (80×25, 1-based; cada célula = 12×24 px num canvas de 960×600).

**Tech Stack:** Node 24, Vite 8, Phaser 3.90.0, TypeScript 5, Vitest, vite-plugin-pwa, GitHub Actions + Pages.

**Referência:** spec `docs/superpowers/specs/2026-10-24-matabarata-remastered-design.md`; código original
`G:\Meu Drive\STUFFS\SENAI\TCC - SENAI\Docs\Jogo_Matabarata\1RV_Lop_baratas.cpp`. Regras extraídas dele:
início em (40,13) parado até a 1ª tecla; perde ao chegar em x=1, x=79, y=1 ou y=23; baratas em x 2–77, y 2–22
(podem repetir célula — morrem juntas); +1000 e −3 ms por barata; passo inicial 100 ms; vence com as 30 mortas.

Código, comentários e commits em **português**. Repositório: `C:\repos\matabarata` (já tem `.gitignore` e o spec).

## Estrutura de arquivos

```
package.json, tsconfig.json, vite.config.ts, index.html
public/icon.svg                ícone do app (provisório até a arte do Google Flow)
src/main.ts                    config do Phaser + liberação de áudio
src/logic/classic.ts           regras de 2013 (estado + step)          + classic.test.ts
src/logic/swipe.ts             deslize → direção                       + swipe.test.ts
src/save.ts                    localStorage versionado, nunca lança     + save.test.ts
src/audio/beeper.ts            bips em onda quadrada (Web Audio)
src/scenes/MenuScene.ts        menu: Clássico | Campanha (em breve)
src/scenes/ClassicScene.ts     abertura → regras → jogo → fim
src/scenes/classicArt.ts       arte ASCII e textos do original
src/scenes/crt.ts              shader de tubo (varredura, curvatura, vinheta)
.github/workflows/deploy.yml   testes + build + Pages
CLAUDE.md
```

---

### Task 1: Esqueleto (Vite + Phaser + TS + Vitest) com o menu

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/scenes/MenuScene.ts`, `src/save.ts`

- [ ] **Step 1: Criar package.json e instalar dependências**

`C:\repos\matabarata\package.json`:

```json
{
  "name": "matabarata",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run --passWithNoTests"
  }
}
```

Run (em `C:\repos\matabarata`):
```bash
npm install phaser@3.90.0
npm install -D typescript@5 vite vitest
```
Expected: `node_modules/` criado, `package-lock.json` gerado, sem erro de peer dependency.

- [ ] **Step 2: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: vite.config.ts**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  // caminhos relativos: funciona na subpasta do GitHub Pages e no zip do itch.io
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
```

- [ ] **Step 4: index.html**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#000000" />
    <link rel="icon" href="icon.svg" />
    <link rel="apple-touch-icon" href="icon.svg" />
    <title>MataBarata Remastered</title>
    <style>
      html, body { margin: 0; height: 100%; background: #000; overflow: hidden; touch-action: none; }
      #game { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: src/save.ts (usado pelo menu; testes na Task 4)**

```ts
// Progresso salvo no navegador. A chave carrega a versão: dado corrompido ou de outra versão = começa do zero.
const KEY = 'matabarata:v1';

export interface SaveData {
  classicBest: number;
}

export const EMPTY: SaveData = { classicBest: 0 };

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function parseSave(raw: string | null): SaveData {
  try {
    const best = JSON.parse(raw ?? '')?.classicBest;
    return Number.isFinite(best) && best >= 0 ? { classicBest: best } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

// O acesso a localStorage fica dentro do try: no modo privado do Safari ele pode lançar.
export function loadSave(store?: Store): SaveData {
  try {
    return parseSave((store ?? localStorage).getItem(KEY));
  } catch {
    return { ...EMPTY };
  }
}

export function writeSave(data: SaveData, store?: Store): void {
  try {
    (store ?? localStorage).setItem(KEY, JSON.stringify(data));
  } catch {
    // sem espaço ou modo privado: segue sem salvar
  }
}
```

- [ ] **Step 6: src/scenes/MenuScene.ts**

```ts
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
```

- [ ] **Step 7: src/main.ts**

```ts
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
```

- [ ] **Step 8: Verificar build, testes e dev**

Run: `npm run build` → Expected: termina sem erro de tipo, gera `dist/`.
Run: `npm test` → Expected: "No test files found", exit 0.
Run: `npm run dev` e abrir a URL mostrada → Expected: fundo amarelo, "MATA BARATA / REMASTERED", botão azul "Modo Clássico" e cinza "Campanha — em breve". Clicar no azul ainda não faz nada (cena `classic` vem na Task 7). Encerrar o dev server.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src
git commit -m "feat: esqueleto Vite + Phaser com o menu"
```

---

### Task 2: Regras do Clássico (lógica pura)

**Files:**
- Create: `src/logic/classic.ts`
- Test: `src/logic/classic.test.ts`

- [ ] **Step 1: Escrever os testes**

`src/logic/classic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { newGame, turn, step, ROACH_COUNT, type ClassicState } from './classic';

/** Jogo com baratas em posições escolhidas. */
function game(roaches: [number, number][]): ClassicState {
  const g = newGame(() => 0);
  g.roaches = roaches.map(([x, y]) => ({ x, y, dead: false }));
  return g;
}

describe('newGame', () => {
  it('começa como em 2013', () => {
    const g = newGame(Math.random);
    expect([g.x, g.y, g.score, g.stepMs, g.status, g.dir]).toEqual([40, 13, 0, 100, 'waiting', null]);
    expect(g.roaches).toHaveLength(ROACH_COUNT);
  });

  it('baratas ficam dentro da arena (x 2..77, y 2..22)', () => {
    expect(newGame(() => 0).roaches[0]).toEqual({ x: 2, y: 2, dead: false });
    expect(newGame(() => 0.9999999).roaches[0]).toEqual({ x: 77, y: 22, dead: false });
  });
});

describe('step', () => {
  it('fica parado até escolher uma direção', () => {
    const g = game([[10, 10]]);
    step(g);
    expect([g.x, g.y]).toEqual([40, 13]);
  });

  it('anda uma célula por passo e continua na mesma direção', () => {
    const g = game([[10, 10]]);
    turn(g, 'right');
    step(g);
    step(g);
    expect([g.x, g.y, g.status]).toEqual([42, 13, 'playing']);
  });

  it.each([
    ['left', 2, 13],
    ['right', 78, 13],
    ['up', 40, 2],
    ['down', 40, 22],
  ] as const)('encostar na borda (%s) perde', (dir, x, y) => {
    const g = game([[10, 10]]);
    g.x = x;
    g.y = y;
    turn(g, dir);
    step(g);
    expect(g.status).toBe('lost');
  });

  it('a última célula antes da borda é segura', () => {
    const g = game([[10, 10]]);
    g.x = 77;
    turn(g, 'right');
    step(g);
    expect([g.x, g.status]).toEqual([78, 'playing']);
  });

  it('matar dá 1000 pontos e acelera 3 ms', () => {
    const g = game([[41, 13], [10, 10]]);
    turn(g, 'right');
    expect(step(g).killed).toBe(1);
    expect([g.score, g.stepMs]).toEqual([1000, 97]);
  });

  it('duas baratas na mesma célula morrem juntas', () => {
    const g = game([[41, 13], [41, 13], [10, 10]]);
    turn(g, 'right');
    expect(step(g).killed).toBe(2);
    expect([g.score, g.stepMs]).toEqual([2000, 94]);
  });

  it('barata morta não conta de novo', () => {
    const g = game([[41, 13], [10, 10]]);
    turn(g, 'right');
    step(g);
    turn(g, 'left');
    step(g);
    expect(g.score).toBe(1000);
  });

  it('matar todas vence e o jogo para', () => {
    const g = game([[41, 13]]);
    turn(g, 'right');
    step(g);
    expect(g.status).toBe('won');
    turn(g, 'left');
    step(g);
    expect([g.x, g.status]).toEqual([41, 'won']);
  });

  it('com as 30 mortas o passo chega a 10 ms', () => {
    const g = game(Array.from({ length: 30 }, (_, i): [number, number] => [41 + i, 13]));
    turn(g, 'right');
    for (let i = 0; i < 30; i++) step(g);
    expect([g.stepMs, g.score, g.status]).toEqual([10, 30000, 'won']);
  });

  it('o cursor gira | / - \\ a cada passo', () => {
    const g = game([[10, 10]]);
    turn(g, 'right');
    const frames = [0, 1, 2, 3, 4].map(() => {
      step(g);
      return g.frame;
    });
    expect(frames).toEqual([1, 2, 3, 0, 1]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — "Failed to resolve import ./classic" (o arquivo ainda não existe).

- [ ] **Step 3: Implementar**

`src/logic/classic.ts`:

```ts
// Regras do MataBarata original (SENAI, 2013), em coordenadas de console 1-based (gotoxy do conio).
// Fiel ao .cpp de propósito: não "conserte" as regras.

export const COLS = 80;
export const ROWS = 25;
export const START_X = 40;
export const START_Y = 13;
export const ROACH_COUNT = 30;
export const START_STEP_MS = 100;
export const STEP_DECREMENT_MS = 3;
export const KILL_POINTS = 1000;

// Chegar numa destas linhas/colunas = game over.
const WALL_LEFT = 1;
const WALL_RIGHT = 79;
const WALL_TOP = 1;
const WALL_BOTTOM = 23;

export const CURSOR_FRAMES = ['|', '/', '-', '\\'];

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Status = 'waiting' | 'playing' | 'lost' | 'won';

export interface Roach {
  x: number;
  y: number;
  dead: boolean;
}

export interface ClassicState {
  x: number;
  y: number;
  dir: Dir | null;
  roaches: Roach[];
  score: number;
  stepMs: number;
  status: Status;
  /** Índice em CURSOR_FRAMES. */
  frame: number;
}

const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** `rand` em [0, 1) — injetado pra teste. Baratas em x 2..77 e y 2..22, como o rand()%78 / %23 do original. */
export function newGame(rand: () => number): ClassicState {
  const roaches: Roach[] = [];
  for (let i = 0; i < ROACH_COUNT; i++) {
    roaches.push({ x: 2 + Math.floor(rand() * 76), y: 2 + Math.floor(rand() * 21), dead: false });
  }
  return { x: START_X, y: START_Y, dir: null, roaches, score: 0, stepMs: START_STEP_MS, status: 'waiting', frame: 0 };
}

/** Escolhe a direção; a primeira escolha começa o jogo. */
export function turn(s: ClassicState, dir: Dir): void {
  if (s.status === 'lost' || s.status === 'won') return;
  s.dir = dir;
  s.status = 'playing';
}

/** Um passo do cursor. Ordem do original: anda, testa borda, mata, testa vitória. */
export function step(s: ClassicState): { killed: number } {
  if (s.status !== 'playing' || !s.dir) return { killed: 0 };
  const [dx, dy] = DELTA[s.dir];
  s.x += dx;
  s.y += dy;
  s.frame = (s.frame + 1) % CURSOR_FRAMES.length;

  if (s.x <= WALL_LEFT || s.x >= WALL_RIGHT || s.y <= WALL_TOP || s.y >= WALL_BOTTOM) {
    s.status = 'lost';
    return { killed: 0 };
  }

  let killed = 0;
  for (const r of s.roaches) {
    if (!r.dead && r.x === s.x && r.y === s.y) {
      r.dead = true;
      killed++;
      s.score += KILL_POINTS;
      s.stepMs -= STEP_DECREMENT_MS;
    }
  }
  if (s.roaches.every((r) => r.dead)) s.status = 'won';
  return { killed };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS — 15 testes em `classic.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/logic
git commit -m "feat: regras do Modo Clássico fiéis a 2013"
```

---

### Task 3: Deslize do dedo → direção

**Files:**
- Create: `src/logic/swipe.ts`
- Test: `src/logic/swipe.test.ts`

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest';
import { swipeDir } from './swipe';

describe('swipeDir', () => {
  it('ignora movimento curto', () => {
    expect(swipeDir(10, -5)).toBeNull();
  });

  it('o eixo dominante decide', () => {
    expect(swipeDir(40, 10)).toBe('right');
    expect(swipeDir(-40, 10)).toBe('left');
    expect(swipeDir(5, 30)).toBe('down');
    expect(swipeDir(5, -30)).toBe('up');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — "Failed to resolve import ./swipe".

- [ ] **Step 3: Implementar**

`src/logic/swipe.ts`:

```ts
import type { Dir } from './classic';

/** Direção de um deslize (dx, dy em px do jogo), ou null se ainda for curto demais. */
export function swipeDir(dx: number, dy: number, min = 24): Dir | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS (17 testes).

- [ ] **Step 5: Commit**

```bash
git add src/logic/swipe.ts src/logic/swipe.test.ts
git commit -m "feat: deslize do dedo vira direção"
```

---

### Task 4: Testes do save

**Files:**
- Test: `src/save.test.ts` (o `src/save.ts` já existe desde a Task 1)

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest';
import { parseSave, loadSave, writeSave, EMPTY } from './save';

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

const broken = {
  getItem: (): string | null => {
    throw new Error('bloqueado');
  },
  setItem: (): void => {
    throw new Error('cheio');
  },
};

describe('save', () => {
  it('lê o que gravou', () => {
    const s = memory();
    writeSave({ classicBest: 5000 }, s);
    expect(loadSave(s)).toEqual({ classicBest: 5000 });
  });

  it.each([null, '', '{', 'null', '{"classicBest":-1}', '{"classicBest":"9"}'])('dado inválido %j começa do zero', (raw) => {
    expect(parseSave(raw)).toEqual(EMPTY);
  });

  it('storage quebrado não lança', () => {
    expect(loadSave(broken)).toEqual(EMPTY);
    expect(() => writeSave({ classicBest: 1 }, broken)).not.toThrow();
  });
});
```

- [ ] **Step 2: Rodar**

Run: `npm test`
Expected: PASS (25 testes). Se algum caso de dado inválido falhar, corrija `parseSave` — não o teste.

- [ ] **Step 3: Commit**

```bash
git add src/save.test.ts
git commit -m "test: save resiste a dado corrompido e storage bloqueado"
```

---

### Task 5: Bips de 2013 (Web Audio)

**Files:**
- Create: `src/audio/beeper.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implementar**

`src/audio/beeper.ts`:

```ts
// Bips em onda quadrada no lugar do Beep() do Windows usado em 2013 (mesmas notas, Hz e ms).
export type Note = readonly [hz: number, ms: number];

export const KILL_BEEP: Note = [400, 50];
export const GAME_OVER: Note[] = [[196, 500], [292, 100], [350, 300], [330, 500], [306, 800]];

let ctx: AudioContext | null = null;

/** O iOS só libera áudio depois de um gesto do usuário: chamado em todo toque/tecla. */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null; // sem áudio: o jogo segue mudo
  }
}

/** Toca as notas em sequência, como os Beep() bloqueantes do original. */
export function play(notes: readonly Note[]): void {
  if (!ctx || ctx.state !== 'running') return;
  let t = ctx.currentTime;
  for (const [hz, ms] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = hz;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000);
    t += ms / 1000;
  }
}
```

- [ ] **Step 2: Liberar o áudio no 1º gesto**

Em `src/main.ts`, adicionar o import e o laço antes do `new Phaser.Game(...)`:

```ts
import { unlockAudio } from './audio/beeper';

for (const ev of ['pointerdown', 'keydown'] as const) addEventListener(ev, unlockAudio);
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run build` → Expected: sem erro.

- [ ] **Step 4: Commit**

```bash
git add src/audio src/main.ts
git commit -m "feat: bips do original em onda quadrada"
```

---

### Task 6: Arte do original e shader de tubo

**Files:**
- Create: `src/scenes/classicArt.ts`, `src/scenes/crt.ts`

- [ ] **Step 1: classicArt.ts**

A arte foi extraída do `show_introducao()` e `regras()` do .cpp (CP437: 177 → `▒`, 20 → `¶`; tabs expandidas; as duas
escritas da linha 22 do original foram fundidas numa só).

```ts
// Arte e textos do MataBarata de 2013: [coluna, linha, cor, texto] em coordenadas de console 1-based.
export type ArtColor = 'red' | 'white' | 'green' | 'blue';
export type ArtLine = readonly [col: number, row: number, color: ArtColor, text: string];

export const INTRO_ART: ArtLine[] = [
  [10, 5, 'red', '▒▒         ▒▒'],
  [10, 6, 'red', ' ▒▒       ▒▒'],
  [10, 7, 'red', '  ▒▒     ▒▒'],
  [10, 8, 'red', '   ▒▒   ▒▒'],
  [10, 9, 'red', '  ¶¶¶¶¶¶¶¶¶'],
  [10, 10, 'red', ' ¶¶¶¶¶¶¶¶¶¶¶'],
  [10, 11, 'red', '¶¶¶¶¶¶¶¶¶¶¶¶¶'],
  [10, 12, 'red', ' ¶¶¶¶¶¶¶¶¶¶¶'],
  [10, 13, 'red', '  ¶¶¶¶¶¶¶¶¶'],
  [10, 14, 'red', '  ¶¶¶¶¶¶¶¶¶¶'],
  [9, 15, 'red', '¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶'],
  [8, 16, 'red', '¶¶¶¶¶¶¶¶oo¶¶¶¶¶¶¶¶'],
  [7, 17, 'red', '¶¶¶¶¶¶¶¶oooo¶¶¶¶¶¶¶¶'],
  [7, 18, 'red', '¶¶¶¶¶¶¶oooooo¶¶¶¶¶¶¶'],
  [7, 19, 'red', '¶¶¶¶¶¶¶oooooo¶¶¶¶¶¶¶'],
  [6, 20, 'red', '¶¶¶¶¶¶¶ooooooc¶¶¶¶¶¶¶'],
  [7, 21, 'red', '¶¶¶¶¶¶¶oooooo¶¶¶¶¶¶¶'],
  [7, 22, 'red', '¶¶¶¶¶¶¶oooooo¶¶¶¶¶¶¶¶'],
  [7, 23, 'red', ' ¶¶¶¶¶  oooo ¶¶¶¶¶¶'],
  [8, 24, 'red', ' ¶¶¶¶   oo  ¶¶¶¶¶'],
  [35, 5, 'white', '▒▒      ▒▒ ▒▒▒▒▒▒▒ ▒▒▒▒▒▒▒▒ ▒▒▒▒▒▒▒'],
  [35, 6, 'white', '▒▒▒▒  ▒▒▒▒ ▒▒   ▒▒    ▒▒    ▒▒   ▒▒'],
  [35, 7, 'white', '▒▒  ▒▒  ▒▒ ▒▒▒▒▒▒▒    ▒▒    ▒▒▒▒▒▒▒'],
  [35, 8, 'white', '▒▒      ▒▒ ▒▒   ▒▒    ▒▒    ▒▒   ▒▒'],
  [30, 10, 'green', '▒▒▒  ▒▒▒▒ ▒▒▒  ▒▒▒▒ ▒▒▒▒▒ ▒▒▒▒'],
  [30, 11, 'green', '▒  ▒ ▒  ▒ ▒  ▒ ▒  ▒   ▒   ▒  ▒'],
  [30, 12, 'green', '▒▒▒  ▒▒▒▒ ▒▒▒  ▒▒▒▒   ▒   ▒▒▒▒    ▒▒▒ ▒▒▒ ▒▒   ▒▒'],
  [30, 13, 'green', '▒  ▒ ▒  ▒ ▒ ▒▒ ▒  ▒   ▒   ▒  ▒    ▒   ▒ ▒ ▒ ▒ ▒ ▒'],
  [30, 14, 'green', '▒▒▒  ▒  ▒ ▒  ▒ ▒  ▒   ▒   ▒  ▒  ▒ ▒▒▒ ▒▒▒ ▒  ▒  ▒'],
];

export const RULES: ArtLine[] = [
  [19, 3, 'red', '--------------------------------------------'],
  [39, 4, 'red', 'REGRAS'],
  [19, 5, 'red', '--------------------------------------------'],
  [19, 7, 'white', '- Use as teclas WASD para se movimentar pelo'],
  [19, 8, 'white', 'campo (no celular, deslize o dedo)'],
  [19, 10, 'white', '- Cuidado para nao encostar nas bordas, caso'],
  [19, 11, 'white', 'isso ocorra, perderá o jogo'],
  [19, 13, 'white', '- Mate todas as baratas e vencerá o jogo'],
  [19, 15, 'white', '- A cada barata que voce matar a velocidade'],
  [19, 16, 'white', 'do cursor irá aumentar'],
  [19, 18, 'red', '--------------------------------------------'],
  [19, 21, 'green', 'BOM JOGO!!!'],
];
```

- [ ] **Step 2: crt.ts**

```ts
import Phaser from 'phaser';

// Tela de tubo: curvatura leve, linhas de varredura e vinheta. Só existe no WebGL (no Canvas o jogo fica sem o efeito).
const frag = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uResolution;
varying vec2 outTexCoord;

void main() {
  vec2 c = outTexCoord * 2.0 - 1.0;
  vec2 uv = c * (1.0 + dot(c.yx, c.yx) * 0.04) * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec3 color = texture2D(uMainSampler, uv).rgb;
  float scan = 0.82 + 0.18 * sin(uv.y * uResolution.y * 2.0);
  float vignette = smoothstep(1.5, 0.5, length(c));
  gl_FragColor = vec4(color * scan * vignette, 1.0);
}`;

export class CrtPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'crt', fragShader: frag });
  }

  onPreRender() {
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run build` → Expected: sem erro.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/classicArt.ts src/scenes/crt.ts
git commit -m "feat: arte de 2013 e shader de tubo"
```

---

### Task 7: Cena do Clássico

**Files:**
- Create: `src/scenes/ClassicScene.ts`
- Modify: `src/main.ts` (registrar a cena)

- [ ] **Step 1: ClassicScene.ts**

```ts
import Phaser from 'phaser';
import { newGame, turn, step, CURSOR_FRAMES, type ClassicState, type Dir } from '../logic/classic';
import { swipeDir } from '../logic/swipe';
import { loadSave, writeSave } from '../save';
import { play, KILL_BEEP, GAME_OVER } from '../audio/beeper';
import { CrtPipeline } from './crt';
import { INTRO_ART, RULES, type ArtColor } from './classicArt';

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
    this.layer = this.add.container();
    this.spacing = this.measureSpacing();
    this.best = loadSave().classicBest;

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e.key));
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
    if (this.g.status === 'lost' || this.g.status === 'won') this.showEnd();
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
    this.button(30, 22, '[ S ]', () => this.showIntro());
    this.button(40, 22, '[ N ]', () => this.scene.start('menu'));
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
    const t = this.add.text((col - 1) * CW, (row - 1) * CH, text, { fontFamily: FONT, fontSize: '20px', color: COLOR[color] });
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
```

- [ ] **Step 2: Registrar a cena em src/main.ts**

Adicionar o import e incluir na lista de cenas:

```ts
import { ClassicScene } from './scenes/ClassicScene';
```

```ts
  scene: [MenuScene, ClassicScene],
```

- [ ] **Step 3: Verificar build e testes**

Run: `npm run build && npm test` → Expected: sem erro de tipo; 25 testes passando.

- [ ] **Step 4: Teste manual no navegador**

Run: `npm run dev`, abrir a URL. Conferir:
1. Menu → "Modo Clássico" abre a abertura: barata vermelha em ASCII, "MATA" branco, "BARATA.COM" verde, opções 1/2; efeito de tubo (linhas de varredura, cantos escuros).
2. Tecla `1` (ou clique) → regras; `Enter` (ou clique na última linha) → arena azul com 30 `☼` vermelhos e `+` verde no meio, parado.
3. Seta/WASD: o cursor anda sozinho girando `| / - \`; passar numa barata some com ela, soa um bip, +1000 e fica mais rápido.
4. Bater na borda: tela vermelha "Voce Perdeu!", melodia de 5 notas, pontuação; `S` volta pra abertura, `N` pro menu.
5. Recorde aparece no rodapé e no menu depois de recarregar a página.
6. DevTools em modo celular: deslizar o dedo muda a direção; botões funcionam por toque.

Se as colunas da arte ficarem desalinhadas (fonte sem `▒`/`¶`), anote qual navegador — não bloqueia a etapa.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/ClassicScene.ts src/main.ts
git commit -m "feat: Modo Clássico jogável (abertura, regras, jogo, fim)"
```

---

### Task 8: PWA (instalável e offline)

**Files:**
- Create: `public/icon.svg`
- Modify: `vite.config.ts`

- [ ] **Step 1: Instalar o plugin**

Run: `npm install -D vite-plugin-pwa`
Expected: instalado sem erro de peer dependency com o Vite 8.

- [ ] **Step 2: public/icon.svg (provisório até a arte do Google Flow)**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#ffd27a"/>
  <g transform="translate(220 270) rotate(-30) scale(9)" stroke="#3b1d0b" stroke-width="2" stroke-linecap="round">
    <path fill="none" d="M-5 -6 l-5 -7 M2 -7 l2 -8 M-5 6 l-5 7 M2 7 l2 8 M15 -3 q8 -8 14 -6 M15 3 q8 8 14 6"/>
    <ellipse rx="13" ry="8" fill="#8a4b23"/>
    <circle cx="13" r="5" fill="#5c2f14"/>
    <circle cx="15" cy="-2" r="1.6" fill="#fff" stroke="none"/>
  </g>
</svg>
```

- [ ] **Step 3: vite.config.ts com o PWA**

```ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // caminhos relativos: funciona na subpasta do GitHub Pages e no zip do itch.io
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MataBarata Remastered',
        short_name: 'MataBarata',
        lang: 'pt-BR',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#000000',
        theme_color: '#000000',
        // ponytail: só SVG; PNGs (exigidos por alguns Androids) entram com o ícone do Google Flow
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5_000_000,
      },
    }),
  ],
});
```

- [ ] **Step 4: Verificar offline**

Run: `npm run build` → Expected: saída lista `dist/sw.js` e `dist/manifest.webmanifest`.
Run: `npm run preview`, abrir a URL, DevTools → Application → Service Workers: ativo. Marcar "Offline" na aba Network e recarregar → Expected: o jogo abre e o Clássico funciona.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts public/icon.svg
git commit -m "feat: PWA instalável e offline"
```

---

### Task 9: CLAUDE.md, GitHub e deploy no Pages

**Files:**
- Create: `CLAUDE.md`, `.github/workflows/deploy.yml`

- [ ] **Step 1: CLAUDE.md**

```markdown
# CLAUDE.md

MataBarata Remastered: remake no navegador do jogo de console em C++ feito no SENAI em 2013.
Spec: `docs/superpowers/specs/2026-10-24-matabarata-remastered-design.md`. Planos em `docs/superpowers/plans/`.

Código, comentários e commits em **português**.

## Comandos

    npm run dev       # servidor local
    npm test          # Vitest (src/**/*.test.ts)
    npm run build     # tsc + vite build → dist/ (com service worker)

## Arquitetura

- `src/logic/`: TypeScript puro, sem Phaser — toda regra de jogo. Testes `*.test.ts` ao lado. Aleatoriedade
  sempre injetada (`rand: () => number`).
- `src/scenes/`: Phaser só desenha e repassa entrada; nenhuma regra aqui.
- Modo Clássico: coordenadas do console original (80×25, 1-based, célula 12×24 px, canvas 960×600). As regras
  imitam o `.cpp` de 2013 de propósito — não "conserte".
- `src/save.ts`: `localStorage` em chave versionada (`matabarata:v1`); nunca lança.
- Áudio (`src/audio/beeper.ts`): Web Audio liberado no 1º toque/tecla (exigência do iOS); sem áudio = mudo.
- `// ponytail:` marca simplificação deliberada com teto conhecido — respeite.
```

- [ ] **Step 2: .github/workflows/deploy.yml**

```yaml
name: deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md .github
git commit -m "ci: testes, build e deploy no GitHub Pages"
```

- [ ] **Step 4: Criar o repositório no GitHub — PERGUNTAR AO USUÁRIO ANTES**

O GitHub Pages grátis só publica repositório **público** (privado exige plano pago). Confirmar com o usuário nome
(`matabarata`) e visibilidade. Com o "sim":

```bash
gh repo create jeffersonmds/matabarata --public --source . --push
gh api -X POST repos/jeffersonmds/matabarata/pages -f build_type=workflow
gh workflow run deploy
gh run watch
```

Expected: o run termina verde; o jogo abre em `https://jeffersonmds.github.io/matabarata/`.

- [ ] **Step 5: Conferir no iPhone**

Abrir a URL no Safari do iPhone → Compartilhar → "Adicionar à Tela de Início". Abrir pelo ícone: tela cheia, o
Clássico funciona com deslize, bips tocam depois do 1º toque, e abre em modo avião.
