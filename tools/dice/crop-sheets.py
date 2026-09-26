"""Recorta las caras de las hojas de dados de img/assets/dices/ (GPT, 25-09)
en imagenes sueltas para la web y la app movil.

Uso, desde la raiz del repo:  python3 tools/dice/crop-sheets.py

Cada hoja (dice_d4.png ... dice_d20.png) es una reticula de 6 x 6 celdas
iguales sobre fondo negro, con los dados en orden de lectura desde el 1. Las
celdas ocupadas se detectan por brillo, asi que da igual cuantas por fila
puso el generador (el d8 salio a 4 por fila y el d10 a 5). Salida:
apps/web/public/dice/d<caras>-<valor>.png y una copia en
apps/mobile/assets/dice/, mas el mapa de require() de la app.
"""

from pathlib import Path

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "img" / "assets" / "dices"
TARGETS = [ROOT / "apps" / "web" / "public" / "dice", ROOT / "apps" / "mobile" / "assets" / "dice"]
SIDES = [4, 6, 8, 10, 12, 20]
GRID = 6
# Se recorta un poco por dentro de la celda para no llevarse la linea gris de la reticula.
INSET = 6
OUTPUT = 192


def cells(image: Image.Image) -> list[tuple[int, int, int, int]]:
    w, h = image.size
    cw, ch = w / GRID, h / GRID
    out = []
    for row in range(GRID):
        for col in range(GRID):
            box = (round(col * cw) + INSET, round(row * ch) + INSET, round((col + 1) * cw) - INSET, round((row + 1) * ch) - INSET)
            out.append(box)
    return out


def occupied(image: Image.Image, box: tuple[int, int, int, int]) -> bool:
    # Una celda vacia es negro casi puro; una con dado tiene brillo medio claro.
    return ImageStat.Stat(image.crop(box).convert("L")).mean[0] > 12


def crop_sheet(sides: int) -> list[str]:
    image = Image.open(SOURCE / f"dice_d{sides}.png").convert("RGB")
    boxes = [box for box in cells(image) if occupied(image, box)]
    if len(boxes) != sides:
        raise SystemExit(f"d{sides}: se esperaban {sides} celdas con dado y hay {len(boxes)}")
    names = []
    for value, box in enumerate(boxes, start=1):
        face = image.crop(box).resize((OUTPUT, OUTPUT), Image.LANCZOS)
        name = f"d{sides}-{value}"
        for target in TARGETS:
            face.save(target / f"{name}.png", optimize=True)
        names.append(name)
    return names


def write_mobile_map(names: list[str]) -> None:
    """React Native exige require() estatico por archivo: se genera el mapa."""
    lines = [
        "/* eslint-disable @typescript-eslint/no-require-imports */",
        "// Generado por tools/dice/crop-sheets.py a partir de img/assets/dices/; no editar a mano.",
        "// Caras de dado de las hojas: React Native exige require() estatico por archivo.",
        "import type { ImageSourcePropType } from 'react-native'",
        "",
        "export const DICE_FACES: Record<string, ImageSourcePropType> = {",
    ]
    lines += [f'  "{n}": require("../../assets/dice/{n}.png"),' for n in names]
    lines += ["}", ""]
    (ROOT / "apps" / "mobile" / "src" / "generated" / "dice.ts").write_text("\n".join(lines))


def main() -> None:
    for target in TARGETS:
        target.mkdir(parents=True, exist_ok=True)
        for old in target.glob("d*-*.png"):
            old.unlink()
    names: list[str] = []
    for sides in SIDES:
        names += crop_sheet(sides)
    write_mobile_map(names)
    print(f"{len(names)} caras en {', '.join(str(t.relative_to(ROOT)) for t in TARGETS)}")


if __name__ == "__main__":
    main()
