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

Pasada a la app tras la partida del 2026-09-11 (antes de la entrega 6):

- [ ] El asiento del dueño se llama "dm" y la app dice "Eres el DM"; en V1 el DM es siempre la IA. Renombrar a anfitrion en API y app, y elegir personaje al crear la mesa desde la app
- [ ] Android: el teclado tapa el cuadro de respuesta (`KeyboardAvoidingView` sin `behavior` en Android; `softwareKeyboardLayoutMode: "resize"` o `behavior="height"` y scroll al input)
- [ ] Selector de voz del sistema en la barra de TTS (`getAvailableVoicesAsync`, se elige de oido porque la API no trae sexo), voz recordada por telefono, tono mas grave para el narrador y distinto por NPC. Mientras, cada jugador cambia la voz por defecto del telefono (Google TTS: Instalar datos de voz > Español > Voz II/III; iOS: Juan es-MX)
- [ ] La banda de "nadie esta narrando" y la barra de TTS dejan poca narracion visible en pantalla chica

## Entrega 5b: Web, el producto principal (docs/11 D8, directriz del 2026-09-06)

`apps/web` en Next.js 15 con mesa propia, independiente de la app movil; `apps/sheets` como referencia visual y una vista limpia "en pantalla" para streamers. Lo que Gabino listo el 2026-09-11 como faltante y aqui queda explicito:

- [ ] Modulo de usuario: registro (Atomo ya da login por token), edicion de perfil, visualizacion, amigos
- [ ] Crear mesas eligiendo pack, ruleset y personaje del anfitrion; invitar; abrir y cerrar sesiones. La API ya lo soporta, faltan las pantallas (tambien en la app movil)
- [ ] Ajustes del usuario y de la mesa: proveedor de DM (BYOK local o de servicio, pago por sesion, One Shot, con probe al guardar), voz por defecto e idioma. Docs/09 exige el proveedor antes de jugar
- [ ] Landing publica y la mesa completa (narrativa, dialogo, fichas, TTS) con paridad funcional con la app
- [ ] Admin con `@atomo/ui` y `@atomo/core`

## Entrega 6: DM IA

- `packages/narrative`: context builder de cuatro capas, adapter Anthropic, probe de capacidad
- Premisa de mesa escrita por el usuario al crear la mesa o abrir la sesion (campaña, escena, tono, "esta noche esperan a Calder en la posada"): entra al contexto del DM como capa propia, tratada como contenido no confiable igual que el texto de packs. Sustituye al guion fijo del DM scripted para jugar de verdad
- Clave custodiada en servidor, redaccion en logs
- 6b: `apps/host` para modelos locales (Ollama)
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
