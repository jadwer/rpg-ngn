# apps/web

La mesa en el navegador (docs/11, D8: la web es el producto principal, con implementacion propia e independiente de la app movil). Next.js 15 con App Router, sin Tailwind: CSS global con variables y el tema oscuro de `apps/sheets` (Cinzel para titulos, Crimson Pro para texto, cargadas con `next/font`). Consume `@rpg-ngn/api-client` (API), `@rpg-ngn/ui-logic` (bloques, vistas, velado, cola de TTS, estado del turno) y `@rpg-ngn/content` (el pack empaquetado).

## Levantar

```bash
pnpm install && pnpm build            # desde la raiz; la web importa packages/*/dist
pnpm --filter web bundle-pack         # solo si cambio content/packs/pilot (regenera src/generated y public/packs)
pnpm --filter web dev                 # http://localhost:3010, escucha en 0.0.0.0 para la LAN
pnpm --filter web build && pnpm --filter web start   # produccion, mismo puerto
```

Otro puerto: `pnpm --filter web exec next dev -H 0.0.0.0 -p 3020`.

Variables (`.env.example`):

| Variable | Lado | Uso |
|---|---|---|
| `API_PROXY_TARGET` | servidor | A donde el proxy de Next reenvia `/api/*` y contra que API entran `/auth/*`. Por defecto `http://127.0.0.1:8010` |
| `NEXT_PUBLIC_API_URL` | navegador | URL de la API que propone la pantalla de acceso. Sin ella, el propio origen de la web (proxy con cookie, sin CORS) |

## Sesion: cookie httpOnly y proxy

Por defecto el navegador no ve el token de Sanctum:

1. `POST /auth/session` (o `/auth/register`) es un route handler de Next que llama a la API en modo token (`device_name: web-rpg-ngn`) y guarda el token en la cookie `rpg_session`: `httpOnly`, `SameSite=Lax`, `Secure` cuando la web se sirve por https, caducidad la del token (30 dias por defecto en la API).
2. Toda peticion a `/api/*` la atiende `src/app/api/[...path]/route.ts`, que reenvia a `API_PROXY_TARGET` con `Authorization: Bearer` sacado de la cookie. Pasan `Accept`, `Content-Type` e `Idempotency-Key`. Sustituye al `rewrites` de Next, que no puede tocar cabeceras.
3. `DELETE /auth/session` revoca el token en la API y borra la cookie. Un 401 en cualquier pantalla hace lo mismo desde el cliente.

CSRF: la cookie `SameSite=Lax` no viaja en POST desde otro sitio, y ademas el proxy exige la cabecera `X-Requested-With: rpg-ngn-web` en todo lo que no sea GET; un formulario HTML no puede ponerla y un `fetch` de otro origen dispara un preflight que Next no autoriza. No hay formularios cross-site en la web, asi que con eso basta en V1. Lo que si queda en `localStorage` es el usuario (id, nombre, correo) para pintar la barra sin esperar a `/api/v1/profile`, y las preferencias de voz.

Modo API directa: el campo "Servidor de la API" (plegado tras "Cambiar servidor" en acceso y registro) sigue existiendo. Con otra URL el navegador le pega directo a esa API con el token en `localStorage` como antes, y esa API necesita el origen de la web en `CORS_ALLOWED_ORIGINS`. Es el camino para apuntar a un servidor que no sea el del proxy; para la LAN y el iPhone no hace falta.

## Como se juega

