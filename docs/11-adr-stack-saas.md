# ADR: stack y arquitectura del SaaS

Decidido el 2026-09-05 tras dos revisiones independientes: una fiscal sobre
[09](09-saas-scope.md) y [10](10-audit-2026-09-05.md), y una de arquitectura
sobre las plantillas reales de Atomo. Este documento cierra la "decision abierta"
de 10 y sustituye la seccion "Arquitectura" y el "Orden sugerido" de 09. Manda
sobre 09 y sobre el ROADMAP en lo que se contradigan; el contrato de realidad
([06](06-reality-contract.md)) sigue mandando sobre todo.

## Contexto

`CLAUDE.md` decidio el 2026-09-04 que el motor es TypeScript puro y que "Laravel
queda reservado para una eventual plataforma SaaS". [02](02-architecture.md)
excluye api-base **del motor**, no de la plataforma. La sesion del 05 en la
madrugada leyo solo la segunda fuente, diseño `apps/server` sin tecnologia y
reinvento cuentas, tenancy, cobro y subida de archivos que la plataforma ya tiene.
Este ADR corrige eso.

Tesis en una linea: **la plataforma Laravel es la unica que escribe en la base de
datos; el motor TypeScript corre una sola vez, en un proceso Node del servidor que
la plataforma invoca por turno; los clientes leen proyecciones, nunca el log
crudo.**

## Decisiones

### D1. Plataforma: Laravel 12 sobre el core de AtomoPlatform

Se usa `~/dev/AtomoSoluciones/AtomoPlatform` (packages `atomo/*`), no api-base.

Razon: rpg-ngn necesita exactamente el core (`core`, `json-api-base`,
`permissions`, `user`, `auth`, `audit`, `app-config`, `health`) y ningun addon.
Con Atomo se instala lo que se usa; con api-base se clona un monolito nwidart y
se podan catorce modulos de ERP. Las convenciones de Atomo (`{plural}.{action}`,
`AbstractAuthorizer` de dos lineas, `SchemaRegistry` por package) son las que
queremos para los modulos nuevos.

Alternativa descartada: api-base podado. Mas probado en produccion, pero el
`Server.php` con listas manuales y la herencia de ERP pesan mas que la madurez, y
lo que api-base tiene y Atomo no (Stripe, modo token) se porta en dias.

Costo aceptado: Atomo tiene menos red de tests (sus tests son `class_exists`) y
nunca ha publicado packages. Los tests que protegen a rpg-ngn se escriben por
invariante, igual que se habrian escrito con api-base.

Cambios que entran a AtomoPlatform (desarrollo propio, se modifica directo):

1. Commitear y pushear los fixes del smoke run de julio (37 archivos pendientes).
2. `atomo/auth`: modo token ademas del modo cookie SPA. El login devuelve
   `plainTextToken` cuando el cliente lo pide (cabecera o campo `device`); la web
   sigue con cookies. Expiracion de tokens configurada, no `null`.
3. Package nuevo `atomo/payments`: `StripeService`, webhook con verificacion de
   firma e idempotencia, portados de api-base con su test.
4. CI del core contra PostgreSQL, ademas de SQLite.

Consumo mientras no haya registry: AtomoPlatform como submodule de `rpg-ngn-api`
con `repositories: path`. Publicar al registry de Gitea es tarea de Atomo, no
bloquea a rpg-ngn.

### D2. Base de datos: PostgreSQL 16

Razon: el event store es append-only con JSON. `jsonb` con indice GIN resuelve
consultas por contenido (testigos, targets) sin duplicar columnas;
`INSERT ... ON CONFLICT` e indices parciales simplifican el cierre de turno.
Gestionado en GCP y AWS, imagen oficial para Podman. El core de Atomo no tiene
SQL especifico de MySQL; Spatie soporta Postgres.

Costo aceptado: instalar el servidor en WSL (hoy solo hay cliente) y probar el
event store contra Postgres real en CI, no contra SQLite.

### D3. El motor corre en `apps/engine` (Node), invocado por la plataforma

