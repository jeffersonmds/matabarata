# Etapa 2 — Motor da Campanha + Cozinha (fases 1–5) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Campanha jogável — mapa de fases, 5 fases da Cozinha com chinelo, baratas Comum e Ligeira, infestação, power-ups, combo, estrelas e progresso salvo — com arte provisória desenhada em código.

**Architecture:** Toda regra fica em `src/logic/` (TS puro, testado com Vitest): `geometry`, `level`, `roach`, `scoring`, `world` (o mundo da fase: `createWorld` + `stepWorld(world, dtMs, alvo, rand)` que devolve eventos) e `progress`. As cenas Phaser (`MapScene`, `LevelScene`, `ResultScene`) só desenham o estado e reagem aos eventos. Fases são JSON em `src/levels/` (empacotadas no build, entram no cache offline sozinhas).

**Tech Stack:** Vite 8, Phaser 3.90, TypeScript 5, Vitest. Repositório `C:\repos\matabarata` (etapa 1 já em `master`).

**Spec:** `docs/superpowers/specs/2026-10-24-matabarata-remastered-design.md` (seção Campanha).

**Decisões tomadas neste plano (o usuário pode revisar):**
- **Tela:** o jogo passa a ocupar a janela inteira (`Scale.RESIZE`); cada cena encaixa sua área de design pelo zoom da câmera (`fitCamera`). Menu e Clássico seguem em 960×600; a campanha usa uma área **em pé** de 900×1320 (faixa de HUD de 120 px + arena 900×1200), como no mockup aprovado. No PC deitado sobra margem dos lados, preenchida pela cor de fundo.
- **Obstáculos:** bloqueiam só o chinelo. Baratas andam por baixo deles (desenhadas atrás) e, com o centro dentro de um obstáculo, não podem ser acertadas — é isso que "esconde" a barata.
- **Multiplicação:** a cada `breedEveryMs` da fase nasce um filhote ao lado de uma barata viva sorteada. Infestação = vivas ÷ `limit`; passar do limite perde.
- **Power-ups:** aparecem no `atMs` da fase num ponto livre e somem em 8 s se ninguém pegar. Inseticida: baratas a 40% da velocidade por 5 s. Chinelada: o próximo acerto mata tudo num raio de 170. Isca: por 4 s as baratas vão até o ponto onde a isca foi pega em vez de fugir.
- **Fases em `src/levels/*.json`** (não `public/levels/` como dizia a spec): importadas no código, validadas por teste e precacheadas sem config extra.
- **Balanceamento** (velocidades, tempos, limites) é chute inicial; ajusta-se só mexendo nos JSON e nas constantes de `roach.ts`/`world.ts`.

Código, comentários e commits em **português**. Cada commit termina com:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

**Crie e edite arquivos com Write/Edit, nunca com heredoc do Bash** (já corrompeu `\` e Unicode antes).

## Estrutura de arquivos

```
src/main.ts                     MODIFICAR: Scale.RESIZE + novas cenas
src/scenes/ui.ts                fitCamera, text, button (compartilhados)
src/scenes/MenuScene.ts         MODIFICAR: usa ui.ts; Campanha liga
src/scenes/ClassicScene.ts      MODIFICAR: fitCamera(960, 600)
src/logic/geometry.ts           Vec, Rect, dist, inRect, pushOutOfRect, clampToArena   + teste
src/logic/level.ts              LevelData, constantes da arena, validateLevel           + teste (inclui as fases reais)
src/levels/cozinha-1..5.json    as 5 fases
src/levels/index.ts             LEVELS na ordem da campanha
src/logic/scoring.ts            combo e estrelas                                         + teste
src/logic/roach.ts              comportamento de Comum e Ligeira                         + teste
src/logic/world.ts              o mundo da fase (chinelo, baratas, power-ups, fim)       + teste
src/save.ts                     MODIFICAR: registro por fase
src/save.test.ts                MODIFICAR
src/logic/progress.ts           desbloqueio, recorde, total de estrelas                  + teste
src/art/textures.ts             sprites vetoriais provisórios
src/scenes/LevelScene.ts        a fase em jogo (HUD, pausa, efeitos)
src/scenes/ResultScene.ts       estrelas, pontos, próxima/repetir/mapa
src/scenes/MapScene.ts          trilha da Cozinha com estrelas e cadeados
tsconfig.json                   MODIFICAR: resolveJsonModule
CLAUDE.md                       MODIFICAR
```

---

### Task 1: Tela que ocupa a janela inteira

**Files:**
- Create: `src/scenes/ui.ts`
- Modify: `src/main.ts`, `src/scenes/MenuScene.ts`, `src/scenes/ClassicScene.ts`

- [ ] **Step 1: src/scenes/ui.ts**

```ts
import Phaser from 'phaser';

export const FONT = 'system-ui, "Segoe UI", sans-serif';

/** Encaixa a área de design (w×h) na tela inteira, centralizada, e reencaixa quando a janela muda. */
export function fitCamera(scene: Phaser.Scene, w: number, h: number): void {
  const fit = () => {
    const cam = scene.cameras.main;
    cam.setZoom(Math.min(scene.scale.width / w, scene.scale.height / h));
    cam.centerOn(w / 2, h / 2);
  };
  fit();
  scene.scale.on('resize', fit);
  scene.events.once('shutdown', () => scene.scale.off('resize', fit));
}

export function text(scene: Phaser.Scene, x: number, y: number, s: string, size: number, color = '#5a3300', weight = '800') {
  // resolution 2: o zoom da câmera amplia o texto; ponytail: canvas em px CSS (sem devicePixelRatio), telas retina ficam um pouco suaves
  return scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight, color, resolution: 2 }).setOrigin(0.5);
}

