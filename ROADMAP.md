# ROADMAP

El orden viene de [docs/11-adr-stack-saas.md](docs/11-adr-stack-saas.md), que
manda sobre este archivo. Cada entrega lleva su criterio de "hecho" ahi.

## Fase 0: Diseño y piloto (cerrada el 2026-09-05)

- [x] Alcance del motor y ejes de agnosticismo
- [x] Estructura del repo y SDD en `docs/`
- [x] Content pack `pilot`: 9 personajes pregenerados + campaña Valdoria
- [x] Visor de fichas mobile (GitHub Pages)
- [x] Sesiones piloto 001 y 002 con DM Claude; 003 planeada para el 2026-09-06
- [x] Alcance del SaaS a partir de la mesa ([09](docs/09-saas-scope.md))
- [x] Auditoria del SDD ([10](docs/10-audit-2026-09-05.md)) y ADR de stack ([11](docs/11-adr-stack-saas.md))

## Entrega 0: AtomoPlatform lista para consumir (hecha el 2026-09-05)

- [x] Commit y push de los fixes del smoke run de julio (aca0f01)
- [x] `atomo/auth` con modo token (Expo) ademas de cookie SPA, expiracion obligatoria; 10 feature tests (60012db)
- [x] `atomo/payments` con Stripe portado de api-base, webhook idempotente; 16 feature tests (52df8b4)
- [x] Template y scaffolder con `atomo/payments`; CI backend en SQLite y PostgreSQL 16 (b5f84aa)
- [ ] Runner de Gitea Actions activo (act_runner en el MicroServer, lo levanta Gabino)

## Entrega 1: Contratos y contenido (hecha el 2026-09-05)

- [x] BA1: version de schema por evento, `upcastEvent` en `packages/content`
- [x] `tools/migrate-pilot`: los 21 eventos del piloto a `v:1` (unica reescritura permitida)
- [x] Schemas zod de evento, personaje, NPC, ubicacion, quest, sesion y pack
- [x] `tools/validate` en CI sobre `content/` y `campaigns/`; un evento roto falla el CI (test)
- [x] Workflow de Pages que publica solo `apps/sheets` y `content/packs/pilot`
- [ ] Cambiar el source de Pages a "GitHub Actions" en la configuracion del repo (Gabino), antes del primer merge de `dev` a `main`

## Entrega 2: Motor (hecha el 2026-09-06)

- [x] `packages/core`: `RandomSource` inyectable (semilla, dados fisicos, Web Crypto), dados con ventaja y desventaja, recursos, estado del mundo, `stableStringify`. Cobertura 100% exigida en el test
- [x] `packages/rules`: interfaz `Ruleset` y `fantasy-d20-lite@1.0.0` (Fortuna abierta, ops `memory_recovered`, `gain`, `lose`, `hp`, `condition`); un op desconocido lanza, no se ignora
- [x] `packages/campaign`: `reduce` con ruleset como parametro, proyecciones de mundo, jugador y narrativa, snapshots con `diffSnapshot`
- [x] `campaigns/pilot/snapshots/002.json`: estado canonico de la sesion 002; el test lo reproduce byte a byte
- [ ] Segundo ruleset real (v2): es lo que valida el eje "agnostico de sistema"

## Entrega 3: App movil sin servidor (hecha el 2026-09-06)

- [x] `packages/ui-logic` sin React: bloques tipados, `sessionBlocks` desde el pack y el estado reducido, vistas narrativa y dialogo como agrupaciones del mismo array, velado de fichas (misma regla que `apps/sheets`), cola de TTS con `SpeechEngine` inyectable; tests sobre el pack piloto
- [x] `apps/mobile` (Expo SDK 57): pack piloto empaquetado con `bundle-pack`, reduccion en el dispositivo con `fantasy-d20-lite`, selector de sesion, vistas narrativa y dialogo, fichas de la party en modal, TTS por bloques con `expo-speech`, bandera de narrador local, tema pergamino
- [x] Spike de Expo con pnpm aislado: `pnpm install`, `build`, `typecheck`, `lint` y `test` pasan desde la raiz con la app en el workspace; `expo export --platform android` produce el bundle con los packages del monorepo
- [x] Probada en telefono con Expo Go el 2026-09-06: funciona, fichas bien logradas, TTS basico pero util. Pendiente de diseño: la app se compara con `apps/sheets` y se queda corta en acabado (tema, tipografia, espaciado); se atiende con la superficie de jugador de la entrega 5