Servicio pequeño (Hono), en `localhost`, sin credenciales de base de datos. Es el
unico lugar donde `packages/campaign` y `packages/narrative` corren en produccion.

Descartadas:

- **Motor en el cliente**: para reducir necesita el log completo, incluida la
  capa `dm`; expone los secretos por construccion. El turno moriria con el
  telefono que lo ejecuta y la clave del proveedor viajaria al cliente.
- **Laravel ejecutando Node por CLI**: un turno con LLM dura 20 a 90 segundos y
  retiene un worker PHP-FPM todo ese tiempo. Sirve para reproyectar en batch
  (`campaign:import`), no para el turno.
- **Reductor en PHP**: dos implementaciones de la funcion cuya reproducibilidad
  es la tesis del producto. El motor existe en TS de todos modos por Expo.

Costo aceptado: dos procesos que desplegar y un contrato Laravel/engine que
versionar (`packages/engine-contract`, tipos + zod, JSON Schema exportado para el
test del lado PHP).

### D4. Persistencia del estado de campana

Tres tablas con reglas distintas:

- `campaign_events`: append-only, fuente de verdad. `campaign_id`, `seq`, `v`
  (version del schema del tipo, BA1), `type`, `session_id`, `turn_id`,
  `recorded_at`, `world_time`, `payload jsonb`, `idempotency_key`. Columnas
  generadas desde `payload` para `actor` y `visibility_layer`; GIN sobre
  `payload`. `UNIQUE (campaign_id, seq)`. El rol de la aplicacion no tiene
  `UPDATE` ni `DELETE`; el modelo lanza excepcion en ambos; un test lo prueba.
  Las correcciones son eventos `correction` (regla 16).
- `campaign_snapshots`: inmutables, escritos solo al procesar `session_closed`,
  con `pack_version` y `ruleset_version` (BA2). El replay audita; si difiere,
  gana el snapshot y se registra la divergencia.
- `campaign_projections`: materializadas, se sobreescriben por turno. Es lo que
  sirve la API. Cada jugador recibe `world` (vista publica) y `player:<pj>`.
  La regla de que campos de una ficha ajena son publicos (IL2) vive aqui.

`seq` se asigna dentro de la transaccion del job con la fila de `campaigns`
bloqueada (`FOR UPDATE`, `head_seq`). Un solo escritor: la carrera de IA5
desaparece sin coordinacion entre procesos.

Migracion de los 21 eventos del piloto: `tools/migrate-pilot` les pone `v:1`,
`id` y completa `recordedAt` de los seq 8 a 17 con precision de sesion. Es la
unica reescritura permitida del historial y se hace ahora, mientras son 21 y no
hay usuarios. Nota: el commit a73a5a4 ya reescribio el archivo a mano para
cambiar la visibilidad del seq 2; fue una violacion de la regla 16 que este ADR
registra y que no se repite: a partir de la migracion, solo `correction`.

### D5. API

JSON:API (patron de Atomo) para recursos de plataforma: `users`, `friendships`,
`tables`, `table-members`, `campaigns`, `game-sessions`, `packs`,
`provider-configs` (sin el secreto), `projections`, `turns`, `turn-blocks`. Los
Authorizer comprueban pertenencia a la mesa, no roles globales.

Endpoints custom para comandos de juego, porque un turno es una maquina de
estados con idempotencia y no cabe en `PATCH`:

```
POST /api/v1/tables/{table}/sessions          abre sesion (verifica pago o cupo)
POST /api/v1/sessions/{session}/close         emite session_closed y snapshot
POST /api/v1/turns/{turn}/responses           Idempotency-Key obligatorio
POST /api/v1/turns/{turn}/close               CAS; 409 si ya esta cerrando
POST /api/v1/turns/{turn}/knowledge-shared    el tap barato de BL3
GET  /api/v1/tables/{table}/state?after=      polling: turno, quien respondio, bloques
PUT  /api/v1/tables/{table}/provider          escribe el secreto; nunca se lee
POST /api/v1/packs                            subida .rpgpack
```