/** Botão arredondado. Sem onClick = desabilitado (cinza). Devolve as peças pra quem quiser pôr num container. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick?: () => void,
  color = 0x2a9df4,
): [Phaser.GameObjects.Graphics, Phaser.GameObjects.Text, Phaser.GameObjects.Zone] {
  const g = scene.add.graphics();
  g.fillStyle(onClick ? color : 0xbbbbbb).fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
  g.lineStyle(5, 0xffffff).strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
  const t = text(scene, x, y, label, Math.round(h * 0.42), '#ffffff');
  const zone = scene.add.zone(x, y, w, h);
  if (onClick) zone.setInteractive({ useHandCursor: true }).on('pointerup', onClick);
  return [g, t, zone];
}
```

- [ ] **Step 2: src/scenes/MenuScene.ts (substituir o arquivo inteiro)**

```ts
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
    button(this, 480, 410, 420, 70, 'Campanha — em breve');

    const best = loadSave().classicBest;
    if (best > 0) text(this, 480, 520, `Recorde do Clássico: ${best}`, 24, '#5a3300', '700');

    this.input.keyboard?.once('keydown-ONE', () => this.scene.start('classic'));
  }
}
```

- [ ] **Step 3: ClassicScene encaixa 960×600**

Em `src/scenes/ClassicScene.ts`, adicionar o import:

```ts
import { fitCamera } from './ui';
```

e, em `create()`, logo depois do bloco `if (this.renderer instanceof ...) { ... }`:

```ts
    fitCamera(this, 960, 600);
```

Em `put()`, acrescentar `resolution: 2` ao estilo do texto (o zoom da câmera amplia o texto e ele borraria):

```ts
    const t = this.add.text((col - 1) * CW, (row - 1) * CH, text, { fontFamily: FONT, fontSize: '20px', color: COLOR[color], resolution: 2 });
```

- [ ] **Step 4: src/main.ts usa Scale.RESIZE**

Trocar a linha do comentário `// ponytail: canvas fixo...` e a linha `scale: {...}` por:

```ts
  // canvas do tamanho da janela; cada cena encaixa sua área de design com fitCamera (scenes/ui.ts)
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
```

- [ ] **Step 5: Verificar**

Run: `npm run build && npm test` → Expected: sem erro; 25 testes passando.
Run: `npm run dev`, abrir no navegador, redimensionar a janela (larga, estreita, modo celular do DevTools) → Expected: menu e Clássico sempre inteiros e centralizados; clicar nos botões e jogar o Clássico continua funcionando (o clique acerta o botão certo com zoom). Se não houver navegador, registre que a checagem visual ficou pendente.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/ui.ts src/scenes/MenuScene.ts src/scenes/ClassicScene.ts src/main.ts
git commit -m "feat: jogo ocupa a janela inteira e cada tela se encaixa"
```

---

### Task 2: Geometria

**Files:**
- Create: `src/logic/geometry.ts`
- Test: `src/logic/geometry.test.ts`

- [ ] **Step 1: Testes**

```ts
import { describe, it, expect } from 'vitest';
import { dist, inRect, pushOutOfRect, clampToArena } from './geometry';

const box = { x: 100, y: 100, w: 200, h: 100 };

describe('geometry', () => {
  it('dist e inRect', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(inRect({ x: 150, y: 150 }, box)).toBe(true);
    expect(inRect({ x: 99, y: 150 }, box)).toBe(false);
  });

  it('círculo longe do retângulo não se mexe (mesmo objeto)', () => {
    const c = { x: 50, y: 150 };
    expect(pushOutOfRect(c, 20, box)).toBe(c);
  });

  it('círculo encostando é empurrado até tocar a borda', () => {
    const p = pushOutOfRect({ x: 90, y: 150 }, 20, box);
    expect(p.x).toBeCloseTo(80);
    expect(p.y).toBeCloseTo(150);
  });

  it('centro dentro do retângulo sai pelo lado mais perto', () => {
    expect(pushOutOfRect({ x: 290, y: 150 }, 20, box)).toEqual({ x: 320, y: 150 });
    expect(pushOutOfRect({ x: 200, y: 105 }, 20, box)).toEqual({ x: 200, y: 80 });
  });

  it('clampToArena mantém o círculo inteiro dentro', () => {
    expect(clampToArena({ x: -10, y: 5000 }, 30, 900, 1200)).toEqual({ x: 30, y: 1170 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL — "Failed to resolve import ./geometry".

- [ ] **Step 3: Implementar `src/logic/geometry.ts`**

```ts
export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export const inRect = (p: Vec, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Empurra um círculo pra fora do retângulo. Sem sobreposição devolve o próprio `c`. */
export function pushOutOfRect(c: Vec, radius: number, r: Rect): Vec {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
  const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
  const dx = c.x - nx;
  const dy = c.y - ny;
  const d = Math.hypot(dx, dy);
  if (d >= radius) return c;
  if (d > 0) return { x: nx + (dx / d) * radius, y: ny + (dy / d) * radius };
  // centro dentro do retângulo: sai pelo lado mais perto
  const left = c.x - r.x;
  const right = r.x + r.w - c.x;
  const top = c.y - r.y;
  const bottom = r.y + r.h - c.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: r.x - radius, y: c.y };
  if (m === right) return { x: r.x + r.w + radius, y: c.y };
  if (m === top) return { x: c.x, y: r.y - radius };
  return { x: c.x, y: r.y + r.h + radius };
}

