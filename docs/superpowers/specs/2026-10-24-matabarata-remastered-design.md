# MataBarata Remastered — design

Data: 2026-10-24. Remake do jogo de console em C++ feito no SENAI em 2013
(`G:\Meu Drive\STUFFS\SENAI\TCC - SENAI\Docs\Jogo_Matabarata\1RV_Lop_baratas.cpp`).
Projeto novo, separado do Orbit.

## Objetivo

Jogo de navegador, bonito, que roda no PC e no iPhone (instalável, offline), com dois modos:

- **Modo Clássico** — homenagem fiel às regras de 2013, visual de "terminal remasterizado".
- **Campanha** — jogo novo em estilo cartoon: 15 fases em 3 cenários.

Fora do escopo agora: modo infinito (meta futura), contas, placar online, monetização.

## Stack

Phaser 3 + TypeScript + Vite. Site estático (GitHub Pages; itch.io opcional por zip). PWA offline.
Testes com Vitest. Sem servidor.

## Modo Clássico (fiel a 2013)

Regras do original:

- Arena em grade de 80×25 células com borda (`X`). O cursor gira `| / - \` a cada passo.
- O cursor anda sozinho, uma célula por passo, na última direção escolhida (WASD/setas no PC, deslizar o dedo
  no celular).
- O passo começa em 100 ms; cada barata morta tira 3 ms (`vel -= 3`), até chegar a 10 ms com as 30 mortas.
- 30 baratas paradas em posições aleatórias dentro da arena. Passar por cima mata: +1000 pontos e um bip
  (400 Hz, 50 ms).
- Encostar na borda = game over, com a melodia original (196/500, 292/100, 350/300, 330/500, 306/800 —
  Hz/ms).
- Matou as 30 = vitória.

Visual: tela verde no preto com brilho, linhas de varredura e leve curvatura (CRT), texto em fonte mono.
Abertura com a barata em ASCII e "MATA / BARATA.COM", como em 2013. Sons em onda quadrada (Web Audio)
com as mesmas notas do original. Recorde salvo.

## Campanha (cartoon)

**Jogador:** um chinelo que segue o dedo/mouse com velocidade máxima (não teletransporta). Acerta a barata
ao encostar nela.

**Derrota por infestação:** as baratas se multiplicam com o tempo; a barra de infestação mede baratas vivas
em relação ao limite da fase. Passou do limite = derrota. Não há outra forma de perder.

**Vitória:** matar todas as baratas.

**Estrelas (1–3):** 1 por vencer; +1 se vencer abaixo do tempo-alvo da fase; +1 se a infestação nunca passou
de 50% do limite.

**Fases:** 15 em 3 cenários, liberadas em sequência — Cozinha (1–5), Banheiro (6–10), Quintal (11–15). A fase
15 é a "infestação final". Obstáculos (móveis etc.) bloqueiam o chinelo e escondem baratas, mas não matam.

**Tipos de barata:**

| Tipo | Comportamento | Estreia |
|---|---|---|
| Comum | lenta; foge quando o chinelo se aproxima | fase 1 |
| Ligeira | rápida, trajeto errático | fase 3 |
| Mãe | maior; bota filhotes de tempos em tempos | Banheiro |
| Escondida | fica atrás de obstáculos e sai de repente | Banheiro |
| Voadora | voa; intangível por 1 s ao decolar | Quintal |

**Power-ups** (aparecem no chão, pegos ao passar por cima):

- 🧴 Inseticida — todas as baratas lentas por 5 s.
- 💥 Chinelada — o próximo acerto mata em área.
- 🧲 Isca — baratas param de fugir e são atraídas por 4 s.

**Pontos:** cada barata vale 100; um acerto até 1,5 s depois do anterior continua o combo, e cada barata
na sequência vale +50% sobre a base (1ª 100, 2ª 150, 3ª 200…). Recorde por fase.

## Arte e som

- **Google Flow** (gerado pelo usuário a partir de prompts escritos no projeto, com um guia de estilo comum):
  fundos dos cenários vistos de cima e sem personagens, ilustração do título, ícone do app e artes de
  "cenário concluído". Prompts ficam em `docs/prompts-flow.md`.
- **Personagens e efeitos** (baratas, chinelo, power-ups, "PAF!", poeira, estrelas): vetoriais desenhados
  no código e convertidos em textura no Boot. Traço grosso, cores vivas. Estados: andar, fugir, morrer
  (PAF!), voar.
- **Obstáculos:** retângulos sólidos definidos no arquivo da fase, alinhados ao desenho do fundo.
- **Fonte:** uma fonte cartoon do Google Fonts, incluída no build (funciona offline).
- **Efeitos sonoros:** Kenney (CC0) ou sintetizados em estilo retrô. **Música:** uma faixa CC0 por cenário.
  Nada de música gerada por IA.
- Áudio só começa após o primeiro toque (exigência do iOS).
- Até os fundos chegarem, as fases usam um piso provisório desenhado em código.

**Telas:** Título → Menu (Clássico | Campanha) → Mapa de fases (trilha com estrelas e cadeados) → Fase
(HUD: pausa, nº da fase, pontos, barra de infestação) → Resultado (estrelas, pontos, recorde). Mockups
aprovados no brainstorming.

## Arquitetura

```
src/
  main.ts               config do Phaser (escala FIT, toque + mouse + teclado)
  scenes/               Boot, Title, Menu, Classic, Map, Level, Result, Pause
  logic/                TypeScript puro, sem Phaser — tudo testável
    classic.ts          regras de 2013 (passo, velocidade, borda, morte, vitória)
    roach.ts            comportamento por tipo (fugir, errático, botar, esconder, voar)
    infestation.ts      barra e derrota
    scoring.ts          pontos, combo, estrelas
    level.ts            tipo LevelData + validação
  art/                  desenho vetorial dos sprites (gera texturas)
  audio/                sintetizador dos bips do Clássico + carregamento de SFX/música
  save.ts               localStorage
