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
