#!/usr/bin/env bash
# Valida una carpeta de pack y la empaqueta como .rpgpack, listo para subir
# en /mundos (entrega 8, docs/15). Mismas reglas que aplica el servidor: si
# aqui falla, alla tambien.
#
#   tools/packs/pack.sh ~/mis-mundos/salon            # deja salon-0.1.0.rpgpack aqui
#   tools/packs/pack.sh ~/mis-mundos/salon dist/       # o en otra carpeta
#
# El zip lleva el contenido de la carpeta en la raiz (pack.json arriba del
# todo), sin archivos ocultos ni nada que el servidor rechace: solo json,
# webp, png, jpg, md y txt.
set -euo pipefail

dir="${1:-}"
out="${2:-.}"
if [ -z "$dir" ] || [ ! -d "$dir" ]; then
  echo "uso: $0 <carpeta-del-pack> [carpeta-de-salida]" >&2
  exit 1
fi
dir="$(cd "$dir" && pwd)"
repo="$(cd "$(dirname "$0")/../.." && pwd)"

if [ ! -f "$dir/pack.json" ]; then
  echo "falta pack.json en $dir" >&2
  exit 1
fi

echo "Validando $dir"
(cd "$repo/tools/validate" && pnpm exec tsx src/cli.ts --pack "$dir")

id="$(python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); print(m["id"]+"-"+m["version"])' "$dir/pack.json")"
mkdir -p "$out"
file="$(cd "$out" && pwd)/$id.rpgpack"
rm -f "$file"

# Lo que el servidor admite (config/packs.php de la API). El resto se deja
# fuera y se avisa, en vez de que la subida lo rechace.
fuera="$(cd "$dir" && find . -type f ! -path '*/.*' | grep -viE '\.(json|webp|png|jpe?g|md|txt)$' || true)"
if [ -n "$fuera" ]; then
  echo "Se dejan fuera (el servidor no los admite):"
  echo "$fuera" | sed 's/^/  /'
fi

(cd "$dir" && find . -type f ! -path '*/.*' | grep -iE '\.(json|webp|png|jpe?g|md|txt)$' | sed 's#^\./##' | sort | zip -q -X "$file" -@)

bytes="$(stat -c %s "$file")"
echo "Listo: $file ($((bytes / 1024)) KB). Súbelo en /mundos."
if [ "$bytes" -gt $((20 * 1024 * 1024)) ]; then
  echo "Aviso: pasa de 20 MB, el servidor lo rechazara. Reduce las imagenes (tools/packs/crop-portraits.py)." >&2
fi
