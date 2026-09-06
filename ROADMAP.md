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

## Entrega 0: AtomoPlatform lista para consumir

- Commit y push de los fixes del smoke run de julio
- `atomo/auth` con modo token (Expo) ademas de cookie SPA, expiracion configurada
- `atomo/payments` con Stripe portado de api-base y su test
- CI del core contra PostgreSQL

## Entrega 1: Contratos y contenido

- BA1: version de schema por evento, `upcast` en `packages/content`
- `tools/migrate-pilot`: los 21 eventos del piloto a `v:1` (unica reescritura permitida)
- Schemas zod de evento, personaje, NPC, ubicacion, quest y pack
- `tools/validate` en CI sobre `content/` y `campaigns/`
- Workflow de Pages que publica solo `apps/sheets` y `content/packs/pilot`

## Entrega 2: Motor

- `packages/core`: dados con `RandomSource` inyectable, checks, modificadores, efectos
- `packages/rules`: `fantasy-d20-lite`
- `packages/campaign`: reductor con ruleset como parametro, proyecciones, snapshots
- Los 21 eventos y el snapshot de la sesion 002 como test de regresion

## Entrega 3: App movil sin servidor (en paralelo con 4 y 5)

- `apps/mobile` (Expo): pack local, vistas narrativa y dialogo, fichas en modal, TTS por bloques
- `packages/ui-logic` sin React
- Spike de Expo con pnpm aislado

## Entrega 4: Plataforma

- `rpg-ngn-api` desde `templates/backend` de Atomo (solo core)
- Modulos `Tables` (mesas, membresia, amistad) y `Campaigns` (event store, snapshots, proyecciones)
- `campaign:import` de los 21 eventos via engine

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
