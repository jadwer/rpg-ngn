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
| `API_PROXY_TARGET` | servidor | A donde Next reenvia `/api/*`. Por defecto `http://127.0.0.1:8010` |
| `NEXT_PUBLIC_API_URL` | navegador | URL de la API que propone la pantalla de acceso. Sin ella, el propio origen de la web (pasa por el proxy y no necesita CORS) |

## Como se juega

1. **Acceso** (`/`): servidor de la API, correo y contraseña. El token de Sanctum queda en `localStorage` (provisional; deberia ser una cookie httpOnly cuando la plataforma la exponga) y se manda en cada peticion; un 401 borra la sesion y vuelve al acceso. "Salir" revoca el token.
2. **Mesas** (`/mesas`): las mesas donde el usuario es miembro, con su asiento, pack y quien esta con que personaje. El dueño de la mesa es el **anfitrion** (la API lo llama `dm`; el DM es la IA).
3. **Crear mesa** (`/mesas/nueva`): nombre, pack (hoy solo `pilot@0.4.0`), personaje del anfitrion con retrato, premisa opcional (va en `settings.premise` y el DM la usa como punto de partida). Al crearla aparece la seccion de invitados.
4. **Invitar**: la API exige amistad aceptada antes de invitar. La seccion busca por correo (`users?filter[email]`, que hoy solo pueden usar cuentas admin; si no, ofrece los amigos ya aceptados), muestra el estado de la amistad (pedir, aceptar la pendiente propia, amigos), y con amistad aceptada invita con personaje. Tambien vive en el mando del anfitrion, pestaña "Invitados".
5. **La mesa** (`/mesas/[id]`): polling cada 1.5 s a `GET /tables/{id}/state`. Cabecera con sesion, momento del mundo (de la proyeccion `world`), turno y quien falta. Vistas **Narrativa** y **Dialogo** sobre los mismos bloques. Cuadro de respuesta si tienes personaje y no has respondido (Ctrl+Enter envia; `Idempotency-Key` estable por turno). "Cerrar turno y narrar" cuando no falta nadie; "Forzar cierre" solo el anfitrion. Mientras el DM resuelve, "El DM esta narrando..." hasta que llegan bloques nuevos. Autoscroll al bloque nuevo, con "Bajar a lo nuevo" si subiste a leer.
6. **Mando del anfitrion**: abrir sesion (codigo de tres digitos sugerido, nota de la sesion que el DM tambien recibe como `worldTime`), cerrarla con cliffhanger, premisa e invitados.
7. **Fichas**: panel lateral (pantalla completa en el telefono) con la party, el estado vivo (la propia desde `player:<id>`, las ajenas desde `world`) y el mismo velado que `apps/sheets` y la app movil.
8. **Voz**: Web Speech API con la cola de TTS de ui-logic. Leer, pausa, siguiente, parar; selector entre las voces en español del navegador (se elige de oido, se recuerda en `localStorage`), velocidad y "Leer lo nuevo". Cada bloque se lee en trozos de pocas oraciones porque Chrome corta locuciones largas. Si el navegador no tiene voces en español avisa una vez.
9. **Modo pantalla** (tecla `F` o boton "Pantalla", `Esc` sale): solo narrativa y dialogos en grande, sin controles, para compartir pantalla o stream. Abajo una linea con el estado del turno.

## Estructura

| Ruta | Contenido |
|---|---|
| `scripts/bundle-pack.ts` | Empaqueta `content/packs/<pack>` en `src/generated/` y copia los retratos a `public/packs/` |
| `src/generated/` | Generado, versionado. `src/lib/pack.test.ts` falla si esta desactualizado |
| `src/lib/storage.ts` | `localStorage`: servidor, token, usuario, voz, velocidad, leer lo nuevo |
| `src/lib/session.tsx` | `SessionProvider`: cliente de la API, login, logout, 401 |
| `src/lib/pack.ts` | Pack en memoria, URL de retratos, ruleset, packs disponibles |
| `src/lib/sheets.ts` | Entradas de fichas (quien juega que, velado, estado vivo); probado |
| `src/lib/tableSetup.ts` | Codigo de sesion sugerido, personajes libres, estado de amistad, etiquetas de asiento; probado |
| `src/lib/webSpeech.ts` | `SpeechEngine` de ui-logic sobre `speechSynthesis`, voces en español; probado |
| `src/lib/useTableState.ts` | Polling del estado de la mesa |
| `src/lib/useTts.ts` | La cola de TTS como hook, con voz, velocidad y lectura automatica |
| `src/components/` | `TableScreen` (la mesa), `Blocks` (las dos vistas), `TurnPanel`, `HostPanel`, `InvitePanel`, `SheetsPanel`, `Sheet`, `CharacterPicker`, `TtsBar`, `Portrait`, `RequireSession` |
| `src/app/` | `/` acceso, `/mesas`, `/mesas/nueva`, `/mesas/[id]` |

## Comandos

```bash
pnpm --filter web typecheck
pnpm --filter web test        # logica pura con vitest (pack, fichas, preparacion de la mesa, voces)
pnpm --filter web build       # tambien lo corre pnpm check desde la raiz
```

## Lo que no hace todavia

- Registro, edicion de perfil y ajustes de proveedor de DM (entrega 5b, resto).
- La bandera de narrador compartida entre dispositivos (sigue siendo local a cada navegador).
- Un solo pack: el selector existe pero solo ofrece `pilot`.
- Buscar usuarios por correo depende del permiso `users.index` de la API (hoy solo admin).