Streaming: **polling de 1.5 segundos en V1**. La unidad de consumo ya es el
bloque (TTS y las dos vistas trabajan por bloque), asi que el streaming por token
no aporta nada perceptible. El engine si transmite NDJSON hacia Laravel, y los
bloques llegan a la base de datos conforme terminan. SSE desde Laravel queda
descartado (un worker FPM por jugador conectado); si hace falta en v2, es SSE
desde el engine.

Contrato Laravel/engine, privado, con `X-Engine-Token` y `X-Engine-Contract`:
`POST /v1/turns/resolve` (NDJSON), `POST /v1/validate/events`, `POST /v1/project`,
`GET /v1/providers/probe`, `WS /v1/hosts`.

### D6. Proveedor de LLM (cierra BA3)

- **Nube**: adapter en el engine, clave custodiada por Laravel con cast
  `encrypted` y `APP_PREVIOUS_KEYS` para rotar. Se descifra en el job, viaja por
  localhost, vive en memoria solo durante la llamada. Ni Laravel ni el engine la
  escriben en logs (processor de redaccion y test que hace grep del log).
- **Local (Ollama)**: relay `npx @rpg-ngn/host` que corre junto al modelo, se
  autentica con un token de host por mesa y abre un WebSocket al engine. Mismo
  `DMProvider`, otro transporte. Sin host conectado el turno queda
  `awaiting_host`; nada se pierde. El dueño del host puede ver el prompt, y con
  el los secretos: es inevitable en modo local y se declara en la UI.

El relay se construye despues del primer turno real con nube (entrega 6b), no
antes: con la plataforma resolviendo cobro, ya no hace falta "BYOK primero".

Decisiones de contrato tomadas al construir la entrega 6 (2026-09-12):

- `ResolveTurnRequest` gana `context: { premise?, sessionNote? }`, opcional y
  sin subir `ENGINE_CONTRACT_VERSION`: un campo opcional no rompe a los
  clientes del engine nuevo. Si rompe a un engine viejo que reciba la API
  nueva (rechaza claves desconocidas), asi que API y engine se despliegan
  juntos, como ya exige D3.
- `ProviderConfig` admite `anthropic` y `openai`; el segundo cubre cualquier
  API compatible con Chat Completions via `baseUrl` (DeepSeek, Ollama). No hay
  un adapter por proveedor: hay un `ModelDMProvider` comun (contexto, prompt,
  parser, validacion, redaccion) y transportes finos por SDK. `contextProfile:
  compact` recorta el contexto a menos de 3000 tokens para modelos locales.
- En V1 la clave no vive en `provider_configs` con cast `encrypted` sino en el
  `.env` del servidor como preset (`DM_PROVIDER`): una mesa solo puede fijar
  `scripted`. La tabla cifrada por mesa queda para el BYOK de la entrega 7,
  cuando exista la pantalla de proveedor. La redaccion si esta: el engine y la
  API quitan la credencial de todo mensaje de error y hay tests que lo prueban.
- El modelo no registra las acciones de los jugadores ni la narracion: el
  engine lo hace a partir de las respuestas y de los bloques. Los eventos que
  el modelo si propone (tirada reportada, HP, condicion, inventario, hecho del
  mundo) se validan contra el estado antes de entrar al log, y una tirada solo
  entra si el jugador escribio el numero (regla 1 de 06). Lo que no se puede
  aplicar se ignora con un aviso `system`; el turno no se cae por una linea.

### D7. Repos: dos

- `rpg-ngn` (publico, este): monorepo pnpm con `packages/*` (motor,
  `engine-contract`, `api-client`, `ui-logic`) y `apps/*` (`sheets`, `web`,
  `mobile`, `engine`, `host`).
- `rpg-ngn-api` (privado): Laravel desde `templates/backend` de Atomo (solo
  core), `atomo/payments`, y los modulos del juego (`Tables`, `Campaigns`,
  `Turns`, `Providers`, `Packs`, `Quotas`).

