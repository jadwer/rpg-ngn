# apps/mobile

Superficie del jugador (docs/09) en Expo, con dos modos que se eligen al abrir la app:

- **Jugar en mesa** (entrega 5): contra `rpg-ngn-api` con `@rpg-ngn/api-client`. Login por token, mesas del usuario, la mesa con polling, respuesta y cierre de turno, mando del DM, fichas con el estado vivo.
- **Leer sin conexion** (entrega 3): el pack piloto y su log viajan dentro de la app, se reducen en el telefono con `@rpg-ngn/campaign` y no hay servidor ni DM.

Las dos comparten las vistas, las fichas en modal, la narracion por voz y la bandera de narrador. Tema pergamino por defecto (serif del sistema: Georgia en iOS, la serif de Android). Los componentes viven aqui, en `src/`; la logica (bloques, vistas, velado, cola de TTS, estado del turno) esta en `packages/ui-logic` y no importa React.

## Que hace en linea

- **Conexion**: URL del servidor (por defecto `http://192.168.100.16:8010`, editable y recordada) y login con correo y contraseña. El token de Sanctum va en `expo-secure-store`, nunca en AsyncStorage (docs/11, D8). Al volver a abrir la app entra sola mientras el token viva; un 401 en cualquier pantalla borra la sesion y vuelve al login con aviso.
- **Mesas**: las mesas donde el usuario es miembro, con su papel (DM o personaje) y quien mas esta.
- **Mesa**: polling cada 1.5 s a `GET /api/v1/tables/{id}/state?after=<ultimo bloque>` (docs/11, D5). Los bloques del DM se acumulan y se pintan con las mismas vistas **narrativa** y **dialogo** del modo offline; los retratos salen del pack empaquetado por `speakerRef`. Con el interruptor "Leer lo nuevo" los bloques que llegan se leen en voz alta sin cortar la lectura en curso.
- **Turno** (docs/09, "Respuesta y cierre"): cuadro de respuesta siempre visible, quien ya respondio y quien falta (nombres, no textos), boton de cierre cuando no falta ningun interpelado (cualquiera puede cerrar), "Forzar cierre" solo para el DM, aviso "el DM esta narrando" en `closing` y `resolving`, y el error del engine si el turno se reabre.
- **Mando del DM**: abrir la sesion con su codigo de tres digitos (sugiere la siguiente planeada del pack) y un momento del mundo opcional; cerrarla con un cliffhanger opcional.
- **Fichas** en modal, como en offline, con el estado vivo: la propia desde `player:<personaje>`, las ajenas desde `world`. Misma regla de velado; un personaje que un miembro de la mesa ha tomado deja de estar velado.
- **Red**: si el servidor no responde, la app lo dice y sigue reintentando; un 409 refresca el estado (el turno cambio por debajo); 403 y 422 muestran el mensaje de la API.

## Que hace sin conexion

- Selector de sesion (001, 002, 003) con briefing, fecha y quien esta en la mesa.
- Vista de sesion con las dos formas de pintar los mismos bloques.
- Fichas de toda la party con HP, Fortuna, inventario y condiciones del estado reducido. En la sesion 003 los seis viajeros sin dueño salen velados, igual que en `apps/sheets`.
- Narracion por voz con `expo-speech`, bloque a bloque. En Android no hay pausa nativa: Pausa detiene y Seguir salta al bloque siguiente (docs/09).
- Bandera de narrador local.

## Estructura

| Ruta | Contenido |
|---|---|
| `scripts/bundle-pack.ts` | Empaqueta `content/packs/<pack>` y `campaigns/<pack>/events.jsonl` en `src/generated/` y copia los retratos a `assets/pack/` |
| `scripts/play-turn.mts` | Smoke del cliente contra la API viva: mesa nueva, sesion, respuestas, cierre, polling, proyecciones, cierre de sesion (`pnpm --filter mobile smoke-api`) |
| `src/generated/` | Generado, versionado. El test `src/pack/offline.test.ts` falla si esta desactualizado |
| `src/pack/offline.ts` | `loadBundledPack` (pack en memoria, para los dos modos) y `loadOfflineCampaign` (ademas valida el log y reduce) |
| `src/online/storage.ts` | URL del servidor, token y usuario en `expo-secure-store` |
| `src/online/useTableState.ts` | Polling del estado de la mesa; acumula bloques, distingue red caida de errores y avisa del 401 |
| `src/online/OnlineRoot.tsx` | Flujo en linea: conexion, mesas, mesa |
| `src/sheets/entries.ts` | Que se ve de cada ficha, offline (sesion y log) y online (miembros y proyecciones); probado con vitest |
| `src/speech/expoSpeechEngine.ts` | `SpeechEngine` de ui-logic sobre `expo-speech` |
| `src/hooks/useTts.ts` | La cola de TTS de ui-logic como hook; admite bloques nuevos y lectura automatica |
| `src/state/narrator.tsx` | Bandera de narrador (contexto local) |
| `src/screens/` | `ModePicker`, `SessionPicker`, `SessionScreen`, `SheetsModal`, `online/ConnectScreen`, `online/TablesScreen`, `online/TableScreen` |
| `src/components/` | `BlockGroups` (las dos vistas), `Sheet`, `TtsBar`, `NarratorBanner`, `Portrait`, `TurnPanel`, `DmPanel`, `Button`, `Field` |