## Entrega 4: Plataforma (hecha el 2026-09-06)

- [x] `rpg-ngn-api` desde `templates/backend` de Atomo (solo core + payments), repo privado en GitHub, AtomoPlatform como submodule `platform/`, Postgres local, login por token verificado de punta a punta
- [x] Secret `ATOMO_DEPLOY_KEY` en GitHub y deploy key en Gitea para que el CI clone el submodule
- [x] Modulos `Tables` (mesas, membresia, amistad) y `Campaigns` (event store append-only con trigger, snapshots, proyecciones); 18 feature tests en SQLite y Postgres
- [x] `campaign:import` de los 21 eventos con el snapshot canonico como fixture; el engine lo sustituye en la entrega 5
- [x] CI de `rpg-ngn-api` en verde con el submodule clonado desde Gitea (SQLite y Postgres 16)

## Entrega 5: Turnos (hecha el 2026-09-11)

- [x] `packages/engine-contract`: contrato versionado Laravel/engine (peticion de turno, NDJSON de bloques y resultado, validacion, reproyeccion con auditoria, probe)
- [x] `packages/narrative` con `DMProvider` y `ScriptedDMProvider` determinista
- [x] `apps/engine` (Hono): resuelve turnos aplicando cada evento propuesto con schema y ruleset, valida y reproyecta; `.env` opcional con `--env-file-if-exists`
- [x] API: modulo `Turns` (abrir y cerrar sesion, respuestas con `Idempotency-Key`, cierre por compare-and-swap, job unico por turno, reapertura ante error, polling `GET /tables/{table}/state`); 8 feature tests en SQLite y Postgres
- [x] Turno completo de punta a punta con API y engine reales (smoke con curl: 201/201/200, 202, 409, turno 2 abierto, 4 bloques, headSeq 4)
- [x] `packages/api-client`: cliente fetch tipado sin React (login por token, mesas JSON:API aplanadas, estado por polling, respuestas con `Idempotency-Key`, cierre, sesiones, proyecciones); tests con fetch falso y uno de integracion con `RPG_API_URL`
- [x] `apps/mobile` en modo online: login por token en `expo-secure-store`, mesas, mesa con polling cada 1.5 s, las dos vistas sobre los bloques del DM, cuadro de respuesta con quien falta, cierre cuando no falta nadie (forzado solo DM), mando del DM, fichas con el estado vivo de las proyecciones; convive con el modo offline
- [x] Turno completo desde el cliente contra API y engine reales (`pnpm --filter mobile smoke-api`: 403 al jugador que abre sesion, 201/201, 409 a la segunda respuesta, cierre, 4 bloques por polling, turno 2 abierto, proyeccion ajena 403, sesion cerrada con snapshot)
- [x] Primera partida por LAN el 2026-09-11 (mesa "Posada", dos telefonos): destapo la IP por DHCP, el firewall de Hyper-V en modo espejo y la sesion de Expo Go
- [x] DM scripted con guion por turno (`script` en `settings.provider` de la mesa, escenas como datos en `tools/scenes/`, `tools/smoke/scene.sh`): demos sin modelo
- [x] El dueño de la mesa fija su propio personaje (`POST tables/{t}/members` sobre si mismo)
- [x] Criterio del ADR: escena entera desde dos telefonos por LAN (Posada, 2026-09-11). Entrega 5 cerrada

Pasada a la app tras la partida del 2026-09-11 (hecha el 2026-09-12, salvo el rename en la API):