Razon: el repo publico sirve GitHub Pages y no debe cargar codigo privado de
Atomo. El contrato entre ambos es HTTP mas un JSON Schema; no hay imports
cruzados. Es el patron que webapp-base ya documenta (backend clon aparte).

`apps/sheets` se conserva en `main` para la mesa de Valdoria, pero no es cliente
del producto: sirve `recap` y `openThreads` sin auth y usa `innerHTML` con datos
de pack. Antes del primer merge de `dev` a `main`, Pages pasa a un workflow que
publica solo `apps/sheets` y `content/packs/pilot`.

### D8. Clientes

- **Web: Next.js 15, producto de primera** (directriz primaria de Gabino,
  2026-09-06): landing, registro, gestion de mesas y amigos, configuracion de
  proveedor, pago, admin, DM harness y la mesa completa, con implementacion
  propia e independiente de la app movil (si un dia hay clientes nativos, la
  web sigue sola). Es la cara de entrada prevista para streamers: el acabado
  visual, el rendimiento percibido y la vista limpia "en pantalla" se diseñan
  primero aqui. Consume `@atomo/ui` y `@atomo/core` en el admin; la mesa lleva
  diseño propio con `apps/sheets` como referencia visual. No usa `@lwm/*`.
  Mientras iOS este diferido, los iPhone entran por la web.
- **Movil: Expo** (SDK 54 o superior, por el aislamiento de pnpm). Es la
  superficie del jugador de 09. Token de Sanctum en `expo-secure-store` y cliente
  fetch propio (`@rpg-ngn/api-client`). Modo offline con pack local y sin DM
  reduce en el dispositivo un log sin capa `dm`: mismo `@rpg-ngn/campaign`, otro
  soporte.
- `packages/ui-logic` sin React (maquina de estado del turno, agrupacion de
  bloques, TTS por bloques). Los componentes visuales de la mesa se escriben en
  cada app.

Regla de dependencias, aplicada por lint: `content <- core <- rules <- campaign
<- narrative`; ningun package bajo `packages/` importa `react`, `next`, `expo`
ni `node:*` (IA2, IA3).

### D9. Tooling

| Pieza | Decision |
|---|---|
| TS | Node 22, pnpm 10.30, TypeScript 5.7, tsup (ESM, `exports` explicito), Vitest 3, ESLint 9 |
| Web | Next 15.3, React 19.1 |
| Movil | Expo SDK 54 o superior; `expo-doctor` y `tsc` en CI |
| PHP | 8.3, Laravel 12, Sanctum 4, laravel-json-api 5, Spatie permission 6 y activitylog 4, PHPUnit 11, Pint, Larastan |
| DB | PostgreSQL 16 local en WSL; SQLite solo para tests que no tocan el event store |
| CI | GitHub Actions. `rpg-ngn`: build, test, lint, typecheck filtrados por paquete afectado, mas `validate-content` sobre `content/` y `campaigns/`. `rpg-ngn-api`: PHPUnit contra SQLite y contra `services: postgres:16`, Pint, Larastan |
| Local | Sin Docker: Postgres y Ollama nativos en WSL; `php artisan serve`, `queue:work`, engine, web y mobile como procesos |
| Produccion V1 | VPS con nginx, php-fpm, Postgres, engine bajo systemd. Contenedores (Podman) y nube gestionada cuando exista trafico que lo justifique; nada del diseño lo impide |

## Orden de construccion

