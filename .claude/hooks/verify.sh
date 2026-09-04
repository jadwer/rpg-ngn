#!/usr/bin/env bash
# Verificador de reglas del repo rpg-ngn.
# Modos:
#   postedit  lee el JSON de PostToolUse por stdin y verifica el archivo editado
#   stop      verifica el repo completo antes de que Claude cierre el turno
# Las reglas que aplica son las del CLAUDE.md del repo y las directrices de
# estilo globales de Gabino (sin guion largo en prosa, sin emojis, espanol
# correcto en contenido de jugador, JSON valido, dm/ jamas versionado).

set -u
MODE="${1:-postedit}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROBLEMS=()

check_json() {
  local f="$1"
  if ! python3 -m json.tool "$f" >/dev/null 2>&1; then
    PROBLEMS+=("JSON invalido: $f")
  fi
}

check_style_doc() {
  local f="$1"
  # Guion largo prohibido en prosa; permitido en lineas de tabla markdown
  if grep -n $'—' "$f" 2>/dev/null | grep -vE '^[0-9]+:\s*\|' >/dev/null; then
    PROBLEMS+=("Guion largo en prosa (solo se permite en tablas/rangos): $f")
  fi
  if grep -qP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2190}-\x{21FF}\x{FE0F}]' "$f" 2>/dev/null; then
    PROBLEMS+=("Emoji o simbolo decorativo en doc versionado: $f")
  fi
  if grep -qnE 'En un mundo donde|En el panorama actual|Es importante destacar' "$f" 2>/dev/null; then
    PROBLEMS+=("Muletilla de IA detectada: $f")
  fi
}

check_content_es() {
  # El contenido que ven los jugadores va en espanol correcto (acentos y enies).
  # Lista de errores conocidos; ampliar cuando aparezca uno nuevo.
  local f="$1"
  if grep -qnE '"[^"]*\b(anios|Danio|Percepcion|Persuasion|Exploracion|Invocacion|Intimidacion|Interpretacion|Inspiracion|Investigacion|Artesania|Religion|Engano|Sesion|Paladin|Barbaro|Picara|magico|tambien|quizas|unica|Lider|Incomodo|extranos|companeros|compania|montanas|cancion)\b[^"]*"' "$f" 2>/dev/null; then
    PROBLEMS+=("Espanol sin acentos en contenido de jugador: $f")
  fi
}

check_file() {
  local f="$1"
  case "$f" in
    "$ROOT"/dm/*) ;; # notas privadas: sin reglas
    *"/content/"*.json) check_json "$f"; check_content_es "$f" ;;
    *.json) check_json "$f" ;;
    *.md) check_style_doc "$f" ;;
  esac
}

if [ "$MODE" = "postedit" ]; then
  FILE="$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)"
  [ -n "$FILE" ] && [ -f "$FILE" ] && check_file "$FILE"
else
  # Barrido completo del repo
  while IFS= read -r -d '' f; do check_file "$f"; done \
    < <(find "$ROOT/content" "$ROOT/docs" -type f \( -name '*.json' -o -name '*.md' \) -print0 2>/dev/null)
  for f in "$ROOT"/README.md "$ROOT"/ROADMAP.md "$ROOT"/CLAUDE.md; do
    [ -f "$f" ] && check_style_doc "$f"
  done
  # dm/ jamas debe estar versionado (el repo es publico)
  if [ -d "$ROOT/.git" ] && [ -n "$(git -C "$ROOT" ls-files dm/ 2>/dev/null)" ]; then
    PROBLEMS+=("ALERTA: hay archivos de dm/ versionados en un repo publico")
  fi
fi

if [ "${#PROBLEMS[@]}" -eq 0 ]; then
  exit 0
fi

LIST="$(printf ' - %s\n' "${PROBLEMS[@]}")"
if [ "$MODE" = "postedit" ]; then
  jq -n --arg ctx "Verificador rpg-ngn encontro problemas en el archivo editado. Corrigelos antes de continuar:
$LIST" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
else
  jq -n --arg reason "Verificador rpg-ngn: hay problemas pendientes antes de cerrar el turno. Corrigelos o explica al usuario por que no aplican:
$LIST" '{decision:"block",reason:$reason}'
fi
exit 0