- [x] En la app el asiento `dm` se muestra como anfitrion en todo (mesas, mando, forzar cierre); el DM es la IA. Crear mesa desde la app con personaje del anfitrion (retrato) y premisa, e invitar con el flujo real de amistad (pedir, aceptar pendientes, invitar con personaje) desde la mesa nueva y desde el mando. Logica pura en `apps/mobile/src/online/tableSetup.ts` con tests
- [x] Renombrar el asiento `dm` a `host` en la API (migracion 2026_09_12_000001 sobre las filas existentes) y en `api-client`, `ui-logic`, web y app a la vez (2026-09-12)
- [x] Android: `KeyboardAvoidingView` con `behavior="padding"` en las dos plataformas (Expo Go 57 va edge-to-edge y `resize` ya no encoge la ventana; queda explicito en `app.json`), la narracion baja al final al enfocar, chips escondidos con el teclado abierto. Pendiente de confirmar en telefono; el README dice que mirar
- [x] Selector de voz del sistema (`getAvailableVoicesAsync` filtrado a `es*`, nombre, idioma y calidad, boton Oir para elegir de oido), voz, velocidad y tono recordados por telefono en el almacen seguro, narrador a 0.85 (ajustable), party al natural y tono fijo por NPC (hash del `speakerRef`); `TtsItem` de ui-logic lleva tipo y hablante. Aviso de sin voz en español una sola vez
- [x] La barra de TTS y la bandera de narrador son una sola linea plegable; la narracion ocupa la pantalla
- [x] Tema oscuro de `apps/sheets` con Cinzel y Crimson Pro (`expo-font`, seis pesos importados por subruta); las fichas en modal se conservan

## Entrega 5b: Web, el producto principal (docs/11 D8, directriz del 2026-09-06)

`apps/web` en Next.js 15 con mesa propia, independiente de la app movil; `apps/sheets` como referencia visual y una vista limpia "en pantalla" para streamers. Lo que Gabino listo el 2026-09-11 como faltante y aqui queda explicito:

- [x] `apps/web` (Next.js 15, App Router, CSS con el tema de `apps/sheets`, Cinzel y Crimson Pro): acceso con URL de la API, correo y contraseña; token en `localStorage` (provisional); `/api/*` reenviado a la API por Next para que la LAN y el iPhone entren sin CORS (2026-09-12)
- [x] Mesas del usuario con asiento, pack y party; crear mesa con pack, personaje del anfitrion con retrato y premisa (`settings.premise`); invitar por correo con el flujo real de amistad (pedir, aceptar pendientes, invitar con personaje). El asiento `dm` se muestra como "anfitrion"
- [x] La mesa: polling, cabecera con sesion, momento del mundo, turno y faltantes; vistas narrativa y dialogo; cuadro de respuesta con Ctrl+Enter e `Idempotency-Key` estable por turno; cierre y cierre forzado; "El DM esta narrando..."; mando del anfitrion (abrir con codigo sugerido y nota, cerrar con cliffhanger); fichas con estado vivo y velado; voz con Web Speech (voz en español elegible, velocidad, leer lo nuevo); modo pantalla (tecla F) para streamers; autoscroll con pausa
- [x] `api-client`: `createTable`, `setOwnerCharacter`, `invite`, `listFriendships`, `requestFriendship`, `acceptFriendship`, `findUserByEmail`, `premise` y `viewer`; tests con fetch falso. `apps/web` en `pnpm check` (build, typecheck, lint, tests)
- [x] Cuenta (2026-09-12): registro en `/crear-cuenta` con `POST /api/auth/register` de atomo/auth en modo token (entra directo con `ATOMO_REQUIRE_EMAIL_VERIFICATION=false`; con verificacion, aviso y login 403 hasta el enlace), perfil en `/perfil` (nombre por `PATCH /api/v1/profile`, contraseña por `PATCH /api/v1/profile/password`), "olvide mi contraseña" en `/recuperar` (solo util con correo configurado). `AccountTest` en la API fija el contrato
- [x] Buscar usuarios por correo desde cualquier cuenta: `GET /api/v1/users/lookup?email=` (coincidencia exacta, sin listar, throttle); la web lo usa al invitar y el api-client lo expone como `lookupUser`
- [x] Ajustes: `/ajustes` con idioma de lectura, voz por defecto, velocidad y leer lo nuevo (localStorage; la barra de la mesa es el acceso rapido). Proveedor del DM por mesa entre los presets del servidor: `GET /api/v1/dm/presets` (sin credenciales), `POST /api/v1/tables/{t}/dm/probe` (solo anfitrion, llama al engine), `settings.provider = {preset, model?}` validado y resuelto a credenciales del servidor por `DmProvider`; selector al crear la mesa y pestaña DM del mando con Probar y Guardar. `DmSettingsTest`
- [x] Landing publica en `/` (que es, como se juega, mockup de un turno, Entrar y Crear cuenta); el acceso paso a `/entrar`
- [x] Token en cookie httpOnly: route handlers `/auth/session` y `/auth/register` ponen la cookie `rpg_session` (SameSite=Lax, Secure con https) y el proxy `/api/[...path]` inyecta el Bearer; guardia CSRF por cabecera `X-Requested-With`. El modo API directa (otra URL) conserva el token en localStorage. Documentado en `apps/web/README.md`
- [x] Cola: migracion de `jobs`, `job_batches` y `failed_jobs`; `ResolveTurnJob` sin reintentos, falla al agotar el timeout y `failed()` reabre el turno; el cierre responde 202 aunque el job en `sync` falle. `QueueTest` con `Queue::fake` y con `sync`. El `.env` sigue en `sync` (RUNBOOK, terminal 4 para pasar a `database`)
- [x] Nombre de la app en metadatos y titulo de pestaña con la mesa y la sesion; `icon.svg`, `apple-icon.png` y `favicon.ico`
- [ ] Bandera de narrador compartida: hoy es local a cada navegador. Necesita un endpoint que cualquier miembro pueda escribir (`POST tables/{t}/narrator`) y que `state` lo devuelva; no es barata dentro del PATCH de la mesa (solo el dueño)
- [x] Amigos fuera de la mesa: panel al pie de `/mesas` con solicitudes recibidas, busqueda por correo y lista de amigos (una jugadora nueva no tiene mesa donde aceptar)
- [ ] Cambio de correo con verificacion del nuevo
- [ ] BYOK: clave propia por mesa en `provider_configs` con cast `encrypted` (docs/11, D6), cuando exista cobro; hoy la mesa solo elige preset del servidor
- [ ] Admin con `@atomo/ui` y `@atomo/core`

