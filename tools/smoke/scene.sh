#!/usr/bin/env bash
# Monta una mesa con una escena corta guiada por el DM scripted y la deja lista
# para jugar desde telefonos: Gabino (dueño) juega a Narivyl, Jaz a Zahira.
# El guion viaja en settings.provider de la mesa (tools/scenes/*.json). El
# turno 1 se cierra vacio de inmediato para que la presentacion de la escena
# ya este en pantalla cuando entren; el primer turno jugable es el 2.
#
# Uso: bash tools/smoke/scene.sh [tools/scenes/posada-espera.json]
set -u
API="${API:-http://127.0.0.1:8010}"
SCENE="${1:-tools/scenes/posada-espera.json}"
OWNER_CHAR="${OWNER_CHAR:-narivyl}"
GUEST_EMAIL="${GUEST_EMAIL:-jaz@example.com}"
GUEST_CHAR="${GUEST_CHAR:-zahira}"
SESSION_CODE="${SESSION_CODE:-101}"
J='Content-Type: application/json'
A='Accept: application/json'
JA='Accept: application/vnd.api+json'
JC='Content-Type: application/vnd.api+json'

login() {
  curl -s -X POST "$API/api/auth/login" -H "$J" -H "$A" \
    -d "{\"email\":\"$1\",\"password\":\"password\",\"device_name\":\"scene\"}" | jq -r '.token // empty'
}
whoami_id() {
  curl -s "$API/api/v1/profile" -H "Authorization: Bearer $1" -H "$A" | jq -r '.data.id // .id // empty'
}

[ -f "$SCENE" ] || { echo "no existe el guion $SCENE"; exit 1; }
OWNER=$(login gabino@example.com); GUEST=$(login "$GUEST_EMAIL")
[ -z "$OWNER" ] && { echo "sin token del dueño: esta la API arriba y sembrada?"; exit 1; }
OWNER_ID=$(whoami_id "$OWNER"); GUEST_ID=$(whoami_id "$GUEST")

NAME="Posada $(date +%H:%M)"
BODY=$(jq -c --arg name "$NAME" '{data:{type:"tables",attributes:{name:$name,packId:"pilot",packVersion:"0.4.0",ruleset:"fantasy-d20-lite@1.0.0",settings:{provider:.}}}}' "$SCENE")
TABLE=$(curl -s -X POST "$API/api/v1/tables" -H "Authorization: Bearer $OWNER" -H "$JA" -H "$JC" -d "$BODY")
TABLE_ID=$(echo "$TABLE" | jq -r '.data.id // empty')
[ -z "$TABLE_ID" ] && { echo "no se creo la mesa: $TABLE"; exit 1; }
echo "mesa '$NAME': $TABLE_ID"

OWN=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/tables/$TABLE_ID/members" -H "Authorization: Bearer $OWNER" -H "$J" -H "$A" \
  -d "{\"user_id\":$OWNER_ID,\"character_id\":\"$OWNER_CHAR\"}")
echo "dueño juega a $OWNER_CHAR: $OWN"

F=$(curl -s -X POST "$API/api/v1/friendships" -H "Authorization: Bearer $OWNER" -H "$J" -H "$A" -d "{\"friend_id\":$GUEST_ID}")
FID=$(echo "$F" | jq -r '.data.id // empty')
[ -n "$FID" ] && curl -s -o /dev/null -X POST "$API/api/v1/friendships/$FID/accept" -H "Authorization: Bearer $GUEST" -H "$A"
INV=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/tables/$TABLE_ID/members" -H "Authorization: Bearer $OWNER" -H "$J" -H "$A" \
  -d "{\"user_id\":$GUEST_ID,\"character_id\":\"$GUEST_CHAR\"}")
echo "invitado $GUEST_EMAIL como $GUEST_CHAR: $INV"

CAMP=$(curl -s "$API/api/v1/tables/$TABLE_ID?include=campaign" -H "Authorization: Bearer $OWNER" -H "$JA" | jq -r '.data.relationships.campaign.data.id // empty')
OPEN=$(curl -s -X POST "$API/api/v1/campaigns/$CAMP/sessions" -H "Authorization: Bearer $OWNER" -H "$J" -H "$A" \
  -d "{\"code\":\"$SESSION_CODE\",\"worldTime\":\"Valdoria, la posada, al caer la noche\"}")
TURN=$(echo "$OPEN" | jq -r '.data.id // empty')
[ -z "$TURN" ] && { echo "no se abrio la sesion: $OPEN"; exit 1; }
echo "sesion $SESSION_CODE abierta, turno 1: $TURN"

CLOSE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/turns/$TURN/close" -H "Authorization: Bearer $OWNER" -H "$J" -H "$A" -d '{"force":true}')
echo "presentacion de la escena (cierre del turno 1 vacio): $CLOSE"

curl -s "$API/api/v1/tables/$TABLE_ID/state" -H "Authorization: Bearer $OWNER" -H "$A" \
  | jq '{turn: {number: .data.turn.number, status: .data.turn.status, required: .data.turn.required}, blocks: [.data.blocks[] | {type: .block.type, text: (.block.text | .[0:90])}]}'