1. **Landing** (`/`): que es rpg-ngn, como se juega y botones "Entrar" y "Crear cuenta" (o "Tus mesas" si el navegador ya tiene sesion).
2. **Crear cuenta** (`/crear-cuenta`): nombre, correo, contraseña y confirmacion (8 caracteres minimo). Usa `POST /api/auth/register` de atomo/auth en modo token. Con `ATOMO_REQUIRE_EMAIL_VERIFICATION=false` en la API (lo de hoy en local) se entra directo a las mesas; con `true` la API no devuelve token, la pantalla muestra "verifica tu correo" y el login responde 403 hasta pulsar el enlace del correo (`GET /api/auth/email/verify/{id}/{hash}`, firmado; el enlace lo construye la API con `FRONTEND_URL`). Eso requiere `MAIL_MAILER` real; en local el correo va al log.
3. **Acceso** (`/entrar`): correo y contraseña. "Olvide mi contraseña" (`/recuperar`) pide el correo de recuperacion a `POST /api/auth/forgot-password`; solo llega si el servidor tiene correo configurado, y la pagina lo dice.
4. **Perfil** (`/perfil`, el nombre en la barra): cambiar el nombre visible (`PATCH /api/v1/profile`) y la contraseña (`PATCH /api/v1/profile/password`, pide la actual). El correo se muestra y no se edita.
5. **Ajustes** (`/ajustes`): idioma de lectura (filtra las voces del navegador y fija el idioma de la locucion), voz por defecto, velocidad y "leer lo nuevo", con boton de prueba. Se guardan en `localStorage` de ese navegador; la barra de voz de la mesa es el acceso rapido a lo mismo.
6. **Mesas** (`/mesas`): las mesas donde el usuario es miembro, con su asiento, pack y quien esta con que personaje. El dueño de la mesa es el **anfitrion** (la API lo llama `dm`; el DM es la IA). Al pie, **Amigos**: solicitudes recibidas para aceptar (una jugadora nueva no tiene mesa donde hacerlo), buscar por correo y pedir amistad, y la lista de amigos.
7. **Crear mesa** (`/mesas/nueva`): nombre, pack (hoy solo `pilot@0.4.0`), personaje del anfitrion con retrato, director de juego (entre los presets configurados en el servidor; por defecto el del servidor y entonces no se guarda nada en la mesa) y premisa opcional (`settings.premise`). Al crearla aparece la seccion de invitados.
8. **Invitar**: la API exige amistad aceptada antes de invitar. La seccion busca la cuenta por correo exacto (`GET /api/v1/users/lookup?email=`, abierto a cualquier cuenta), muestra el estado de la amistad (pedir, aceptar la pendiente propia, amigos), y con amistad aceptada invita con personaje. Tambien vive en el mando del anfitrion, pestaña "Invitados".
9. **La mesa** (`/mesas/[id]`): polling cada 1.5 s a `GET /tables/{id}/state`. Cabecera con sesion, momento del mundo, turno y quien falta; la pestaña del navegador lleva el nombre de la mesa y la sesion. Vistas **Narrativa** y **Dialogo** sobre los mismos bloques. Cuadro de respuesta si tienes personaje y no has respondido (Ctrl+Enter envia; `Idempotency-Key` estable por turno). "Cerrar turno y narrar" cuando no falta nadie; "Forzar cierre" solo el anfitrion. Mientras el DM resuelve, "El DM esta narrando..." hasta que llegan bloques nuevos. Autoscroll al bloque nuevo, con "Bajar a lo nuevo" si subiste a leer.
10. **Mando del anfitrion**: pestaña Sesion (abrir con codigo de tres digitos sugerido y nota que el DM recibe como `worldTime`; cerrar con cliffhanger), Invitados, y **DM**: el proveedor de la mesa entre los presets del servidor (`scripted`, `anthropic`, `openai`, `deepseek`, `ollama`; los sin clave salen deshabilitados), modelo opcional, "Probar" (`POST /api/v1/tables/{t}/dm/probe`, llama al engine con el preset sin gastar un turno) y "Guardar" (`settings.provider = {preset, model?}` por `PATCH /api/v1/tables/{t}`, conservando la premisa). Las claves nunca salen del `.env` de la API; traer clave propia (BYOK) queda para la entrega 7.
11. **Fichas**: panel lateral (pantalla completa en el telefono) con la party, el estado vivo (la propia desde `player:<id>`, las ajenas desde `world`) y el mismo velado que `apps/sheets` y la app movil.
12. **Voz**: Web Speech API con la cola de TTS de ui-logic. Leer, pausa, siguiente, parar; voz, velocidad y "Leer lo nuevo" en la barra, mas el enlace a Ajustes. Cada bloque se lee en trozos de pocas oraciones porque Chrome corta locuciones largas. Si el navegador no tiene voces en el idioma elegido avisa una vez.
13. **Modo pantalla** (tecla `F` o boton "Pantalla", `Esc` sale): solo narrativa y dialogos en grande, sin controles, para compartir pantalla o stream. Abajo una linea con el estado del turno.