public/levels/          cozinha-1.json … quintal-15.json
public/bg/              fundos do Google Flow
```

As cenas só desenham e repassam entrada; toda decisão de jogo passa por `logic/`. A lógica avança por
`update(state, dtMs, input)` determinístico (aleatoriedade por semente injetada), o que permite testar
sem navegador.

**Arquivo de fase:** fundo, obstáculos (`{x,y,w,h}`), baratas iniciais por tipo, taxa de multiplicação,
limite de infestação, tempo-alvo da 2ª estrela e power-ups disponíveis.

## Persistência

`localStorage`, chave única versionada: estrelas e recorde por fase, recorde do Clássico, volume. Leitura
corrompida ou de versão desconhecida → começa do zero, sem travar.

## Erros

- Fase com JSON inválido não carrega: o teste de validação barra no build.
- Fundo que falhar ao carregar → usa o piso provisório.
- Sem áudio disponível → jogo segue mudo.

## Testes (Vitest)

- Clássico: passo inicial 100 ms, −3 ms por morte, borda mata, 30 mortes vencem, +1000 por barata.
- Infestação: multiplicação e derrota no limite.
- Pontos/combo/estrelas.
- Validação de todos os arquivos em `public/levels/`.
- `save.ts` com dado corrompido.

## Publicação

Repositório no GitHub; GitHub Actions faz build + testes e publica no GitHub Pages a cada push em `master`.
PWA com manifest e service worker (precache do build).

## Ordem de construção

1. Esqueleto (Vite + Phaser + PWA + deploy) e **Modo Clássico completo** — publicável sozinho.
2. Motor da campanha + Cozinha (fases 1–5) com arte provisória.
3. Fundos do Google Flow + som.
4. Banheiro e Quintal (fases 6–15).
