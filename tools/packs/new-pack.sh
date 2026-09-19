#!/usr/bin/env bash
# Crea el repositorio privado de un pack en Gitea y sube lo que haya en la
# carpeta local. Existe porque van a ser muchos packs y crear cada repo a
# mano en la web no escala.
#
#   tools/packs/new-pack.sh boticaria ~/dev/rpg-packs/boticaria
#
# El token va en ~/.config/gitea/token (permisos 600) y necesita alcance
# `repository` y `organization` en escritura. No se pasa por argumento para
# que no quede en el historial del shell.
set -euo pipefail

GITEA="${GITEA_URL:-https://git.atomosoluciones.com}"
SSH_PORT="${GITEA_SSH_PORT:-2222}"
ORG="${GITEA_ORG:-rpg-packs}"
TOKEN_FILE="${GITEA_TOKEN_FILE:-$HOME/.config/gitea/token}"

nombre="${1:-}"
ruta="${2:-.}"

if [ -z "$nombre" ]; then
  echo "uso: $0 <nombre-del-pack> [ruta-local]" >&2
  exit 1
fi

if [ ! -s "$TOKEN_FILE" ]; then
  echo "falta el token de Gitea en $TOKEN_FILE" >&2
  echo "se genera en $GITEA/user/settings/applications con alcance repository y organization" >&2
  exit 1
fi
TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"

# Crear el repo. Gitea no permite crear repos de organizacion con un push,
# asi que hay que pedirlo por API antes.
codigo=$(curl -s -o /tmp/gitea-new-pack.json -w '%{http_code}' \
  -X POST "$GITEA/api/v1/orgs/$ORG/repos" \
  -H "Authorization: token $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$nombre\",\"private\":true,\"auto_init\":false,\"description\":\"Pack privado de rpg-ngn\"}")

case "$codigo" in
  201) echo "repo creado: $ORG/$nombre" ;;
  409) echo "el repo $ORG/$nombre ya existe; se sube igual" ;;
  *)   echo "Gitea respondio $codigo:" >&2; cat /tmp/gitea-new-pack.json >&2; exit 1 ;;
esac
rm -f /tmp/gitea-new-pack.json

cd "$ruta"
[ -d .git ] || git init -q

git remote remove origin 2>/dev/null || true
git remote add origin "ssh://git@${GITEA#https://}:$SSH_PORT/$ORG/$nombre.git" 2>/dev/null ||
  git remote add origin "ssh://git@git.atomosoluciones.com:$SSH_PORT/$ORG/$nombre.git"

if [ -z "$(git log --oneline -1 2>/dev/null)" ]; then
  git add -A
  git commit -q -m "Pack $nombre"
fi

git branch -M main
git push -u origin main

echo "listo: $GITEA/$ORG/$nombre"
