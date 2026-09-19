"""Recorta los retratos de una lamina de personajes en imagenes sueltas.

La lamina de "El te que nadie probo" (img/ElTeQueNadieProbo/boticaria.png,
1536x1024) trae los cinco personajes en columnas del mismo ancho. De cada
columna se saca un retrato vertical, encuadrado en la cara y el torso, que es
lo que pinta la ficha.

Uso, desde la raiz del repo:

    python3 tools/packs/crop-portraits.py <lamina> <destino> <id1> <id2> ...

Ejemplo:

    python3 tools/packs/crop-portraits.py \\
        img/ElTeQueNadieProbo/boticaria.png \\
        ~/dev/rpg-packs/portraits \\
        ryomen shiho kogen byakuren tenma

Las medidas salen del ancho de la lamina dividido entre el numero de
personajes; si una lamina futura tiene otro reparto, se le pasan los
personajes que tenga y se ajusta el margen.
"""

import sys
from pathlib import Path

from PIL import Image

# La lamina deja una cenefa arriba (titulo) y abajo (frase y pie). El retrato
# util queda en la franja de en medio.
TOP = 0.235
BOTTOM = 0.85
# Margen lateral dentro de cada columna, para no arrastrar el borde del panel.
SIDE = 0.03


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 1

    lamina = Path(sys.argv[1])
    destino = Path(sys.argv[2]).expanduser()
    ids = sys.argv[3:]

    if not lamina.is_file():
        print(f"no existe la lamina: {lamina}", file=sys.stderr)
        return 1

    destino.mkdir(parents=True, exist_ok=True)
    image = Image.open(lamina).convert("RGB")
    width, height = image.size
    column = width / len(ids)

    for index, character in enumerate(ids):
        left = int(index * column + column * SIDE)
        right = int((index + 1) * column - column * SIDE)
        box = (left, int(height * TOP), right, int(height * BOTTOM))
        out = destino / f"{character}.jpg"
        image.crop(box).save(out, "JPEG", quality=88)
        print(f"{out}  {box[2] - box[0]}x{box[3] - box[1]}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
