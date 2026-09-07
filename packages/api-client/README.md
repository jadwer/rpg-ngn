# @rpg-ngn/api-client

Cliente `fetch` tipado de `rpg-ngn-api` (docs/11, D5 y D8). Sin React, sin Expo, sin `node:*`: el `fetch` y el token se inyectan, asi que sirve igual en Expo, en web y en un script de Node.

```ts
import { createApiClient, ApiError } from '@rpg-ngn/api-client'

let token: string | null = null
const api = createApiClient({
  baseUrl: 'http://192.168.100.16:8000',
  tokenProvider: () => token,          // se consulta en cada peticion
})

const login = await api.login('jaz@example.com', 'password', 'expo-android')
token = login.token                     // la app lo guarda en expo-secure-store

const [table] = await api.listTables()
const state = await api.tableState(table.id)           // GET /tables/{id}/state
const more = await api.tableState(table.id, state.lastBlockId)   // ?after=
await api.respond(state.turn!.id, 'Miro la campana.')  // Idempotency-Key generada
await api.closeTurn(state.turn!.id)                    // 202 -> closing
```

## Funciones

| Funcion | Endpoint | Devuelve |
|---|---|---|
| `login(email, password, deviceName)` | `POST /api/auth/login` con `device_name` | `{token, expiresAt, user}` |
| `logout()` | `POST /api/auth/logout` | revoca el token Bearer actual |
| `profile()` | `GET /api/v1/profile` | `{id, name, email, role}` |
| `listTables()` / `table(id)` | `GET /api/v1/tables?include=campaign,members.user` | mesas planas con `campaignId` y `members` (rol, personaje, usuario) |
| `tableState(tableId, after?)` | `GET /api/v1/tables/{id}/state?after=` | campaña, sesion abierta, turno vigente, bloques nuevos y `lastBlockId` |
| `respond(turnId, text, key?)` | `POST /api/v1/turns/{id}/responses` | recibo con `created` (201) o repetido (200) |
| `closeTurn(turnId, force?)` | `POST /api/v1/turns/{id}/close` | el turno en `closing`; `force` solo lo honra la API si eres DM |
| `openSession(campaignId, code, worldTime?)` | `POST /api/v1/campaigns/{id}/sessions` | el primer turno de la sesion (solo DM) |
| `closeSession(sessionId, cliffhanger?)` | `POST /api/v1/sessions/{id}/close` | `{session, status, snapshotSeq}` (solo DM) |
| `listSessions(campaignId)` | `GET /api/v1/game-sessions?filter[campaign]=` | para encontrar el id numerico de la sesion abierta |
| `playerProjection(campaignId, characterId)` | `GET .../projections/player:{id}` | estado vivo del personaje propio (403 si es ajeno) |
| `worldProjection(campaignId)` | `GET .../projections/world` | estado publico de todos los personajes |

`memberOf(table, userId)` devuelve el miembro que corresponde al usuario (rol y personaje), o null.

## Errores

Toda respuesta no 2xx lanza `ApiError` con `status`, `message` legible (sacado de `{error}`, `{message, errors}` o `errors[].detail`, en ese orden) y `errors` cuando hay validacion. Atajos: `isUnauthorized` (401, volver al login), `isForbidden` (403), `isConflict` (409, refrescar el estado), `isValidation` (422). Si no hubo respuesta (red caida, servidor apagado) lanza `NetworkError`, que es un `ApiError` con `status` 0.

## Idempotency-Key

`respond` genera la clave con `crypto.randomUUID` si existe; en Hermes no esta garantizado, asi que hay un respaldo de tiempo mas azar (la clave debe ser unica por intento, no impredecible). Se puede inyectar otro generador con la opcion `idempotencyKey`.

## Tests

```bash
pnpm --filter @rpg-ngn/api-client test                              # fetch falso
RPG_API_URL=http://127.0.0.1:8000 pnpm --filter @rpg-ngn/api-client test   # ademas pega a la API viva como jaz
```

El test vivo necesita la base sembrada y una mesa donde jaz sea miembro; no abre ni cierra turnos.
