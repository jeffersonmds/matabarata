# Prompts do Google Flow

Arte gerada no Google Flow (imagens). Os personagens animados (baratas, chinelo, power-ups) continuam em vetor no
código; daqui saem fundos, móveis, título e ícone. Destino: `public/bg/` (nomes abaixo).

Os móveis mudam de lugar em cada fase, então o fundo é **só o piso** e cada móvel é uma imagem que preenche o próprio
retângulo (esticada até o tamanho do obstáculo).

## Guia de estilo (vai no fim de todo prompt)

> Bright cartoon style for a casual mobile game, thick dark-brown outlines, flat vivid colors with soft cel shading,
> warm sunny palette (cream, butter yellow, terracotta, sky blue), clean and readable, no text, no letters, no
> watermark, no people, no insects.

"No insects" é de propósito: as baratas são desenhadas pelo jogo por cima.

## Imagens

| Arquivo | Proporção | Uso |
|---|---|---|
| `titulo.png` | 16:9 | fundo do menu (960×600) |
| `cozinha-piso.png` | 3:4 | piso das fases da Cozinha (900×1200) |
| `cozinha-mesa.png` | 1:1 | obstáculo "mesa" |
| `cozinha-balcao.png` | 16:9 | obstáculo "balcão" (retângulos compridos) |
| `icone.png` | 1:1 | ícone do app (vira PNG 512 e 192) |
| `cozinha-concluida.png` | 3:4 | tela de cenário concluído |

### titulo.png (16:9)

A cozy Brazilian home kitchen seen from a low, playful angle, morning light through a window, a blue flip-flop
(chinelo) lying heroically in the foreground on the tiled floor, empty space in the upper center for the game logo.
+ guia de estilo

### cozinha-piso.png (3:4)

Seamless top-down view of a kitchen floor, cream and beige checkered ceramic tiles, a few subtle crumbs and a small
coffee stain, even lighting, no furniture, no objects, no shadows of furniture, flat orthographic overhead view.
+ guia de estilo

### cozinha-mesa.png (1:1)

Top-down orthographic view of a wooden kitchen table surface filling the entire frame edge to edge, warm wood
planks, a checkered tablecloth corner, a plate with bread and a coffee cup, no background visible around the table.
+ guia de estilo

### cozinha-balcao.png (16:9)

Top-down orthographic view of a long kitchen countertop filling the entire frame edge to edge, light granite surface,
a sink, a cutting board with vegetables, a fruit bowl, no background visible around the counter.
+ guia de estilo

### icone.png (1:1)

App icon: a cute cartoon cockroach with big worried eyes running away from a blue flip-flop about to smack it,
dynamic diagonal composition, solid butter-yellow background, centered with margin, bold and readable at small size.
+ guia de estilo (aqui o "no insects" sai: o ícone tem a barata)

### cozinha-concluida.png (3:4)

A sparkling clean kitchen celebrating victory, a blue flip-flop on a small podium with confetti and stars around,
sunbeams, joyful atmosphere, empty space at the top for text.
+ guia de estilo

## Ao gerar

Gere 2–4 variações por prompt e escolha a que mais combina com as outras (mesmo traço, mesma paleta). Se uma sair
com texto ou inseto, gere de novo.
