# Converte a arte original do Google Flow (art/flow/*.jpg) no que o jogo publica:
# WebP no tamanho de uso em public/bg/ e os PNGs do ícone em public/.
# Uso: python scripts/prep-art.py   (precisa de Pillow)
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'flow'
BG = ROOT / 'public' / 'bg'
BG.mkdir(parents=True, exist_ok=True)

# nome: largura máxima em px (altura proporcional) — o tamanho em que o jogo desenha, com folga pro zoom
SIZES = {
    'titulo': 1376,
    'cozinha-piso': 900,
    'cozinha-mesa': 600,
    'cozinha-balcao': 1000,
    'cozinha-concluida': 896,
    'cozinha-mapa': 896,
}

for name, width in SIZES.items():
    img = Image.open(SRC / f'{name}.jpg').convert('RGB')
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    out = BG / f'{name}.webp'
    img.save(out, 'WEBP', quality=82, method=6)
    print(f'{out.relative_to(ROOT)}  {img.width}x{img.height}  {out.stat().st_size // 1024} KB')

icon = Image.open(SRC / 'icone.jpg').convert('RGB')
for size, file in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
    out = ROOT / 'public' / file
    icon.resize((size, size), Image.LANCZOS).save(out, 'PNG', optimize=True)
    print(f'{out.relative_to(ROOT)}  {size}x{size}  {out.stat().st_size // 1024} KB')