Sin libreria de navegacion a proposito: unas pocas pantallas y un modal no la necesitan, y cada dependencia nativa es un punto fragil del spike pnpm + Expo (docs/10, IA2).

## Comandos

```bash
pnpm install                          # desde la raiz del monorepo
pnpm build                            # compila packages/*; la app importa dist/
pnpm --filter mobile bundle-pack      # regenerar tras cambiar el pack o el log
pnpm --filter mobile typecheck
pnpm --filter mobile test             # tests puros: pack empaquetado y entradas de fichas
pnpm --filter mobile smoke-api        # juega un turno contra la API viva (RPG_API_URL, por defecto 127.0.0.1:8010)
pnpm --filter mobile start            # Metro; escanear el QR con Expo Go
pnpm --filter mobile doctor           # expo-doctor
```

Exportar el bundle sin telefono, como hace el CI: `pnpm --filter mobile exec expo export --platform android`.

## Jugar en LAN

Dos telefonos y la laptop en el mismo Wi-Fi. La app toma por defecto la IP con la que el telefono llego a Metro (la del QR) y le pone el puerto 8010, asi que no hay que escribirla salvo que la API corra en otra maquina; el campo sigue siendo editable. Para ver la IP actual: `hostname -I` en WSL con red en espejo, o `ipconfig` en Windows.

1. **Engine**, desde la raiz de rpg-ngn, escuchando en todas las interfaces:

   ```bash
   pnpm build
   pnpm --filter engine dev
   ```

   (`apps/engine/.env` trae `ENGINE_TOKEN`, `HOST=0.0.0.0` y `PORT=3100`; `dev` y `start` lo cargan solos. Si falta, copiar `.env.example`.)

2. **API**, desde `~/dev/rpg-ngn-api`, con `ENGINE_URL=http://127.0.0.1:3100` y el mismo `ENGINE_TOKEN` en su `.env`, y la cola en `sync` (asi resuelve el turno dentro de la peticion de cierre):

   ```bash
   php artisan serve --host 0.0.0.0 --port 8010
   ```

   Comprobar desde el telefono abriendo `http://<IP de la laptop>:8010/api/v1/system-health/ping` en el navegador. Si no responde, WSL no esta en modo espejo de red (`networkingMode=mirrored` en `.wslconfig`) o el firewall de Windows bloquea el puerto.

3. **Mesa**: la API sembrada trae a `gabino@example.com` (DM), `jaz@example.com` y `armando@example.com`, contraseña `password`. Si no hay mesa con sesion planeada, `pnpm --filter mobile smoke-api` crea una y la deja con la sesion 003 cerrada; para dejarla abierta y jugar desde los telefonos, crear la mesa con los curl de amistad e invitacion de ese script y abrir la sesion desde la app (mando del DM) o con curl:

   ```bash
   curl -X POST http://127.0.0.1:8010/api/v1/campaigns/<campaña>/sessions -H "Authorization: Bearer <token del DM>" -H "Content-Type: application/json" -H "Accept: application/json" -d '{"code":"003"}'
   ```

4. **Metro**, desde la raiz: `pnpm --filter mobile start` (con `-- --tunnel` si los telefonos no ven la IP de WSL). Escanear el QR con Expo Go (SDK 57) en los dos telefonos.

5. En cada telefono: **Jugar en mesa**, el servidor ya viene lleno con la IP de la laptop, entrar como `jaz@example.com` en uno y `armando@example.com` en el otro, abrir la mesa.

6. El DM abre la sesion desde un tercer dispositivo entrando como `gabino@example.com` (el mando del DM aparece encima del cuadro de respuesta), o con el curl del paso 3. En los telefonos aparece "Turno 1: Faltan: Zahira, Calder".

7. Cada jugador escribe su accion y envia. Cuando los dos han respondido, cualquiera toca **Cerrar turno y narrar**; en unos segundos llegan los bloques del DM a los dos telefonos, y el turno 2 abre con los interpelados. Con "Leer lo nuevo" activo en un solo telefono, ese narra en voz alta (docs/09, bandera de narrador).

8. Al terminar, el DM cierra la sesion desde su mando (o `POST /api/v1/sessions/<id>/close`); la API congela el snapshot y la mesa queda sin sesion abierta.

## Lo que no hace todavia

- No crea mesas ni invita: eso lo hace la web (entrega 6 en adelante) o curl. La app solo entra a mesas donde ya es miembro.
- La bandera de narrador sigue siendo local; compartirla entre telefonos necesita un endpoint.
- Los bloques del turno se piden desde el primero cada vez que se entra a la mesa (`after=0`); con sesiones largas convendra guardar el ultimo id.
- El tema lo fija la app y usa la serif del sistema; las fuentes de `apps/sheets` (Cinzel, Crimson Pro) quedan para la pasada de acabado.
