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

## Entrega 3: App movil sin servidor (hecha el 2026-09-06, pendiente la prueba en telefono)

- [x] `packages/ui-logic` sin React: bloques tipados, `sessionBlocks` desde el pack y el estado reducido, vistas narrativa y dialogo como agrupaciones del mismo array, velado de fichas (misma regla que `apps/sheets`), cola de TTS con `SpeechEngine` inyectable; tests sobre el pack piloto
- [x] `apps/mobile` (Expo SDK 57): pack piloto empaquetado con `bundle-pack`, reduccion en el dispositivo con `fantasy-d20-lite`, selector de sesion, vistas narrativa y dialogo, fichas de la party en modal, TTS por bloques con `expo-speech`, bandera de narrador local, tema pergamino
- [x] Spike de Expo con pnpm aislado: `pnpm install`, `build`, `typecheck`, `lint` y `test` pasan desde la raiz con la app en el workspace; `expo export --platform android` produce el bundle con los packages del monorepo
- [ ] Probar en un Android y un iOS reales con Expo Go (Gabino): `pnpm --filter mobile start -- --tunnel`, instrucciones en `apps/mobile/README.md`

## Entrega 4: Plataforma (en curso desde el 2026-09-06)

- [x] `rpg-ngn-api` desde `templates/backend` de Atomo (solo core + payments), repo privado en GitHub, AtomoPlatform como submodule `platform/`, Postgres local, login por token verificado de punta a punta
- [ ] Secret `ATOMO_DEPLOY_KEY` en GitHub y deploy key en Gitea para que el CI clone el submodule
- [ ] Modulos `Tables` (mesas, membresia, amistad) y `Campaigns` (event store, snapshots, proyecciones)
- [ ] `campaign:import` de los 21 eventos via engine

## Entrega 5: Turnos

- `apps/engine` (Node) con `ScriptedDMProvider`
- Job de resolucion, NDJSON, `turn_blocks`, cierre con CAS, idempotencia, polling

## Entrega 6: DM IA

- `packages/narrative`: context builder de cuatro capas, adapter Anthropic, probe de capacidad
- Clave custodiada en servidor, redaccion en logs
- 6b: `apps/host` para modelos locales (Ollama)

## Entrega 7: Cobro y cupo

- Pago por sesion sobre `atomo/payments`
- Cupo One Shot por turnos
- Proveedor obligatorio al crear mesa

## Entrega 8: Packs de usuario

- Subida `.rpgpack`, inspeccion en dos pasos, hash como directorio
- Takedown y aviso de descarga externa
- Texto de pack como contenido no confiable en el contexto del DM

## v2 (sin fecha)

- DM humano y modo remoto (narracion por microfono, analisis de respuestas)
- SSE desde el engine si el polling deja de bastar
- Segundo ruleset real, que es cuando se valida el eje "agnostico de sistema"