### Paridad web y movil (revisada el 2026-09-12, se atiende despues de la partida)

Le falta a la movil: crear cuenta, perfil (nombre y contraseña), recuperar contraseña, proveedor del DM por mesa con Probar (al crear y en el mando), busqueda por correo con `users/lookup` (hoy usa la vieja que da 403 y cae a conocidos), amigos fuera de la mesa, idioma de lectura, titulo con mesa y sesion, "bajar a lo nuevo". Le falta a la web: tono por hablante (narrador grave, party normal, un tono por NPC; `ui-logic` ya manda `kind` y `speakerRef` y la web los ignora), bandera de narrador local, y una cronica publica de la campaña (equivalente al modo sin conexion de la app, util para streamers y para Pages). A las dos: BYOK, bandera de narrador compartida, avatar.

- [ ] Mover a `packages/ui-logic` lo que hoy esta duplicado a mano: `tableSetup` (web y movil son espejo), eleccion de tono por hablante (`apps/mobile/src/speech/voices.ts`), reglas de quien invita o cierra y los textos de estado del asiento. Con eso la paridad deja de ser una lista
- [ ] Movil: pantallas de cuenta, presets de DM y lookup usando lo que `api-client` ya expone
- [ ] Web: tono por hablante y bandera local

## Entrega 6: DM IA (primer turno real el 2026-09-12)

