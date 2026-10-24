# CLAUDE.md

MataBarata Remastered: remake no navegador do jogo de console em C++ feito no SENAI em 2013.
Spec: `docs/superpowers/specs/2026-10-24-matabarata-remastered-design.md`. Planos em `docs/superpowers/plans/`.

Código, comentários e commits em **português**.

## Comandos

    npm run dev       # servidor local
    npm test          # Vitest (src/**/*.test.ts)
    npm run build     # tsc + vite build → dist/ (com service worker)

Push em `master` publica no GitHub Pages (`.github/workflows/deploy.yml`: testes + build + deploy; o Pages do repo usa `build_type=workflow`). Site: https://jeffersonmds.github.io/matabarata/

## Arquitetura

- `src/logic/`: TypeScript puro, sem Phaser — toda regra de jogo. Testes `*.test.ts` ao lado. Aleatoriedade
  sempre injetada (`rand: () => number`).
- `src/scenes/`: Phaser só desenha e repassa entrada; nenhuma regra aqui.
- Modo Clássico: coordenadas do console original (80×25, 1-based, célula 12×24 px, canvas 960×600). As regras
  imitam o `.cpp` de 2013 de propósito — não "conserte".
- Tela: `Scale.RESIZE` (canvas = janela); cada cena chama `fitCamera(scene, w, h)` de `scenes/ui.ts` com sua área de
  design (menu/Clássico 960×600; campanha 900×1320 = HUD 120 + arena 900×1200, em pé). Use `pointer.worldX/Y`.
- Campanha: `logic/world.ts` é o mundo da fase (`createWorld` + `stepWorld(world, dtMs, alvo, rand)` → eventos);
  `LevelScene` desenha o estado e reage aos eventos. Baratas em `logic/roach.ts` (balanceamento nas constantes `ROACH`),
  combo/estrelas em `logic/scoring.ts`, desbloqueio em `logic/progress.ts`.
- Fases: `src/levels/*.json`, na ordem de `src/levels/index.ts`; todas passam por `validateLevel` nos testes
  (`limit` ≥ 2× as baratas iniciais, senão a 3ª estrela fica impossível; obstáculo ≥ 100 px, senão o chinelo atravessa).
  Obstáculos bloqueiam só o chinelo; barata com o centro dentro de um obstáculo está escondida (não leva chinelada).
- Sprites provisórios em vetor (`art/textures.ts`); fundos virão do Google Flow (etapa 3).
- `src/save.ts`: `localStorage` em chave versionada (`matabarata:v1`); nunca lança.
- Áudio (`src/audio/beeper.ts`): Web Audio liberado no 1º toque/tecla (exigência do iOS); sem áudio = mudo.
- `// ponytail:` marca simplificação deliberada com teto conhecido — respeite.