## Estructura

| Ruta | Contenido |
|---|---|
| `scripts/bundle-pack.ts` | Empaqueta `content/packs/<pack>` en `src/generated/` y copia los retratos a `public/packs/` |
| `src/generated/` | Generado, versionado. `src/lib/pack.test.ts` falla si esta desactualizado |
| `src/server/apiProxy.ts` | Cookie de sesion, guardia CSRF y reenvio a la API con Bearer (lado servidor) |
| `src/app/api/[...path]/route.ts` | El proxy de `/api/*` |
| `src/app/auth/session`, `src/app/auth/register` | Route handlers de entrar, salir y registrarse (ponen y quitan la cookie) |
| `src/lib/storage.ts` | `localStorage`: servidor, token (solo modo directo), usuario, voz, velocidad, idioma, leer lo nuevo |
| `src/lib/session.tsx` | `SessionProvider`: cliente de la API, login, registro, logout, 401, modos proxy y directo |
| `src/lib/pack.ts` | Pack en memoria, URL de retratos, ruleset, packs disponibles |
| `src/lib/sheets.ts` | Entradas de fichas (quien juega que, velado, estado vivo); probado |
| `src/lib/tableSetup.ts` | Codigo de sesion sugerido, personajes libres, estado de amistad, etiquetas de asiento; probado |
| `src/lib/dmPresets.ts` | Nombres legibles de los presets del DM y que se manda al crear la mesa |
| `src/lib/webSpeech.ts` | `SpeechEngine` de ui-logic sobre `speechSynthesis`, voces por idioma; probado |
| `src/lib/useTableState.ts` | Polling del estado de la mesa |
| `src/lib/useTts.ts` | La cola de TTS como hook, con voz, velocidad, idioma y lectura automatica |
| `src/components/` | `TableScreen` (la mesa), `Blocks` (las dos vistas), `TurnPanel`, `HostPanel`, `DmSettingsPanel`, `InvitePanel`, `FriendsPanel`, `SheetsPanel`, `Sheet`, `CharacterPicker`, `TtsBar`, `Portrait`, `RequireSession`, `UserBar`, `ServerField`, `SessionCta` |
| `src/app/` | `/` landing, `/entrar`, `/crear-cuenta`, `/recuperar`, `/perfil`, `/ajustes`, `/mesas`, `/mesas/nueva`, `/mesas/[id]`; `icon.svg`, `apple-icon.png` y `favicon.ico` |

## Comandos

```bash
pnpm --filter web typecheck
pnpm --filter web test        # logica pura con vitest (pack, fichas, preparacion de la mesa, voces)
pnpm --filter web build       # tambien lo corre pnpm check desde la raiz
```

## Lo que no hace todavia

- La bandera de narrador compartida entre dispositivos (sigue siendo local a cada navegador): necesita un endpoint que cualquier miembro pueda escribir y que `state` lo devuelva; queda anotada en el ROADMAP.
- Un solo pack: el selector existe pero solo ofrece `pilot`.
- BYOK: la mesa elige entre los presets del servidor; una clave propia por mesa es la entrega 7.
- Cambiar el correo de la cuenta (exige verificar el nuevo).