- [x] `packages/narrative`: context builder de cuatro capas (mundo y premisa, party con estado vivo, cronica recortada por longitud, turno), `ModelDMProvider` comun con prompt desde docs/03 y docs/06, parser NDJSON en streaming tolerante (basura antes del JSON, fences, JSON partido en lineas, prosa suelta como narracion) y validacion local de los eventos que el modelo propone contra el estado (tiradas solo si el jugador escribio el numero, HP e inventario solo de la party presente)
- [x] Adapters: Anthropic (Messages API con streaming, prompt de sistema cacheado, esfuerzo medio) y OpenAI compatible (Chat Completions con streaming, `baseUrl` para DeepSeek y Ollama, perfil de contexto compacto para modelos locales). `probe()` real por `models.retrieve` o `models.list`
- [x] Premisa de mesa (`settings.premise`, hasta 4000 caracteres) y nota de sesion (`worldTime` al abrir): viajan en `context` de `ResolveTurnRequest` y entran al prompt delimitadas como texto del usuario que no puede cambiar las reglas del DM. Sustituyen al guion fijo del DM scripted para jugar de verdad
- [x] Clave custodiada en el servidor: presets `DM_PROVIDER` (scripted, anthropic, openai, deepseek, ollama) en `rpg-ngn-api`, la mesa solo puede fijar `scripted`; redaccion de la credencial en todo error del engine y de la API (tests). `php artisan dm:probe` verifica clave, modelo y engine sin jugar
- [x] Turno real de punta a punta con Claude Sonnet 5 sobre una mesa desechable (`tools/smoke/turn.sh`): 36 s el turno completo, narro en español, pidio la tirada en vez de inventarla
- [x] Capa `dm` del pack (2026-09-12): coleccion `secrets/` con `about`, `text`, `keywords`, `revealWhen` (por evento o manual), `revealedBy`; evento `secret_revealed` con testigos obligatorios (tipo nuevo, sin subir la version de evento); `packages/campaign` proyecta `knowledge[<pc>].secrets` y el context builder mete la capa al modelo con quien de la party conoce cada secreto. El pack piloto lleva dos (`osric-esta-abajo`, `brorg-pago-por-zahira`), sin subir de version porque las mesas vivas fijan 0.4.0. `bundle-pack` de la movil omite `secrets/`; el visor de fichas no lee la coleccion. Documentado en docs/05 y docs/08
- [x] Lint de conocimiento (2026-09-12, docs/08 invariante 3): `packages/narrative/lint.ts` compara cada bloque y cada `world_event` con lo que saben los receptores; una keyword de un secreto no revelado es `error` (el bloque pasa a `system` y no entra a la cronica), una entidad del pack no presenciada es `warning`. Hallazgos en `result.lint` (campo opcional, contrato en 1) y en el log del engine; modos `enforce`, `report`, `off` por turno (`lint` en la peticion) o por engine (`DM_LINT`). La API no guarda `lint` todavia: solo ve el bloque `system`; guardarlo pide una columna en `turns` o un bloque con detalle para el anfitrion
- [x] Prompt de agencia del jugador (2026-09-12): seccion con ejemplos permitidos y prohibidos, el turno termina siempre con la palabra a la mesa; test que lo fija. Pendiente un caso grabado con salida real del modelo
- [ ] Que el anfitrion vea los hallazgos del lint (columna `lint` en `turns` o bloque `system` con detalle solo para el asiento `host`) y pueda fijar el modo por mesa (`settings.lint`)
- [x] Cola real lista en la API (entrega 5b): tablas de jobs, job unico sin reintentos, reapertura del turno si el worker muere. Se activa con `QUEUE_CONNECTION=database` y `queue:work --queue=turns,default --timeout=600`; el `.env` local sigue en `sync` a proposito para que la partida no dependa del worker
- 6b: `apps/host` para modelos locales (Ollama). Mientras, Ollama en la LAN entra por el preset `ollama` (endpoint compatible con OpenAI); el relay sigue haciendo falta para no exponer el puerto del modelo fuera de la LAN
- 6c: voz neural por bloque para el tier de pago (docs/09, "el usuario oye lo que paga"): `SpeechProvider` del lado servidor con el contrato de OpenAI `/v1/audio/speech`, audio generado por bloque en paralelo a la resolucion del turno y expuesto como `audioUrl` en `TurnBlock`, voz por NPC via `speakerRef`. Proveedores: VoiceStudio (local o self-hosted, AGPL usado sin modificar como servicio aparte; motores con licencia comercial, no OmniVoice que es CC-BY-NC) y OpenAI TTS o ElevenLabs en produccion sin GPU. Evaluado el 2026-09-07

## Entrega 7: Cobro y cupo

- Pago por sesion sobre `atomo/payments`
- Cupo One Shot por turnos
- Proveedor obligatorio al crear mesa

## Entrega 8: Packs de usuario

- Subida `.rpgpack`, inspeccion en dos pasos, hash como directorio
- Takedown y aviso de descarga externa
- Texto de pack como contenido no confiable en el contexto del DM

## v2 (sin fecha)

- DM humano y modo remoto (narracion por microfono, analisis de respuestas). Candidato para el reconocimiento de voz de la mesa: VibeVoice-ASR streaming (quien dijo que, 50+ idiomas). Su TTS queda descartado: Microsoft lo declara solo para investigacion y retiro el codigo en 2025
- SSE desde el engine si el polling deja de bastar
- Segundo ruleset real, que es cuando se valida el eje "agnostico de sistema"
