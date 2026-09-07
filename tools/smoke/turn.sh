#!/usr/bin/env bash
# Turno completo contra API y engine vivos, con curl y jq. Crea una mesa nueva
# con Jaz (Zahira) y Armando (Calder), abre la sesion 003, resuelve el turno 1
# con el DM scripted y deja el turno 2 abierto para jugar desde telefonos.
#
# Requiere: API en $API (por defecto http://127.0.0.1:8000) con los usuarios
# sembrados (gabino admin, jaz, armando; password "password") y el engine
# arriba con el mismo ENGINE_TOKEN que la API.
set -u
API="${API:-http://127.0.0.1:8000}"
J='Content-Type: application/json'
A='Accept: application/json'
JA='Accept: application/vnd.api+json'
JC='Content-Type: application/vnd.api+json'

login() {
  curl -s -X POST "$API/api/auth/login" -H "$J" -H "$A" \
    -d "{\"email\":\"$1\",\"password\":\"password\",\"device_name\":\"smoke\"}" | jq -r '.token // empty'
}
whoami_id() {
  curl -s "$API/api/v1/profile" -H "Authorization: Bearer $1" -H "$A" | jq -r '.data.id // .id // empty'
}

DM=$(login gabino@example.com); JAZ=$(login jaz@example.com); ARM=$(login armando@example.com)
[ -z "$DM" ] && { echo "sin token del DM: esta la API arriba y sembrada?"; exit 1; }
echo "tokens: dm=${DM:0:6} jaz=${JAZ:0:6} armando=${ARM:0:6}"
JAZ_ID=$(whoami_id "$JAZ"); ARM_ID=$(whoami_id "$ARM")
echo "ids: jaz=$JAZ_ID armando=$ARM_ID"

TABLE=$(curl -s -X POST "$API/api/v1/tables" -H "Authorization: Bearer $DM" -H "$JA" -H "$JC" \
  -d "{\"data\":{\"type\":\"tables\",\"attributes\":{\"name\":\"Mesa smoke $(date +%H:%M)\",\"packId\":\"pilot\",\"packVersion\":\"0.4.0\",\"ruleset\":\"fantasy-d20-lite@1.0.0\"}}}")
TABLE_ID=$(echo "$TABLE" | jq -r '.data.id // empty')
[ -z "$TABLE_ID" ] && { echo "no se creo la mesa: $TABLE"; exit 1; }
echo "mesa: $TABLE_ID"

for pair in "$JAZ_ID:$JAZ:zahira" "$ARM_ID:$ARM:calder"; do
  IFS=: read -r id tok char <<< "$pair"
  F=$(curl -s -X POST "$API/api/v1/friendships" -H "Authorization: Bearer $DM" -H "$J" -H "$A" -d "{\"friend_id\":$id}")
  FID=$(echo "$F" | jq -r '.data.id // empty')
  ACC=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/friendships/$FID/accept" -H "Authorization: Bearer $tok" -H "$A")
  INV=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/tables/$TABLE_ID/members" -H "Authorization: Bearer $DM" -H "$J" -H "$A" \
    -d "{\"user_id\":$id,\"character_id\":\"$char\"}")
  echo "amistad $FID accept=$ACC invitacion($char)=$INV"
done

CAMP=$(curl -s "$API/api/v1/tables/$TABLE_ID?include=campaign" -H "Authorization: Bearer $DM" -H "$JA" | jq -r '.data.relationships.campaign.data.id // empty')
echo "campaña: $CAMP"

OPEN=$(curl -s -X POST "$API/api/v1/campaigns/$CAMP/sessions" -H "Authorization: Bearer $DM" -H "$J" -H "$A" \
  -d '{"code":"003","worldTime":"Valdoria, tres dias despues"}')
TURN=$(echo "$OPEN" | jq -r '.data.id // empty')
echo "sesion 003 abierta, turno $TURN: $(echo "$OPEN" | jq -c '.data.required // .error // .message')"

R1=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/turns/$TURN/responses" -H "Authorization: Bearer $JAZ" -H "$J" -H "$A" \
  -H "Idempotency-Key: smoke-$TURN-z" -d '{"text":"Miro la campana de bronce con cuidado."}')
R2=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/turns/$TURN/responses" -H "Authorization: Bearer $ARM" -H "$J" -H "$A" \
  -H "Idempotency-Key: smoke-$TURN-c" -d '{"text":"La sigo de cerca, con la llave en la mano."}')
R3=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/turns/$TURN/responses" -H "Authorization: Bearer $JAZ" -H "$J" -H "$A" \
  -H "Idempotency-Key: smoke-$TURN-z" -d '{"text":"Miro la campana de bronce con cuidado."}')
echo "respuestas: zahira=$R1 calder=$R2 zahira-repetida=$R3"

CLOSE=$(curl -s -w '\n%{http_code}' -X POST "$API/api/v1/turns/$TURN/close" -H "Authorization: Bearer $JAZ" -H "$A")
echo "cierre: $(echo "$CLOSE" | tail -1) $(echo "$CLOSE" | head -1 | jq -c '.data.status // .error')"
echo "segundo cierre: $(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/v1/turns/$TURN/close" -H "Authorization: Bearer $JAZ" -H "$A")"

curl -s "$API/api/v1/tables/$TABLE_ID/state" -H "Authorization: Bearer $JAZ" -H "$A" \
  | jq '{headSeq: .data.campaign.headSeq, session: .data.session, turn: {number: .data.turn.number, status: .data.turn.status, required: .data.turn.required}, blocks: [.data.blocks[] | {type: .block.type, text: (.block.text | .[0:70]), speaker: .block.speaker}]}'
curl -s "$API/api/v1/campaigns/$CAMP/projections/player:zahira" -H "Authorization: Bearer $JAZ" -H "$A" \
  | jq '{seq: .data.seq, session: .data.projection.session, hp: .data.projection.character.hp, fortune: .data.projection.character.fortune}'