| # | Entrega | Hecho cuando |
|---|---|---|
| 0 | AtomoPlatform: commit de julio, modo token en `atomo/auth`, `atomo/payments`, CI con Postgres | Un proyecto desde `templates/backend` (solo core) hace login por cookie y por token, y el webhook de Stripe pasa su test |
| 1 | BA1 + `packages/content`: schemas zod de evento v1, personaje y pack; `upcast`; `tools/migrate-pilot`; `tools/validate` en CI | `pnpm validate` pasa sobre `content/` y `campaigns/pilot`; un evento roto a proposito falla el CI; los 21 eventos llevan `v:1` e `id` en un commit propio |
| 2 | Motor: `core` (RandomSource inyectable), `rules/fantasy-d20-lite`, `campaign` (reduce con ruleset como parametro, proyecciones, snapshots) | `reduce(pilot.events, ruleset@1)` reproduce byte a byte el snapshot de la sesion 002; cobertura total en core; el lint de dependencias pasa |
| 3 | `apps/mobile` offline (spike IA2): pack piloto local, vistas narrativa y dialogo, fichas en modal, TTS por bloques | Corre en un Android y un iOS reales desde el workspace pnpm; se prueba en la siguiente sesion presencial |
| 4 | `rpg-ngn-api`: proyecto desde Atomo core, modulos `Tables` y `Campaigns`, `campaign:import` | Los 21 eventos importados via engine; JSON:API devuelve `player:zahira` sin eventos `dm`; `UPDATE` y `DELETE` sobre `campaign_events` fallan; un `seq` duplicado da 409 |
| 5 | `apps/engine` + turnos con `ScriptedDMProvider` (sin LLM): job, NDJSON, `turn_blocks`, CAS, idempotencia, polling | Un turno completo desde dos telefonos por LAN; dos cierres forzados con 200 ms de diferencia producen una sola resolucion; una respuesta tardia queda `late` y no se pierde |
| 6 | `packages/narrative` real: context builder de cuatro capas, adapter Anthropic con clave custodiada, probe de capacidad | Blind test de dos proveedores con la misma escena; un secreto no emergible no aparece en el prompt (test); grep del log tras un turno no encuentra la clave |
| 6b | `apps/host` con Ollama | Con el host apagado el turno queda `awaiting_host` y se reanuda al conectar |
| 7 | Cobro y cupo: `atomo/payments`, `Quotas` de One Shot por turnos, proveedor obligatorio al crear mesa | Una mesa de pago no abre sesion sin `payment_intent.succeeded`; el cupo se descuenta en la misma transaccion que el `seq`; el webhook es idempotente |
| 8 | Packs de usuario: subida, inspeccion en dos pasos, hash como directorio, takedown, aviso de descarga externa (IA4) | Fixtures de zip bomb, zip slip y JSON profundo rechazados; el texto del pack entra al contexto marcado como no confiable (test) |

La 3 corre en paralelo con la 4 y la 5. La 6 no empieza sin la 5.

## Riesgos abiertos

| Riesgo | Mitigacion | Dueño |
|---|---|---|
| `atomo/auth` sin expiracion de token, igual que api-base | Se fija en la entrega 0; test que llama sin token y espera 401 | Gabino (Atomo) |
| Tests de Atomo no prueban contrato | Tests por invariante en `rpg-ngn-api`; los que apliquen al core suben a Atomo | Gabino |
| Dos versiones de React entre web y mobile | `packages/*` sin React por lint; bindings en cada app | Entregas 2 y 3 |
| Tentacion de que el engine escriba en DB | El engine no tiene credenciales de DB; regla escrita en 02 | Doc 02 |
| Host relay ve los secretos | Declarado en UI y terminos; se recomienda que el host sea quien tendria la pantalla del DM | Entrega 6b |
| Proveedor del cupo gratuito | Decision de negocio pendiente (09); hasta entonces cuenta propia y modelo barato | Gabino (negocio) |
| Pages acoplado a `main` | Workflow `deploy-pages` antes del primer merge de `dev` | Entrega 1 |

## Correcciones a documentos anteriores

- 09: fecha de escritura (05, no 06); se jugaron dos sesiones, no tres; la
  seccion "Arquitectura" y el "Orden sugerido" remiten aqui; la afirmacion de
  que `DMProvider` "ya esta diseñado" para BYOK se sustituye por D6.
- 10: la "Decision abierta: stack del SaaS" queda cerrada por D1 y D3; BA3 por
  D6; IA5 por D4 (un solo escritor). El resto de hallazgos sigue abierto y se
  cierra editando 08, 05 y 09 como estaba previsto.
- ROADMAP: las fases se reemplazan por el orden de construccion de arriba.
- 02: la tabla de decisiones gana la fila de plataforma y la regla de que el
  engine no escribe en DB.
