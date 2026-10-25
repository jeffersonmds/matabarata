# Recorta os sprites gerados no Google Flow (art/flow/sprite-*.jpg, fundo magenta #FF00FF) em PNG transparente:
# fundo vira alfa (com borda suave e sem "franja" rosa), corta as sobras e reduz pro tamanho de uso em public/sprites/.
# Uso: python scripts/prep-sprites.py   (precisa de Pillow)
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'flow'
OUT = ROOT / 'public' / 'sprites'
OUT.mkdir(parents=True, exist_ok=True)

# nome: largura final em px (o jogo desenha menor; a folga é pro zoom da câmera)
SPRITES = {
    'chinelo': 240, 'barata-comum': 180, 'barata-ligeira': 180,
    'power-inseticida': 150, 'power-chinelada': 150, 'power-isca': 150, 'paf': 240,
}


def key_magenta(img: Image.Image) -> Image.Image:
    img = img.convert('RGBA')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            m = min(r, b) - g  # "magentice": alto no fundo, negativo em marrom/azul/laranja, ~0 no branco
            alpha = max(0, min(255, round(255 * (180 - m) / 120)))
            if alpha < 255:
                # tira o rosa da borda semitransparente
                r, b = min(r, g + (r - g) * alpha // 255), min(b, g + (b - g) * alpha // 255)
            px[x, y] = (r, g, b, alpha)
    return img


for name, width in SPRITES.items():
    img = key_magenta(Image.open(SRC / f'sprite-{name}.jpg').convert('RGBA'))
    img = img.crop(img.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox())
    img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    out = OUT / f'{name}.png'
    img.save(out, 'PNG', optimize=True)
    print(f'{out.relative_to(ROOT)}  {img.width}x{img.height}  {out.stat().st_size // 1024} KB')
