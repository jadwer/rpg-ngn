"""Recorta las caras de los dados de img/dices.png (lamina de Gabino, 2026-09-12)
en imagenes sueltas para la web y la app movil.

Uso, desde la raiz del repo:  python3 tools/dice/crop.py

Salida: apps/web/public/dice/d<caras>-<valor>.png y una copia en
apps/mobile/assets/dice/. Las cajas estan medidas a mano sobre la lamina de
1536x1024; si cambia la lamina, hay que volver a medirlas.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "img" / "dices.png"
TARGETS = [ROOT / "apps" / "web" / "public" / "dice", ROOT / "apps" / "mobile" / "assets" / "dice"]


def boxes() -> dict[str, tuple[int, int, int, int]]:
    out: dict[str, tuple[int, int, int, int]] = {}
    xs = [72, 187, 302, 417, 532]
    ys = [190, 372, 542, 722]
    n = 1
    for y in ys:
        for x in xs:
            out[f"d20-{n}"] = (x - 66, y - 66, x + 66, y + 66)
            n += 1
    d8 = {1: (683, 215), 2: (843, 215), 3: (1000, 215), 4: (683, 475), 5: (843, 475), 6: (1000, 475), 7: (745, 725), 8: (925, 725)}
    for k, (x, y) in d8.items():
        out[f"d8-{k}"] = (x - 68, y - 100, x + 68, y + 78)
    d6 = {1: (1205, 215), 2: (1405, 215), 3: (1205, 450), 4: (1405, 450), 5: (1205, 690), 6: (1405, 690)}
    for k, (x, y) in d6.items():
        out[f"d6-{k}"] = (x - 92, y - 98, x + 92, y + 72)
    return out


def write_mobile_map() -> None:
    """React Native exige require() estatico por archivo: se genera el mapa."""
    names = list(boxes().keys())
    lines = [
        "/* eslint-disable @typescript-eslint/no-require-imports */",
        "// Generado por tools/dice/crop.py a partir de img/dices.png; no editar a mano.",
        "// Caras de dado de la lamina: React Native exige require() estatico por archivo.",
        "import type { ImageSourcePropType } from 'react-native'",
        "",
        "export const DICE_FACES: Record<string, ImageSourcePropType> = {",
    ]
    lines += [f'  "{n}": require("../../assets/dice/{n}.png"),' for n in names]
    lines += ["}", ""]
    (ROOT / "apps" / "mobile" / "src" / "generated" / "dice.ts").write_text("\n".join(lines))


def main() -> None:
    image = Image.open(SOURCE).convert("RGB")
    for target in TARGETS:
        target.mkdir(parents=True, exist_ok=True)
    for name, box in boxes().items():
        crop = image.crop(box)
        for target in TARGETS:
            crop.save(target / f"{name}.png", optimize=True)
    write_mobile_map()
    print(f"{len(boxes())} caras en {', '.join(str(t.relative_to(ROOT)) for t in TARGETS)}")


if __name__ == "__main__":
    main()