export function clampToArena(c: Vec, radius: number, w: number, h: number): Vec {
  return { x: Math.min(w - radius, Math.max(radius, c.x)), y: Math.min(h - radius, Math.max(radius, c.y)) };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS (30 testes).

- [ ] **Step 5: Commit**

```bash
git add src/logic/geometry.ts src/logic/geometry.test.ts
git commit -m "feat: geometria da campanha (colisão círculo × retângulo)"
```

---

### Task 3: Formato das fases e as 5 fases da Cozinha

**Files:**
- Create: `src/logic/level.ts`, `src/levels/cozinha-1.json` … `cozinha-5.json`, `src/levels/index.ts`
- Modify: `tsconfig.json`
- Test: `src/logic/level.test.ts`

- [ ] **Step 1: tsconfig.json — permitir importar JSON**

Adicionar dentro de `compilerOptions`:

```json
    "resolveJsonModule": true,
```

- [ ] **Step 2: Testes `src/logic/level.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { validateLevel, type LevelData } from './level';
import { LEVELS } from '../levels';

const ok: LevelData = {
  id: 'x',
  name: 'Teste',
  roaches: { comum: 3 },
  breedEveryMs: 5000,
  limit: 10,
  targetMs: 30000,
  obstacles: [{ x: 100, y: 100, w: 200, h: 100 }],
  powerUps: [{ kind: 'inseticida', atMs: 1000 }],
};

describe('validateLevel', () => {
  it('fase boa não tem erro', () => {
    expect(validateLevel(ok)).toEqual([]);
  });

  it.each<[string, Partial<LevelData>]>([
    ['sem baratas', { roaches: {} }],
    ['limite <= baratas iniciais', { limit: 3 }],
    ['multiplicação rápida demais', { breedEveryMs: 500 }],
    ['tempo-alvo inválido', { targetMs: 0 }],
    ['barata desconhecida', { roaches: { comum: 2, gigante: 1 } as LevelData['roaches'] }],
    ['obstáculo fora da arena', { obstacles: [{ x: 800, y: 0, w: 200, h: 100 }] }],
    ['obstáculo em cima do chinelo', { obstacles: [{ x: 400, y: 1000, w: 100, h: 100 }] }],
    ['obstáculo fino demais', { obstacles: [{ x: 100, y: 100, w: 300, h: 50 }] }],
    ['power-up desconhecido', { powerUps: [{ kind: 'bomba' as unknown as 'isca', atMs: 0 }] }],
  ])('%s é erro', (_nome, over) => {
    expect(validateLevel({ ...ok, ...over }).length).toBeGreaterThan(0);
  });
});

describe('fases da campanha', () => {
  it('são as 5 da Cozinha, na ordem, com ids únicos', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['cozinha-1', 'cozinha-2', 'cozinha-3', 'cozinha-4', 'cozinha-5']);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('%s é válida', (_id, level) => {
    expect(validateLevel(level)).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL — "Failed to resolve import ./level".

- [ ] **Step 4: `src/logic/level.ts`**

```ts
import { pushOutOfRect, type Rect, type Vec } from './geometry';

// Arena da campanha em coordenadas próprias (em pé, 3:4); a cena desenha logo abaixo do HUD.
export const ARENA_W = 900;
export const ARENA_H = 1200;
export const START: Vec = { x: 450, y: 1050 };
export const CHINELO_RADIUS = 38;
export const MIN_OBSTACLE = 100;

export const ROACH_KINDS = ['comum', 'ligeira'] as const;
export const POWER_KINDS = ['inseticida', 'chinelada', 'isca'] as const;
export type RoachKind = (typeof ROACH_KINDS)[number];
export type PowerKind = (typeof POWER_KINDS)[number];

export interface LevelData {
  id: string;
  name: string;
  roaches: Partial<Record<RoachKind, number>>;
  /** A cada quantos ms nasce um filhote. */
  breedEveryMs: number;
  /** Vivas acima disto = derrota. */
  limit: number;
  /** Vencer até este tempo vale a 2ª estrela. */
  targetMs: number;
  obstacles: Rect[];
  powerUps: { kind: PowerKind; atMs: number }[];
}

/** Lista de problemas da fase; vazia = válida. */
export function validateLevel(d: LevelData): string[] {
  const errors: string[] = [];
  const counts = Object.entries(d.roaches);
  const total = counts.reduce((sum, [, n]) => sum + (n ?? 0), 0);
  if (total < 1) errors.push('sem baratas');
  if (!(d.limit > total)) errors.push('limit precisa ser maior que as baratas iniciais');
  if (!(d.breedEveryMs >= 1000)) errors.push('breedEveryMs abaixo de 1000');
  if (!(d.targetMs > 0)) errors.push('targetMs inválido');
  for (const [kind] of counts) {
    if (!(ROACH_KINDS as readonly string[]).includes(kind)) errors.push(`barata desconhecida: ${kind}`);
  }
  d.obstacles.forEach((o, i) => {
    if (o.w <= 0 || o.h <= 0 || o.x < 0 || o.y < 0 || o.x + o.w > ARENA_W || o.y + o.h > ARENA_H) errors.push(`obstáculo ${i} fora da arena`);
    // pushOutOfRect devolve o mesmo objeto quando não há sobreposição
    // o chinelo anda até 45 px por quadro (900 px/s × 50 ms): mais fino que isso ele atravessa
    if (o.w < MIN_OBSTACLE || o.h < MIN_OBSTACLE) errors.push(`obstáculo ${i} fino demais`);
    if (pushOutOfRect(START, CHINELO_RADIUS, o) !== START) errors.push(`obstáculo ${i} em cima do chinelo`);
  });
  for (const p of d.powerUps) {
    if (!(POWER_KINDS as readonly string[]).includes(p.kind) || !(p.atMs >= 0)) errors.push(`power-up inválido: ${p.kind}`);
  }
  return errors;
}
```

- [ ] **Step 5: As 5 fases**

`src/levels/cozinha-1.json` (tutorial: só baratas comuns, sem móveis):

```json
{
  "id": "cozinha-1",
  "name": "Primeira visita",
  "roaches": { "comum": 5 },
  "breedEveryMs": 7000,
  "limit": 15,
  "targetMs": 30000,
  "obstacles": [],
  "powerUps": []
}
```

`src/levels/cozinha-2.json` (primeira mesa e primeiro inseticida):

```json
{
  "id": "cozinha-2",
  "name": "Debaixo da mesa",
  "roaches": { "comum": 8 },
  "breedEveryMs": 6000,
  "limit": 18,
  "targetMs": 40000,
  "obstacles": [{ "x": 300, "y": 450, "w": 300, "h": 200 }],
  "powerUps": [{ "kind": "inseticida", "atMs": 12000 }]
}
```

`src/levels/cozinha-3.json` (estreia da Ligeira):

```json
{
  "id": "cozinha-3",
  "name": "Chegou a ligeirinha",
  "roaches": { "comum": 6, "ligeira": 3 },
  "breedEveryMs": 5500,
  "limit": 20,
  "targetMs": 45000,
  "obstacles": [
    { "x": 80, "y": 300, "w": 220, "h": 160 },
    { "x": 600, "y": 700, "w": 220, "h": 160 }
  ],
  "powerUps": [{ "kind": "inseticida", "atMs": 15000 }]
}
```

`src/levels/cozinha-4.json` (balcões e a Chinelada):

```json
{
  "id": "cozinha-4",
  "name": "Atrás do balcão",
  "roaches": { "comum": 8, "ligeira": 4 },
  "breedEveryMs": 5000,
  "limit": 22,
  "targetMs": 55000,
  "obstacles": [
    { "x": 0, "y": 250, "w": 350, "h": 120 },
    { "x": 550, "y": 600, "w": 350, "h": 120 }
  ],
  "powerUps": [
    { "kind": "chinelada", "atMs": 10000 },
    { "kind": "inseticida", "atMs": 30000 }
  ]
}
```

`src/levels/cozinha-5.json` (fechamento da Cozinha, com Isca):

```json
{
  "id": "cozinha-5",
  "name": "Festa na pia",
  "roaches": { "comum": 10, "ligeira": 6 },
  "breedEveryMs": 4500,
  "limit": 26,
  "targetMs": 70000,
  "obstacles": [
    { "x": 350, "y": 350, "w": 200, "h": 200 },
    { "x": 0, "y": 800, "w": 250, "h": 140 },
    { "x": 650, "y": 800, "w": 250, "h": 140 }
  ],
  "powerUps": [
    { "kind": "isca", "atMs": 12000 },
    { "kind": "chinelada", "atMs": 30000 },
    { "kind": "inseticida", "atMs": 45000 }
  ]
}
```

- [ ] **Step 6: `src/levels/index.ts`**

```ts
import type { LevelData } from '../logic/level';
import cozinha1 from './cozinha-1.json';
import cozinha2 from './cozinha-2.json';
import cozinha3 from './cozinha-3.json';
import cozinha4 from './cozinha-4.json';
import cozinha5 from './cozinha-5.json';

// Ordem da campanha. O JSON chega sem os tipos literais; a validação de cada fase está em logic/level.test.ts.
export const LEVELS = [cozinha1, cozinha2, cozinha3, cozinha4, cozinha5] as unknown as LevelData[];
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm test` → Expected: PASS (46 testes). `npm run build` → sem erro.

- [ ] **Step 8: Commit**

```bash
git add tsconfig.json src/logic/level.ts src/logic/level.test.ts src/levels
git commit -m "feat: formato das fases e as 5 fases da Cozinha"
```

---

### Task 4: Combo e estrelas

**Files:**
- Create: `src/logic/scoring.ts`
- Test: `src/logic/scoring.test.ts`

- [ ] **Step 1: Testes**

```ts
import { describe, it, expect } from 'vitest';
import { newScore, registerKill, starsFor } from './scoring';

describe('combo', () => {
  it('100, 150, 200 em sequência rápida', () => {
    const s = newScore();
    expect([registerKill(s, 0), registerKill(s, 1000), registerKill(s, 2500)]).toEqual([100, 150, 200]);
    expect([s.score, s.streak]).toEqual([450, 3]);
  });

  it('mais de 1,5 s depois recomeça', () => {
    const s = newScore();
    registerKill(s, 0);
    registerKill(s, 1000);
    expect(registerKill(s, 2501)).toBe(100);
    expect(s.streak).toBe(1);
  });

  it('mortes no mesmo instante (chinelada) contam como combo', () => {
    const s = newScore();
    expect([registerKill(s, 500), registerKill(s, 500)]).toEqual([100, 150]);
  });
});

describe('estrelas', () => {
  it.each([
    [false, 1000, 0.1, 0],
    [true, 99000, 0.9, 1],
    [true, 30000, 0.9, 2],
    [true, 99000, 0.5, 2],
    [true, 30000, 0.5, 3],
  ])('venceu=%s em %d ms com infestação máx %d → %d', (won, ms, inf, stars) => {
    expect(starsFor(won, ms, inf, 30000)).toBe(stars);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL — "Failed to resolve import ./scoring".

- [ ] **Step 3: `src/logic/scoring.ts`**

```ts
export const BASE_POINTS = 100;
export const COMBO_WINDOW_MS = 1500;

export interface ScoreState {
  score: number;
  /** Mortes seguidas dentro da janela do combo. */
  streak: number;
  lastKillMs: number;
}

export const newScore = (): ScoreState => ({ score: 0, streak: 0, lastKillMs: -Infinity });

/** Registra uma morte e devolve os pontos: 100, 150, 200… enquanto cada morte vier até 1,5 s depois da anterior. */
export function registerKill(s: ScoreState, nowMs: number): number {
  s.streak = nowMs - s.lastKillMs <= COMBO_WINDOW_MS ? s.streak + 1 : 1;
  s.lastKillMs = nowMs;
  const points = BASE_POINTS * (1 + 0.5 * (s.streak - 1));
  s.score += points;
  return points;
}

/** 1 por vencer, +1 dentro do tempo-alvo, +1 se a infestação nunca passou da metade. */
export function starsFor(won: boolean, elapsedMs: number, maxInfestation: number, targetMs: number): number {
  if (!won) return 0;
  return 1 + (elapsedMs <= targetMs ? 1 : 0) + (maxInfestation <= 0.5 ? 1 : 0);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS (54 testes).

- [ ] **Step 5: Commit**

```bash
git add src/logic/scoring.ts src/logic/scoring.test.ts
git commit -m "feat: combo e estrelas da campanha"
```

---

### Task 5: Comportamento das baratas

**Files:**
- Create: `src/logic/roach.ts`
- Test: `src/logic/roach.test.ts`

- [ ] **Step 1: Testes**

```ts
import { describe, it, expect } from 'vitest';
import { steerRoach, ROACH, type Roach, type SteerCtx } from './roach';

const roach = (over: Partial<Roach> = {}): Roach => ({
  id: 1, kind: 'comum', x: 450, y: 600, heading: 0, turnInMs: 1e9, dead: false, ...over,
});
const ctx = (over: Partial<SteerCtx> = {}): SteerCtx => ({ chinelo: { x: 0, y: 0 }, slow: false, bait: null, ...over });
const half = () => 0.5;

describe('steerRoach', () => {
  it('passeia na velocidade base', () => {
    const r = roach();
    steerRoach(r, ctx(), 1000, half);
    expect(r.x).toBeCloseTo(450 + ROACH.comum.speed);
    expect(r.y).toBeCloseTo(600);
  });

  it('a ligeira é mais rápida', () => {
    const r = roach({ kind: 'ligeira' });
    steerRoach(r, ctx(), 1000, half);
    expect(r.x).toBeCloseTo(450 + ROACH.ligeira.speed);
  });

  it('foge do chinelo perto, na velocidade de fuga', () => {
    const r = roach({ heading: Math.PI });
    steerRoach(r, ctx({ chinelo: { x: 350, y: 600 } }), 100, half);
    expect(r.x).toBeCloseTo(450 + ROACH.comum.flee * 0.1);
  });

  it('inseticida deixa a 40%', () => {
    const r = roach();
    steerRoach(r, ctx({ slow: true }), 1000, half);
    expect(r.x).toBeCloseTo(450 + ROACH.comum.speed * 0.4);
  });

  it('com isca vai até ela em vez de fugir', () => {
    const r = roach();
    steerRoach(r, ctx({ chinelo: { x: 350, y: 600 }, bait: { x: 450, y: 900 } }), 100, half);
    expect(r.x).toBeCloseTo(450);
    expect(r.y).toBeCloseTo(600 + ROACH.comum.speed * 0.1);
  });

  it('muda de rumo quando acaba o tempo', () => {
    const r = roach({ turnInMs: 0 });
    steerRoach(r, ctx(), 10, () => 1);
    expect(r.heading).toBeCloseTo(Math.PI / 2);
    expect(r.turnInMs).toBe(ROACH.comum.turnMaxMs);
  });

  it('bate na parede, volta pra dentro e inverte o rumo', () => {
    const r = roach({ x: 880 });
    steerRoach(r, ctx(), 1000, half);
    expect(r.x).toBeLessThanOrEqual(900 - ROACH.comum.radius);
    expect(Math.cos(r.heading)).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL — "Failed to resolve import ./roach".

- [ ] **Step 3: `src/logic/roach.ts`**

```ts
import { dist, type Vec } from './geometry';
import { ARENA_W, ARENA_H, type RoachKind } from './level';

export interface Roach {
  id: number;
  kind: RoachKind;
  x: number;
  y: number;
  /** Rumo em radianos (0 = direita). */
  heading: number;
  /** Quanto falta pra sortear um rumo novo ao passear. */
  turnInMs: number;
  dead: boolean;
}

// Velocidades em px da arena por segundo. Ajuste de balanceamento é aqui.
export const ROACH = {
  comum: { speed: 110, flee: 260, fleeRadius: 230, turnMinMs: 800, turnMaxMs: 2000, radius: 22 },
  ligeira: { speed: 240, flee: 360, fleeRadius: 260, turnMinMs: 250, turnMaxMs: 700, radius: 18 },
} as const;

export const SLOW_FACTOR = 0.4;

export interface SteerCtx {
  chinelo: Vec;
  /** Inseticida ativo. */
  slow: boolean;
  /** Isca ativa: todas vão até ela. */
  bait: Vec | null;
}

export function steerRoach(r: Roach, ctx: SteerCtx, dtMs: number, rand: () => number): void {
  const spec = ROACH[r.kind];
  let speed: number = spec.speed;
  if (ctx.bait) {
    r.heading = Math.atan2(ctx.bait.y - r.y, ctx.bait.x - r.x);
  } else if (dist(r, ctx.chinelo) < spec.fleeRadius) {
    r.heading = Math.atan2(r.y - ctx.chinelo.y, r.x - ctx.chinelo.x);
    speed = spec.flee;
  } else {
    r.turnInMs -= dtMs;
    if (r.turnInMs <= 0) {
      r.heading += (rand() - 0.5) * Math.PI;
      r.turnInMs = spec.turnMinMs + rand() * (spec.turnMaxMs - spec.turnMinMs);
    }
  }
  if (ctx.slow) speed *= SLOW_FACTOR;

  const step = (speed * dtMs) / 1000;
  let x = r.x + Math.cos(r.heading) * step;
  let y = r.y + Math.sin(r.heading) * step;
  // parede: reflete o rumo e volta pra dentro
  if (x < spec.radius || x > ARENA_W - spec.radius) {
    r.heading = Math.PI - r.heading;
    x = Math.min(ARENA_W - spec.radius, Math.max(spec.radius, x));
  }
  if (y < spec.radius || y > ARENA_H - spec.radius) {
    r.heading = -r.heading;
    y = Math.min(ARENA_H - spec.radius, Math.max(spec.radius, y));
  }
  r.x = x;
  r.y = y;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS (61 testes).

- [ ] **Step 5: Commit**

```bash
git add src/logic/roach.ts src/logic/roach.test.ts
git commit -m "feat: baratas Comum e Ligeira (passear, fugir, isca, inseticida)"
```

---

### Task 6: O mundo da fase

**Files:**
- Create: `src/logic/world.ts`
- Test: `src/logic/world.test.ts`

- [ ] **Step 1: Testes**

```ts
import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld, aliveRoaches, CHINELO_SPEED, POWER_TTL_MS, SLOW_MS, SPAWN_SAFE_DIST, type World, type WorldEvent } from './world';
import { START, type LevelData } from './level';
import { dist, inRect } from './geometry';

const half = () => 0.5;
function lcg(seed = 7) {
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
}
function level(over: Partial<LevelData> = {}): LevelData {
  return { id: 't', name: 'Teste', roaches: { comum: 1 }, breedEveryMs: 100000, limit: 10, targetMs: 30000, obstacles: [], powerUps: [], ...over };
}
/** Mundo com baratas Comum em posições escolhidas (passos de 1 ms quase não as movem). */
function world(roaches: [number, number][], over: Partial<LevelData> = {}): World {
  const w = createWorld(level(over), half);
  w.roaches = roaches.map(([x, y], i) => ({ id: 100 + i, kind: 'comum' as const, x, y, heading: 0, turnInMs: 1e9, dead: false }));
  return w;
}
const kills = (ev: WorldEvent[]) => ev.flatMap((e) => (e.type === 'kill' ? [e.points] : []));

describe('createWorld', () => {
  it('espalha as baratas por tipo, fora dos móveis e longe do chinelo', () => {
    const mesa = { x: 0, y: 0, w: 900, h: 500 };
    const w = createWorld(level({ roaches: { comum: 4, ligeira: 2 }, obstacles: [mesa] }), lcg());
    expect(w.roaches.filter((r) => r.kind === 'comum')).toHaveLength(4);
    expect(w.roaches.filter((r) => r.kind === 'ligeira')).toHaveLength(2);
    for (const r of w.roaches) {
      expect(inRect(r, mesa)).toBe(false);
      expect(dist(r, START)).toBeGreaterThanOrEqual(SPAWN_SAFE_DIST);
    }
  });
});

describe('chinelo', () => {
  it('anda no máximo na velocidade dele até o alvo', () => {
    const w = world([[100, 100]]);
    stepWorld(w, 100, { x: 450, y: 0 }, half);
    expect(w.chinelo.x).toBeCloseTo(450);
    expect(w.chinelo.y).toBeCloseTo(START.y - CHINELO_SPEED * 0.1);
  });

  it('não atravessa móvel', () => {
    const w = world([[100, 100]], { obstacles: [{ x: 300, y: 850, w: 300, h: 100 }] });
    for (let i = 0; i < 10; i++) stepWorld(w, 50, { x: 450, y: 700 }, half);
    expect(w.chinelo.y).toBeGreaterThanOrEqual(950 + 38 - 0.001);
  });
});

describe('acertos', () => {
  it('encostar mata; duas no mesmo instante fazem combo', () => {
    const w = world([[450, 1010], [480, 1050], [100, 100]]);
    expect(kills(stepWorld(w, 1, null, half))).toEqual([100, 150]);
    expect(aliveRoaches(w)).toHaveLength(1);
  });

  it('combo recomeça depois de 1,5 s', () => {
    const w = world([[450, 1010], [100, 100], [100, 300]]);
    stepWorld(w, 1, null, half);
    stepWorld(w, 1600, null, half);
    w.roaches.push({ id: 200, kind: 'comum', x: 450, y: 1010, heading: 0, turnInMs: 1e9, dead: false });
    expect(kills(stepWorld(w, 1, null, half))).toEqual([100]);
  });

  it('barata com o centro debaixo de um móvel está escondida', () => {
    const w = world([[490, 1040], [100, 100]], { obstacles: [{ x: 470, y: 1000, w: 100, h: 100 }] });
    expect(kills(stepWorld(w, 1, null, half))).toEqual([]);
  });

  it('chinelada mata tudo no raio e se gasta', () => {
    const w = world([[450, 1010], [450, 900], [300, 1050], [100, 100]]);
    w.chineladaArmed = true;
    expect(kills(stepWorld(w, 1, null, half))).toHaveLength(3);
    expect(aliveRoaches(w)).toHaveLength(1);
    expect(w.chineladaArmed).toBe(false);
  });
});

describe('infestação e fim', () => {
  it('nasce um filhote do mesmo tipo ao lado de uma barata', () => {
    const w = world([[100, 100], [800, 200]], { breedEveryMs: 1000 });
    const ev = stepWorld(w, 1000, null, half);
    const spawn = ev.find((e) => e.type === 'spawn');
    expect(spawn).toBeDefined();
    expect(aliveRoaches(w)).toHaveLength(3);
    const child = aliveRoaches(w)[2];
    expect(child.kind).toBe('comum');
    expect(Math.min(...w.roaches.slice(0, 2).map((r) => dist(r, child)))).toBeLessThanOrEqual(31);
  });

  it('passar do limite perde e o mundo para', () => {
    const w = world([[100, 100], [800, 200], [100, 500]], { limit: 3, breedEveryMs: 1000 });
    const ev = stepWorld(w, 1000, null, half);
    expect(ev.some((e) => e.type === 'lost')).toBe(true);
    expect(w.status).toBe('lost');
    expect(stepWorld(w, 1000, null, half)).toEqual([]);
  });

  it('matar a última vence e o mundo para', () => {
    const w = world([[450, 1010]]);
    expect(stepWorld(w, 1, null, half).some((e) => e.type === 'won')).toBe(true);
    expect(w.status).toBe('won');
    expect(stepWorld(w, 1, null, half)).toEqual([]);
  });

  it('guarda a maior infestação', () => {
    const w = world([[100, 100], [800, 200]], { limit: 4, breedEveryMs: 1000 });
    stepWorld(w, 1000, null, half);
    expect(w.maxInfestation).toBeCloseTo(0.75);
  });
});

describe('power-ups', () => {
  it('aparece no atMs e some sozinho depois de 8 s', () => {
    const w = world([[100, 100]], { powerUps: [{ kind: 'inseticida', atMs: 500 }] });
    expect(stepWorld(w, 400, null, half).some((e) => e.type === 'power-spawn')).toBe(false);
    expect(stepWorld(w, 100, null, half).some((e) => e.type === 'power-spawn')).toBe(true);
    expect(stepWorld(w, POWER_TTL_MS, null, half).some((e) => e.type === 'power-expire')).toBe(true);
    expect(w.powerUps).toEqual([]);
  });

  it('pegar inseticida deixa as baratas lentas por 5 s', () => {
    const w = world([[100, 100]]);
    w.powerUps.push({ id: 1, kind: 'inseticida', x: START.x, y: START.y, expiresMs: 99999 });
    expect(stepWorld(w, 1, null, half).some((e) => e.type === 'power-pick')).toBe(true);
    expect(w.slowUntilMs).toBe(1 + SLOW_MS);
  });

  it('pegar isca põe a isca onde ela estava', () => {
    const w = world([[100, 100]]);
    w.powerUps.push({ id: 1, kind: 'isca', x: START.x, y: START.y - 20, expiresMs: 99999 });
    stepWorld(w, 1, null, half);
    expect(w.bait).toMatchObject({ x: START.x, y: START.y - 20 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL — "Failed to resolve import ./world".

- [ ] **Step 3: `src/logic/world.ts`**

```ts
import { dist, inRect, clampToArena, pushOutOfRect, type Vec } from './geometry';
import { ARENA_W, ARENA_H, START, CHINELO_RADIUS, type LevelData, type PowerKind, type RoachKind } from './level';
import { steerRoach, ROACH, type Roach } from './roach';
import { newScore, registerKill, type ScoreState } from './scoring';

// Ajuste de balanceamento é aqui e nos JSON das fases.
export const CHINELO_SPEED = 900;
export const SPAWN_SAFE_DIST = 300;
export const POWER_RADIUS = 34;
export const POWER_TTL_MS = 8000;
export const SLOW_MS = 5000;
export const BAIT_MS = 4000;
export const AREA_RADIUS = 170;

export interface PowerUp {
  id: number;
  kind: PowerKind;
  x: number;
  y: number;
  expiresMs: number;
}

export type WorldEvent =
  | { type: 'kill'; roach: Roach; points: number; streak: number }
  | { type: 'spawn'; roach: Roach }
  | { type: 'power-spawn'; power: PowerUp }
  | { type: 'power-pick'; power: PowerUp }
  | { type: 'power-expire'; power: PowerUp }
  | { type: 'won' }
  | { type: 'lost' };

export interface World {
  level: LevelData;
  elapsedMs: number;
  chinelo: Vec;
  roaches: Roach[];
  powerUps: PowerUp[];
  /** Power-ups que ainda vão aparecer, em ordem de atMs. */
  pendingPowers: { kind: PowerKind; atMs: number }[];
  nextBreedMs: number;
  slowUntilMs: number;
  bait: (Vec & { untilMs: number }) | null;
  chineladaArmed: boolean;
  score: ScoreState;
  maxInfestation: number;
  status: 'playing' | 'won' | 'lost';
  nextId: number;
}

export const aliveRoaches = (w: World) => w.roaches.filter((r) => !r.dead);
export const infestation = (w: World) => aliveRoaches(w).length / w.level.limit;
const hidden = (w: World, p: Vec) => w.level.obstacles.some((o) => inRect(p, o));

/** Ponto livre: fora dos móveis e longe do início do chinelo (50 tentativas; ponytail: depois disso aceita o último). */
function freePoint(level: LevelData, rand: () => number): Vec {
  let p: Vec = { x: ARENA_W / 2, y: ARENA_H / 4 };
  for (let i = 0; i < 50; i++) {
    p = { x: 40 + rand() * (ARENA_W - 80), y: 40 + rand() * (ARENA_H - 80) };
    if (dist(p, START) >= SPAWN_SAFE_DIST && !level.obstacles.some((o) => inRect(p, o))) break;
  }
  return p;
}

function newRoach(w: World, kind: RoachKind, p: Vec, rand: () => number): Roach {
  return { id: w.nextId++, kind, x: p.x, y: p.y, heading: rand() * Math.PI * 2, turnInMs: 0, dead: false };
}

export function createWorld(level: LevelData, rand: () => number): World {
  const w: World = {
    level,
    elapsedMs: 0,
    chinelo: { ...START },
    roaches: [],
    powerUps: [],
    pendingPowers: [...level.powerUps].sort((a, b) => a.atMs - b.atMs),
    nextBreedMs: level.breedEveryMs,
    slowUntilMs: 0,
    bait: null,
    chineladaArmed: false,
    score: newScore(),
    maxInfestation: 0,
    status: 'playing',
    nextId: 1,
  };
  for (const [kind, n] of Object.entries(level.roaches) as [RoachKind, number][]) {
    for (let i = 0; i < n; i++) w.roaches.push(newRoach(w, kind, freePoint(level, rand), rand));
  }
  w.maxInfestation = infestation(w);
  return w;
}

/** Avança o mundo `dtMs`. `target` = para onde o dedo/mouse aponta (null = chinelo parado). */
export function stepWorld(w: World, dtMs: number, target: Vec | null, rand: () => number): WorldEvent[] {
  if (w.status !== 'playing') return [];
  const ev: WorldEvent[] = [];
  w.elapsedMs += dtMs;
  const now = w.elapsedMs;

  moveChinelo(w, dtMs, target);

  while (w.pendingPowers.length && w.pendingPowers[0].atMs <= now) {
    const { kind } = w.pendingPowers.shift()!;
    const p = freePoint(w.level, rand);
    const power: PowerUp = { id: w.nextId++, kind, x: p.x, y: p.y, expiresMs: now + POWER_TTL_MS };
    w.powerUps.push(power);
    ev.push({ type: 'power-spawn', power });
  }
  for (const power of [...w.powerUps]) {
    if (dist(power, w.chinelo) < CHINELO_RADIUS + POWER_RADIUS) {
      applyPower(w, power, now);
      ev.push({ type: 'power-pick', power });
    } else if (now >= power.expiresMs) {
      ev.push({ type: 'power-expire', power });
    } else {
      continue;
    }
    w.powerUps.splice(w.powerUps.indexOf(power), 1);
  }
  if (w.bait && now >= w.bait.untilMs) w.bait = null;

  const ctx = { chinelo: w.chinelo, slow: now < w.slowUntilMs, bait: w.bait };
  for (const r of aliveRoaches(w)) steerRoach(r, ctx, dtMs, rand);

  for (const r of aliveRoaches(w)) {
    if (r.dead || hidden(w, r) || dist(r, w.chinelo) >= CHINELO_RADIUS + ROACH[r.kind].radius) continue;
    const victims = w.chineladaArmed
      ? aliveRoaches(w).filter((o) => !hidden(w, o) && dist(o, w.chinelo) <= AREA_RADIUS)
      : [r];
    w.chineladaArmed = false;
    for (const v of victims) {
      v.dead = true;
      const points = registerKill(w.score, now);
      ev.push({ type: 'kill', roach: v, points, streak: w.score.streak });
    }
  }

  if (now >= w.nextBreedMs) {
    w.nextBreedMs += w.level.breedEveryMs;
    const alive = aliveRoaches(w);
    if (alive.length) {
      const parent = alive[Math.floor(rand() * alive.length)];
      const near = { x: parent.x + (rand() - 0.5) * 60, y: parent.y + (rand() - 0.5) * 60 };
      const child = newRoach(w, parent.kind, clampToArena(near, ROACH[parent.kind].radius, ARENA_W, ARENA_H), rand);
      w.roaches.push(child);
      ev.push({ type: 'spawn', roach: child });
    }
  }

  const alive = aliveRoaches(w).length;
  w.maxInfestation = Math.max(w.maxInfestation, alive / w.level.limit);
  if (alive === 0) {
    w.status = 'won';
    ev.push({ type: 'won' });
  } else if (alive > w.level.limit) {
    w.status = 'lost';
    ev.push({ type: 'lost' });
  }
  return ev;
}

function moveChinelo(w: World, dtMs: number, target: Vec | null): void {
  if (!target) return;
  const d = dist(w.chinelo, target);
  const max = (CHINELO_SPEED * dtMs) / 1000;
  let p: Vec = d <= max
    ? { x: target.x, y: target.y }
    : { x: w.chinelo.x + ((target.x - w.chinelo.x) / d) * max, y: w.chinelo.y + ((target.y - w.chinelo.y) / d) * max };
  p = clampToArena(p, CHINELO_RADIUS, ARENA_W, ARENA_H);
  for (const o of w.level.obstacles) p = pushOutOfRect(p, CHINELO_RADIUS, o);
  w.chinelo = p;
}

function applyPower(w: World, p: PowerUp, now: number): void {
  if (p.kind === 'inseticida') w.slowUntilMs = now + SLOW_MS;
  else if (p.kind === 'chinelada') w.chineladaArmed = true;
  else w.bait = { x: p.x, y: p.y, untilMs: now + BAIT_MS };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS (75 testes). Se um teste falhar por detalhe numérico (ex.: barata fugindo alguns décimos de px), conserte o **código** se a regra estiver errada; só ajuste o teste se ele contradisser as regras do cabeçalho deste plano, e relate.

- [ ] **Step 5: Commit**

```bash
git add src/logic/world.ts src/logic/world.test.ts
git commit -m "feat: mundo da fase (chinelo, acertos, multiplicação, power-ups, fim)"
```

---

### Task 7: Progresso salvo por fase

**Files:**
- Modify: `src/save.ts`, `src/save.test.ts`
- Create: `src/logic/progress.ts`
- Test: `src/logic/progress.test.ts`

- [ ] **Step 1: `src/save.ts` (substituir o arquivo inteiro)**

```ts
// Progresso salvo no navegador. A chave carrega a versão; campo inválido vira o padrão, sem perder os outros.
const KEY = 'matabarata:v1';

export interface LevelRecord {
  stars: number;
  best: number;
}

export interface SaveData {
  classicBest: number;
  levels: Record<string, LevelRecord>;
}

export const EMPTY: SaveData = { classicBest: 0, levels: {} };

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const isCount = (n: unknown, max = Infinity): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;

export function parseSave(raw: string | null): SaveData {
  try {
    const d = JSON.parse(raw ?? '');
    const levels: Record<string, LevelRecord> = {};
    for (const [id, r] of Object.entries(d?.levels ?? {})) {
      const rec = r as Partial<LevelRecord> | null;
      if (isCount(rec?.stars, 3) && isCount(rec?.best)) levels[id] = { stars: rec.stars, best: rec.best };
    }
    return { classicBest: isCount(d?.classicBest) ? d.classicBest : 0, levels };
  } catch {
    return { classicBest: 0, levels: {} };
  }
}

// O acesso a localStorage fica dentro do try: no modo privado do Safari ele pode lançar.
export function loadSave(store?: Store): SaveData {
  try {
    return parseSave((store ?? localStorage).getItem(KEY));
  } catch {
    return { classicBest: 0, levels: {} };
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

- [ ] **Step 2: `src/save.test.ts` (substituir o arquivo inteiro)**

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
    const data = { classicBest: 5000, levels: { 'cozinha-1': { stars: 2, best: 900 } } };
    writeSave(data, s);
    expect(loadSave(s)).toEqual(data);
  });

  it.each([null, '', '{', 'null', '{"classicBest":-1}', '{"classicBest":"9"}'])('dado inválido %j começa do zero', (raw) => {
    expect(parseSave(raw)).toEqual(EMPTY);
  });

  it('fase com registro inválido é descartada, o resto fica', () => {
    const raw = '{"classicBest":10,"levels":{"a":{"stars":4,"best":1},"b":{"stars":1,"best":-1},"c":{"stars":3,"best":50}}}';
    expect(parseSave(raw)).toEqual({ classicBest: 10, levels: { c: { stars: 3, best: 50 } } });
  });

  it('storage quebrado não lança', () => {
    expect(loadSave(broken)).toEqual(EMPTY);
    expect(() => writeSave(EMPTY, broken)).not.toThrow();
  });
});
```

- [ ] **Step 3: Testes `src/logic/progress.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isUnlocked, recordResult, totalStars } from './progress';
import type { SaveData } from '../save';

const ids = ['a', 'b', 'c'];
const save = (levels: SaveData['levels'] = {}): SaveData => ({ classicBest: 0, levels });

describe('progress', () => {
  it('a 1ª fase está sempre aberta; as outras abrem quando a anterior tem estrela', () => {
    const s = save({ a: { stars: 1, best: 100 } });
    expect([0, 1, 2].map((i) => isUnlocked(ids, i, s))).toEqual([true, true, false]);
  });

  it('guarda o melhor de estrelas e de pontos, separadamente', () => {
    let s = recordResult(save(), 'a', 3, 500).save;
    s = recordResult(s, 'a', 1, 900).save;
    expect(s.levels.a).toEqual({ stars: 3, best: 900 });
  });

  it('newBest só quando passa o recorde', () => {
    const s = recordResult(save(), 'a', 2, 500).save;
    expect(recordResult(s, 'a', 2, 400).newBest).toBe(false);
    expect(recordResult(s, 'a', 2, 501).newBest).toBe(true);
  });

  it('não mexe no save recebido', () => {
    const s = save();
    recordResult(s, 'a', 2, 500);
    expect(s.levels).toEqual({});
  });

  it('soma as estrelas', () => {
    expect(totalStars(save({ a: { stars: 3, best: 1 }, b: { stars: 1, best: 1 } }))).toBe(4);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL — "Failed to resolve import ./progress" (os testes do save já devem passar).

- [ ] **Step 5: `src/logic/progress.ts`**

```ts
import type { SaveData } from '../save';

/** A 1ª fase está sempre aberta; cada uma abre quando a anterior tem pelo menos 1 estrela. */
export function isUnlocked(levelIds: string[], index: number, save: SaveData): boolean {
  return index === 0 || (save.levels[levelIds[index - 1]]?.stars ?? 0) > 0;
}

/** Junta uma vitória ao save (sem alterar o recebido). */
export function recordResult(save: SaveData, id: string, stars: number, score: number): { save: SaveData; newBest: boolean } {
  const prev = save.levels[id];
  const rec = { stars: Math.max(prev?.stars ?? 0, stars), best: Math.max(prev?.best ?? 0, score) };
  return { save: { ...save, levels: { ...save.levels, [id]: rec } }, newBest: score > (prev?.best ?? 0) };
}

export const totalStars = (save: SaveData) => Object.values(save.levels).reduce((sum, r) => sum + r.stars, 0);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test` → Expected: PASS (81 testes). `npm run build` → sem erro (o `ClassicScene` usa `{ ...loadSave(), classicBest }`, que continua válido).

- [ ] **Step 7: Commit**

```bash
git add src/save.ts src/save.test.ts src/logic/progress.ts src/logic/progress.test.ts
git commit -m "feat: estrelas e recorde salvos por fase"
```

---

### Task 8: Sprites provisórios

**Files:**
- Create: `src/art/textures.ts`

- [ ] **Step 1: `src/art/textures.ts`**

```ts
import Phaser from 'phaser';

// Personagens provisórios em vetor, virados pra direita (rumo 0). O Google Flow só faz os fundos (etapa 3).
const OUTLINE = 0x3b1d0b;
type G = Phaser.GameObjects.Graphics;

export function ensureTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('chinelo')) return;
  draw(scene, 'roach-comum', 76, 52, (g) => roach(g, 0x8a4b23, 0x5c2f14));
  draw(scene, 'roach-ligeira', 76, 52, (g) => roach(g, 0xb5452a, 0x7a2412));
  draw(scene, 'chinelo', 120, 70, chinelo);
  draw(scene, 'power-inseticida', 80, 80, (g) => power(g, 0x3fbf6a, inseticida));
  draw(scene, 'power-chinelada', 80, 80, (g) => power(g, 0xf28c28, chinelada));
  draw(scene, 'power-isca', 80, 80, (g) => power(g, 0xf2c94c, isca));
  draw(scene, 'floor', 120, 120, floor);
}

function draw(scene: Phaser.Scene, key: string, w: number, h: number, paint: (g: G) => void): void {
  const g = scene.make.graphics({}, false);
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Corpo centrado em (32, 26): a cena usa origin (0.42, 0.5). */
function roach(g: G, body: number, head: number): void {
  const cx = 32;
  const cy = 26;
  g.lineStyle(3, OUTLINE);
  for (const dx of [-10, 0, 10]) {
    g.lineBetween(cx + dx, cy - 8, cx + dx - 7, cy - 22);
    g.lineBetween(cx + dx, cy + 8, cx + dx - 7, cy + 22);
  }
  g.lineBetween(cx + 24, cy - 3, cx + 42, cy - 16);
  g.lineBetween(cx + 24, cy + 3, cx + 42, cy + 16);
  g.fillStyle(body).fillEllipse(cx, cy, 44, 26).strokeEllipse(cx, cy, 44, 26);
  g.fillStyle(head).fillCircle(cx + 22, cy, 9).strokeCircle(cx + 22, cy, 9);
  g.fillStyle(0xffffff).fillCircle(cx + 25, cy - 3, 2.5);
}

function chinelo(g: G): void {
  const cx = 60;
  const cy = 35;
  g.fillStyle(0x2a9df4).fillEllipse(cx, cy, 104, 52);
  g.lineStyle(5, 0x0b4f8a).strokeEllipse(cx, cy, 104, 52);
  g.lineStyle(8, 0xffffff);
  g.lineBetween(cx + 22, cy, cx - 4, cy - 18);
  g.lineBetween(cx + 22, cy, cx - 4, cy + 18);
}

function power(g: G, ring: number, icon: (g: G) => void): void {
  g.fillStyle(0xffffff).fillCircle(40, 40, 34);
  g.lineStyle(6, ring).strokeCircle(40, 40, 34);
  icon(g);
}

function inseticida(g: G): void {
  g.fillStyle(0x3fbf6a).fillRoundedRect(30, 26, 20, 34, 5);
  g.fillStyle(0x2a2a2a).fillRect(34, 18, 12, 8);
  g.fillStyle(0xffffff).fillRect(33, 36, 14, 8);
}

function chinelada(g: G): void {
  const points = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? 10 : 24;
    const a = (i * Math.PI) / 8;
    points.push({ x: 40 + Math.cos(a) * r, y: 40 + Math.sin(a) * r });
  }
  g.fillStyle(0xf28c28).fillPoints(points, true);
}

function isca(g: G): void {
  g.fillStyle(0xf2c94c).fillTriangle(22, 54, 58, 54, 40, 24);
  g.fillStyle(0xd9a92e).fillCircle(36, 46, 4).fillCircle(46, 50, 3);
}

function floor(g: G): void {
  g.fillStyle(0xf6efe2).fillRect(0, 0, 120, 120);
  g.fillStyle(0xe9dcc5).fillRect(0, 0, 60, 60).fillRect(60, 60, 60, 60);
  g.lineStyle(2, 0xdccdb2).strokeRect(0, 0, 120, 120);
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run build` → Expected: sem erro.

- [ ] **Step 3: Commit**

```bash
git add src/art/textures.ts
git commit -m "feat: sprites provisórios da campanha em vetor"
```

---

### Task 9: A fase em jogo

**Files:**
- Create: `src/scenes/LevelScene.ts`

- [ ] **Step 1: `src/scenes/LevelScene.ts`**

```ts
import Phaser from 'phaser';
import { LEVELS } from '../levels';
import { ARENA_W, ARENA_H, type PowerKind } from '../logic/level';
import { createWorld, stepWorld, infestation, aliveRoaches, type World, type WorldEvent } from '../logic/world';
import { starsFor } from '../logic/scoring';
import { recordResult } from '../logic/progress';
import type { Roach } from '../logic/roach';
import type { Vec } from '../logic/geometry';
import { loadSave, writeSave } from '../save';
import { ensureTextures } from '../art/textures';
import { fitCamera, button, text } from './ui';

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

    this.add.tileSprite(0, HUD_H, ARENA_W, ARENA_H, 'floor').setOrigin(0);
    for (const o of level.obstacles) {
      this.add.rectangle(o.x, HUD_H + o.y, o.w, o.h, 0xb07a46).setOrigin(0).setStrokeStyle(6, 0x6b4423).setDepth(3);
    }
    for (const r of this.w.roaches) this.addRoach(r, false);
    this.chinelo = this.add.image(this.w.chinelo.x, HUD_H + this.w.chinelo.y, 'chinelo').setDepth(4);
    this.drawHud(level.name);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.aim(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.aim(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) this.target = null;
    });
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
  }

  update(time: number, delta: number) {
    if (this.pauseLayer || this.w.status !== 'playing') return;
    // teto evita um salto enorme depois de um engasgo
    for (const e of stepWorld(this.w, Math.min(delta, 50), this.target, Math.random)) this.onEvent(e);
    this.sync(time);
  }

  /** Mouse: segue sempre. Toque: só com o dedo na tela. */
  private aim(p: Phaser.Input.Pointer) {
    if (this.pauseLayer || (p.wasTouch && !p.isDown)) return;
    this.target = { x: p.worldX, y: p.worldY - HUD_H };
  }

  private onEvent(e: WorldEvent) {
    switch (e.type) {
      case 'kill':
        this.splat(e.roach, e.streak);
        break;
      case 'spawn':
        this.addRoach(e.roach, true);
        break;
      case 'power-spawn': {
        const img = this.add.image(e.power.x, HUD_H + e.power.y, `power-${e.power.kind}`).setDepth(2.5);
        this.tweens.add({ targets: img, y: img.y - 10, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
        this.powerImgs.set(e.power.id, img);
        break;
      }
      case 'power-pick':
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
      return;
    }
    this.tweens.pauseAll();
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
      ])
      .setDepth(20);
  }

  private finish(won: boolean) {
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
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run build` → Expected: sem erro (a cena ainda não está registrada; isso vem na Task 10).

- [ ] **Step 3: Commit**

```bash
git add src/scenes/LevelScene.ts
git commit -m "feat: cena da fase (chinelo, baratas, HUD, pausa, efeitos)"
```

---

### Task 10: Mapa, resultado e ligar a Campanha

**Files:**
- Create: `src/scenes/MapScene.ts`, `src/scenes/ResultScene.ts`
- Modify: `src/scenes/MenuScene.ts`, `src/main.ts`

- [ ] **Step 1: `src/scenes/ResultScene.ts`**

```ts
import Phaser from 'phaser';
import { LEVELS } from '../levels';
import { fitCamera, button, text } from './ui';
import { VIEW_W, VIEW_H } from './LevelScene';

interface ResultData {
  index: number;
  won: boolean;
  stars: number;
  score: number;
  newBest: boolean;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result');
  }

  create(d: ResultData) {
    fitCamera(this, VIEW_W, VIEW_H);
    this.cameras.main.setBackgroundColor(d.won ? '#ffd27a' : '#f4b6a8');
    const cx = VIEW_W / 2;

    text(this, cx, 230, d.won ? 'Fase limpa!' : 'Infestou!', 96, d.won ? '#7a3b10' : '#9b2c1c', '900');
    text(this, cx, 330, `Fase ${d.index + 1} · ${LEVELS[d.index].name}`, 34);
    for (let i = 0; i < 3; i++) {
      const star = this.add
        .star(cx + (i - 1) * 160, 520, 5, 34, 74, i < d.stars ? 0xf2c94c : 0xffffff)
        .setStrokeStyle(6, 0x7a3b10)
        .setScale(0);
      this.tweens.add({ targets: star, scale: 1, delay: 250 + i * 220, duration: 350, ease: 'Back.out' });
    }
    text(this, cx, 680, `${d.score} pontos`, 52, '#5a3300', '900');
    if (d.newBest) text(this, cx, 750, 'NOVO RECORDE!', 36, '#e8513a', '900');

    let y = 900;
    if (d.won && d.index + 1 < LEVELS.length) {
      button(this, cx, y, 480, 100, 'Próxima fase', () => this.scene.start('level', { index: d.index + 1 }), 0x3fbf6a);
      y += 130;
    }
    button(this, cx, y, 480, 100, d.won ? 'Repetir' : 'Tentar de novo', () => this.scene.start('level', { index: d.index }));
    button(this, cx, y + 130, 480, 100, 'Mapa', () => this.scene.start('map'), 0x7a3b10);
  }
}
```

- [ ] **Step 2: `src/scenes/MapScene.ts`**

```ts
import Phaser from 'phaser';
import { LEVELS } from '../levels';
import { isUnlocked, totalStars } from '../logic/progress';
import type { Vec } from '../logic/geometry';
import { loadSave } from '../save';
import { fitCamera, button, text } from './ui';
import { VIEW_W, VIEW_H } from './LevelScene';

// ponytail: trilha fixa das 5 fases da Cozinha; Banheiro e Quintal (etapa 4) ganham suas trilhas
const NODES: Vec[] = [
  { x: 250, y: 1120 },
  { x: 620, y: 960 },
  { x: 330, y: 780 },
  { x: 640, y: 590 },
  { x: 420, y: 400 },
];

export class MapScene extends Phaser.Scene {
  constructor() {
    super('map');
  }

  create() {
    fitCamera(this, VIEW_W, VIEW_H);
    this.cameras.main.setBackgroundColor('#ffd27a');
    const save = loadSave();
    const ids = LEVELS.map((l) => l.id);

    button(this, 110, 70, 180, 70, '← Menu', () => this.scene.start('menu'), 0x7a3b10);
    text(this, VIEW_W - 140, 70, `★ ${totalStars(save)}/${LEVELS.length * 3}`, 34, '#7a3b10', '900');
    text(this, VIEW_W / 2, 200, 'Cozinha', 72, '#7a3b10', '900');

    const path = this.add.graphics().fillStyle(0xc98a3c);
    for (let i = 1; i < NODES.length; i++) {
      const a = NODES[i - 1];
      const b = NODES[i];
      const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 34);
      for (let k = 1; k < n; k++) path.fillCircle(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n, 7);
    }

    LEVELS.forEach((level, i) => {
      const { x, y } = NODES[i];
      const rec = save.levels[level.id];
      const open = isUnlocked(ids, i, save);
      const node = this.add.circle(x, y, 62, !open ? 0xbbbbbb : rec ? 0x3fbf6a : 0x2a9df4).setStrokeStyle(8, 0xffffff);
      text(this, x, y, open ? String(i + 1) : '🔒', 48, '#ffffff', '900');
      if (!open) return;
      const stars = rec?.stars ?? 0;
      text(this, x, y + 90, '★'.repeat(stars) + '☆'.repeat(3 - stars), 34, '#e0a100', '900');
      node.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('level', { index: i }));
      if (!rec) this.tweens.add({ targets: node, scale: 1.1, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
    });
  }
}
```

- [ ] **Step 3: Ligar a Campanha no menu**

Em `src/scenes/MenuScene.ts`, trocar:

```ts
    button(this, 480, 410, 420, 70, 'Campanha — em breve');
```

por:

```ts
    button(this, 480, 410, 420, 70, 'Campanha', () => this.scene.start('map'), 0x3fbf6a);
```

e, logo abaixo do `once('keydown-ONE', ...)`, adicionar:

```ts
    this.input.keyboard?.once('keydown-TWO', () => this.scene.start('map'));
```

- [ ] **Step 4: Registrar as cenas em `src/main.ts`**

Imports:

```ts
import { MapScene } from './scenes/MapScene';
import { LevelScene } from './scenes/LevelScene';
import { ResultScene } from './scenes/ResultScene';
```

e:

```ts
  scene: [MenuScene, ClassicScene, MapScene, LevelScene, ResultScene],
```

- [ ] **Step 5: Verificar**

Run: `npm run build && npm test` → Expected: sem erro; 81 testes passando.

Teste manual (`npm run dev`; se não houver navegador, registre como pendente):
1. Menu → Campanha → mapa da Cozinha: fase 1 azul pulsando, 2–5 cinza com cadeado, "★ 0/15".
2. Fase 1: o chinelo segue o mouse (no celular, o dedo); baratas fogem dele; encostar dá "PAF!", combo aparece em mortes rápidas; filhotes surgem e a barra de infestação sobe e muda de cor.
3. Matar todas → "Fase limpa!", estrelas animadas, pontos; "Próxima fase" abre a 2; o mapa mostra a 1 verde com estrelas e a 2 liberada.
4. Fase 2: o chinelo não entra na mesa; baratas passam por baixo dela; o inseticida aparece por volta de 12 s e, pego, deixa as baratas esverdeadas e lentas.
5. Pausa (botão II ou Esc): Continuar / Reiniciar / Mapa funcionam.
6. Deixar infestar → "Infestou!" com "Tentar de novo".

- [ ] **Step 6: Commit**

```bash
git add src/scenes/MapScene.ts src/scenes/ResultScene.ts src/scenes/MenuScene.ts src/main.ts
git commit -m "feat: campanha jogável (mapa da Cozinha, resultado com estrelas)"
```

---

### Task 11: Documentação

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Atualizar a seção Arquitetura do `CLAUDE.md`**

Adicionar, depois do item do Modo Clássico:

```markdown
- Tela: `Scale.RESIZE` (canvas = janela); cada cena chama `fitCamera(scene, w, h)` de `scenes/ui.ts` com sua área de
  design (menu/Clássico 960×600; campanha 900×1320 = HUD 120 + arena 900×1200, em pé). Use `pointer.worldX/Y`.
- Campanha: `logic/world.ts` é o mundo da fase (`createWorld` + `stepWorld(world, dtMs, alvo, rand)` → eventos);
  `LevelScene` desenha o estado e reage aos eventos. Baratas em `logic/roach.ts` (balanceamento nas constantes `ROACH`),
  combo/estrelas em `logic/scoring.ts`, desbloqueio em `logic/progress.ts`.
- Fases: `src/levels/*.json`, na ordem de `src/levels/index.ts`; todas passam por `validateLevel` nos testes.
  Obstáculos bloqueiam só o chinelo; barata com o centro dentro de um obstáculo está escondida (não leva chinelada).
- Sprites provisórios em vetor (`art/textures.ts`); fundos virão do Google Flow (etapa 3).
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: campanha no CLAUDE.md"
```
