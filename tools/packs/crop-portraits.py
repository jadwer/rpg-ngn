"""Recorta los retratos de una lamina de personajes al estandar del pack.

Estandar de retrato (docs/05): cuadrado de 512x512, WebP, encuadrado en cara y
hombros con la cara en el tercio superior. Los tres clientes pintan el retrato
como un cuadrado con recorte centrado (`object-fit: cover`), asi que un retrato
vertical pierde la cabeza y enseña el torso: paso con la boticaria el 19-09.

La lamina de "El te que nadie probo" (img/ElTeQueNadieProbo/boticaria.png,
1536x1024) trae los cinco personajes en columnas del mismo ancho. De cada
columna se saca un cuadrado del ancho util de la columna, empezando donde
arranca la cabeza, y se escala a 512.

Uso, desde la raiz del repo:

    python3 tools/packs/crop-portraits.py <lamina> <destino> <id1> <id2> ... [--top 0.245] [--side 0.03] [--rows 1] [--header 0]

Ejemplo:

    python3 tools/packs/crop-portraits.py \\
        img/ElTeQueNadieProbo/boticaria.png \\
        ~/dev/rpg-packs/boticaria/portraits \\
        ryomen shiho kogen byakuren tenma

`--top` es la fraccion de la altura donde empieza el cuadrado (la cenefa del
titulo queda arriba); `--side` el margen lateral dentro de la columna para no
arrastrar el marco del panel. Con `--rows 2` la lamina es una rejilla (los ids
van por filas, de izquierda a derecha): `--header` es la fraccion de la altura
que ocupa el titulo de la lamina antes de la primera fila, y `--top` se mide
dentro de cada celda. La lamina de La Mascarada (img/jugables.png del pack,
4x2 con tarjetas) sale con `--rows 2 --header 0.05 --top 0.02 --side 0.06`. Si la lamina es mas pequeña que 512 por
personaje, el retrato sale escalado hacia arriba: mejor pedir al generador
retratos sueltos de 1024 cuando se quiera mas nitidez.
"""

import sys
from pathlib import Path

from PIL import Image

SIZE = 512
QUALITY = 82


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = {a.split("=")[0]: a.split("=")[1] for a in sys.argv[1:] if a.startswith("--") and "=" in a}
    if len(args) < 3:
        print(__doc__)
        return 1

    lamina = Path(args[0])
    destino = Path(args[1]).expanduser()
    ids = args[2:]
    top = float(opts.get("--top", 0.245))
    side = float(opts.get("--side", 0.03))
    rows = int(opts.get("--rows", 1))
    header = float(opts.get("--header", 0))

    if not lamina.is_file():
        print(f"no existe la lamina: {lamina}", file=sys.stderr)
        return 1

    destino.mkdir(parents=True, exist_ok=True)
    image = Image.open(lamina).convert("RGB")
    width, height = image.size
    if len(ids) % rows != 0:
        print(f"{len(ids)} ids no se reparten en {rows} filas", file=sys.stderr)
        return 1
    cols = len(ids) // rows
    column = width / cols
    inner = int(column * (1 - 2 * side))
    grid_top = height * header
    cell = (height - grid_top) / rows
    if cell * top + inner > cell:
        print(f"el cuadrado de {inner}px no cabe en una celda de {int(cell)}px de alto desde {int(cell * top)}", file=sys.stderr)
        return 1

    for index, character in enumerate(ids):
        row, col = divmod(index, cols)
        left = int(col * column + column * side)
        y0 = int(grid_top + row * cell + cell * top)
        box = (left, y0, left + inner, y0 + inner)
        out = destino / f"{character}.webp"
        image.crop(box).resize((SIZE, SIZE), Image.LANCZOS).save(out, "WEBP", quality=QUALITY, method=6)
        print(f"{out}  recorte {inner}x{inner} en ({left},{y0}) -> {SIZE}x{SIZE}, {out.stat().st_size} bytes")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
