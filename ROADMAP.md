# ROADMAP

El orden viene de [docs/11-adr-stack-saas.md](docs/11-adr-stack-saas.md), que
manda sobre este archivo. Cada entrega lleva su criterio de "hecho" ahi.

**Para saber como esta el proyecto hoy** (que funciona, que falta, que
decisiones estan cerradas) sin leer entrega por entrega:
[docs/17-estado-del-proyecto.md](docs/17-estado-del-proyecto.md). Este archivo
es el detalle; aquel es el resumen con fecha de corte.

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
- [x] Pages sirve desde "GitHub Actions" (Gabino lo configuro; confirmado el 2026-09-14)

## Entrega 2: Motor (hecha el 2026-09-06)

- [x] `packages/core`: `RandomSource` inyectable (semilla, dados fisicos, Web Crypto), dados con ventaja y desventaja, recursos, estado del mundo, `stableStringify`. Cobertura 100% exigida en el test
- [x] `packages/rules`: interfaz `Ruleset` y `fantasy-d20-lite@1.0.0` (Fortuna abierta, ops `memory_recovered`, `gain`, `lose`, `hp`, `condition`); un op desconocido lanza, no se ignora
- [x] `packages/campaign`: `reduce` con ruleset como parametro, proyecciones de mundo, jugador y narrativa, snapshots con `diffSnapshot`
- [x] `campaigns/pilot/snapshots/002.json`: estado canonico de la sesion 002; el test lo reproduce byte a byte
- [x] **Segundo ruleset real** (2026-09-19): `court-intrigue`, investigacion de corte sin combate. No hay puntos de vida ni iniciativa: se gasta **credito** (cuanto te abren las puertas) y sube la **sospecha**; las pistas se acumulan y un envenenamiento es una `condition`. Siete tests, y rechaza los effects del d20 en vez de ignorarlos. **El engine carga los dos packs a la vez, cada uno con su sistema: el eje "agnostico de sistema" deja de ser una promesa.** Lo estrena un pack privado (`rpg-packs/boticaria` en Gitea)
- [x] El schema de personaje deja de asumir D&D: `ac` y `attacks` son opcionales, y hay `faction` y `rank` para los rulesets que reparten acceso en vez de golpes. **Lo descubrio el segundo pack**, que es para lo que servia: un personaje sin armas obligaba a inventar datos falsos

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

- [x] En la app el asiento `dm` se muestra como anfitrion en todo (mesas, mando, forzar cierre); el DM es la IA. Crear mesa desde la app con personaje del anfitrion (retrato) y premisa, e invitar con el flujo real de amistad (pedir, aceptar pendientes, invitar con personaje) desde la mesa nueva y desde el mando. Logica pura con tests (hoy en `packages/ui-logic`, `table-setup`)
- [x] Renombrar el asiento `dm` a `host` en la API (migracion 2026_09_12_000001 sobre las filas existentes) y en `api-client`, `ui-logic`, web y app a la vez (2026-09-12)
- [x] Android: `KeyboardAvoidingView` con `behavior="padding"` en las dos plataformas (Expo Go 57 va edge-to-edge y `resize` ya no encoge la ventana; queda explicito en `app.json`), la narracion baja al final al enfocar, chips escondidos con el teclado abierto. Pendiente de confirmar en telefono; el README dice que mirar
- [x] Selector de voz del sistema (`getAvailableVoicesAsync` filtrado al idioma de lectura, nombre, idioma y calidad, boton Oir para elegir de oido), voz, velocidad y tono recordados por telefono en el almacen seguro, narrador a 0.85 (ajustable), party al natural y tono fijo por NPC (hash del `speakerRef`, hoy en `ui-logic`); `TtsItem` de ui-logic lleva tipo y hablante. Aviso de sin voz en el idioma una sola vez
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
- [x] Bandera de narrador compartida (2026-09-14): `POST tables/{t}/narrator` que cualquier miembro escribe y `state` devuelve en `narrators`. El dispositivo que lee lo anuncia solo mientras habla y lo refresca cada 12 s; el anuncio caduca a los 25 s, asi que si se apaga o cierra la app la mesa deja de verlo sin que nadie lo suelte. Web y movil muestran quien narra por su personaje ("Zahira narra"); desaparece la casilla manual
- [x] Amigos fuera de la mesa: panel al pie de `/mesas` con solicitudes recibidas, busqueda por correo y lista de amigos (una jugadora nueva no tiene mesa donde aceptar)
- [x] Cambio de correo (2026-09-14): el perfil lo edita en web y movil. En AtomoPlatform se cerro un agujero real (`PATCH /api/v1/profile` aceptaba el correo de otra cuenta y dejaba cambiarse el `status`): ahora exige unicidad entre usuarios vivos, ignora `status` y deja el correo nuevo sin verificar, con `emailVerified` en la respuesta. El aviso de verificacion solo sale si el proyecto marca su usuario como `MustVerifyEmail`; el de Atomo no lo hace todavia y esta API tiene `ATOMO_REQUIRE_EMAIL_VERIFICATION=false`
- [x] BYOK: clave propia en `provider_configs` con cast `encrypted` (docs/11 D6), administrada por el usuario desde `GET/PUT/DELETE /api/v1/profile/keys`. **Cambio sobre el ADR: la clave es por usuario y las mesas la heredan**, no por mesa, porque pegar la misma clave en cada mesa era justo la incomodidad que esto quita. Se comprueba contra el proveedor antes de guardarla y no vuelve a salir (solo las ultimas cuatro letras como pista). Quien trae su clave **no gasta cupo ni se le cobra por turno**: paga sus tokens al proveedor y nosotros ponemos motor, web y mesa. Pantalla en web (`/ajustes`) y en movil (perfil), las dos sobre `ui-logic/own-key.ts`
- [ ] Admin con `@atomo/ui` y `@atomo/core`

### Paridad web y movil (revisada el 2026-09-12, hecha tras la partida)

La lista del 2026-09-12 (movil sin cuenta, perfil, recuperacion, presets del DM, lookup, amigos fuera de la mesa, idioma de lectura, cabecera completa ni "bajar a lo nuevo"; web sin tono por hablante ni bandera de narrador) queda cerrada. Lo que sigue faltando a las dos: BYOK, bandera de narrador compartida, avatar, cambio de correo.

- [x] `packages/ui-logic` absorbe lo que estaba duplicado a mano: preparacion de la mesa (`table-setup`: codigo sugerido, personajes libres, estado de cada amistad, `seatPowers`, textos de asiento y cabecera), voz sin plataforma (`voice`: idiomas de lectura, ajustes acotados, `pitchFor` con narrador grave, party al natural y tono fijo por NPC), bandera de narrador (`narrator`: reducer y resumen de la linea de voz), presets del DM (`dm-presets`) y lecturas del pack (`pack`). `turnStatusLine` con acentos y `turnLine` sustituyen a los `statusLine` de cada app. Los tests viven en `ui-logic`; `apps/web/src/lib/tableSetup.ts`, `dmPresets.ts` y `apps/mobile/src/online/tableSetup.ts` desaparecen y `speech/voices.ts` solo conserva lo que depende de expo-speech
- [x] Movil: crear cuenta (registro en modo token, entra directo), perfil (nombre y contraseña), recuperar contraseña; director de juego al crear la mesa y boton DM del mando con Probar y Guardar; busqueda por correo con `users/lookup` (ya no cae a conocidos por el 403); panel de amigos al pie de "Tus mesas"; idioma de lectura en el selector de voz y en la linea plegada; cabecera con sesion, momento del mundo, turno y faltantes; "Bajar a lo nuevo" cuando se subio a leer. Sin telefono ni emulador: `expo export` en verde, los llamados probados contra la API con `tools/smoke` a mano; los pasos de prueba manual estan en `apps/mobile/README.md`
- [x] Web: tono por hablante en Web Speech (`utterance.pitch` con `pitchFor`; tono del narrador ajustable en `/ajustes`, la prueba lee narracion, party y NPC) y bandera de narrador local en la barra de voz ("Otro dispositivo narra", aviso de que nadie narra con "Jugamos leyendo")
- [x] Recuperar contraseña funciona (2026-09-14): el 500 venia de que nadie registraba el enlace de reset y Laravel buscaba la ruta web `password.reset`, que una API sin vistas no tiene. Arreglado en AtomoPlatform (`atomo-auth` registra `ResetPassword::createUrlUsing` hacia `FRONTEND_URL`, commit 05f6c69, con dos tests); en la API basta `FRONTEND_URL=http://localhost:3010`. Verificado de punta a punta: responde 200 y el correo lleva `/auth/reset-password?token=...`. Falta un servidor de correo real para que el enlace llegue a alguien
- [ ] Cronica publica de la campaña (para streamers y Pages): no es barata hoy. `GET campaigns/{c}/projections/narrative` exige ser miembro y no hay endpoint publico ni token de solo lectura; necesita en la API una ruta `GET /public/campaigns/{c}/chronicle` (o un token de invitado por mesa) antes de que la web pueda pintarla

## Entrega 6: DM IA (primer turno real el 2026-09-12)

- [x] `packages/narrative`: context builder de cuatro capas (mundo y premisa, party con estado vivo, cronica recortada por longitud, turno), `ModelDMProvider` comun con prompt desde docs/03 y docs/06, parser NDJSON en streaming tolerante (basura antes del JSON, fences, JSON partido en lineas, prosa suelta como narracion) y validacion local de los eventos que el modelo propone contra el estado (tiradas solo si el jugador escribio el numero, HP e inventario solo de la party presente)
- [x] Adapters: Anthropic (Messages API con streaming, prompt de sistema cacheado, esfuerzo medio) y OpenAI compatible (Chat Completions con streaming, `baseUrl` para DeepSeek y Ollama, perfil de contexto compacto para modelos locales). `probe()` real por `models.retrieve` o `models.list`
- [x] Premisa de mesa (`settings.premise`, hasta 4000 caracteres) y nota de sesion (`worldTime` al abrir): viajan en `context` de `ResolveTurnRequest` y entran al prompt delimitadas como texto del usuario que no puede cambiar las reglas del DM. Sustituyen al guion fijo del DM scripted para jugar de verdad
- [x] Clave custodiada en el servidor: presets `DM_PROVIDER` (scripted, anthropic, openai, deepseek, ollama) en `rpg-ngn-api`, la mesa solo puede fijar `scripted`; redaccion de la credencial en todo error del engine y de la API (tests). `php artisan dm:probe` verifica clave, modelo y engine sin jugar
- [x] Turno real de punta a punta con Claude Sonnet 5 sobre una mesa desechable (`tools/smoke/turn.sh`): 36 s el turno completo, narro en español, pidio la tirada en vez de inventarla
- [x] Capa `dm` del pack (2026-09-12): coleccion `secrets/` con `about`, `text`, `keywords`, `revealWhen` (por evento o manual), `revealedBy`; evento `secret_revealed` con testigos obligatorios (tipo nuevo, sin subir la version de evento); `packages/campaign` proyecta `knowledge[<pc>].secrets` y el context builder mete la capa al modelo con quien de la party conoce cada secreto. El pack piloto lleva dos (`osric-esta-abajo`, `brorg-pago-por-zahira`), sin subir de version porque las mesas vivas fijan 0.4.0. `bundle-pack` de la movil omite `secrets/`; el visor de fichas no lee la coleccion. Documentado en docs/05 y docs/08
- [x] Lint de conocimiento (2026-09-12, docs/08 invariante 3): `packages/narrative/lint.ts` compara cada bloque y cada `world_event` con lo que saben los receptores; una keyword de un secreto no revelado es `error` (el bloque pasa a `system` y no entra a la cronica), una entidad del pack no presenciada es `warning`. Hallazgos en `result.lint` (campo opcional, contrato en 1) y en el log del engine; modos `enforce`, `report`, `off` por turno (`lint` en la peticion) o por engine (`DM_LINT`). La API no guarda `lint` todavia: solo ve el bloque `system`; guardarlo pide una columna en `turns` o un bloque con detalle para el anfitrion
- [x] Prompt de agencia del jugador (2026-09-12): seccion con ejemplos permitidos y prohibidos, el turno termina siempre con la palabra a la mesa; test que lo fija. Pendiente un caso grabado con salida real del modelo
- [x] El anfitrion ve los hallazgos del lint y fija el modo por mesa (2026-09-14): el bloque `system` del corte lleva `audience: host` con el motivo, y `settings.lint` (enforce, report, off) se elige en el panel del DM de la web
- [x] Los hallazgos del lint se guardan en el turno (2026-09-14): columna `lint` (json) en `turns`, escrita al resolver desde `result.lint` del engine, y expuesta en `GET tables/{t}/state` solo al asiento `host`. Asi se revisan despues de la partida, no solo en el aviso del momento
- [x] Boton de tirar en el cuadro de respuesta de web y movil (2026-09-14): `quickRoll` en `ui-logic` con el mismo generador del motor (Web Crypto) y `appendRoll`, que escribe "Tiro 1d20: 14" sin pisar lo declarado. No es una segunda fuente de azar: cuando el DM pide la tirada la resuelve el engine; esto es para el jugador que tira al declarar
- [x] Cola real lista y **activa por defecto** (2026-09-14): `QUEUE_CONNECTION=database` en el `.env` y `queue:work --queue=turns,default --timeout=600` como terminal 4 del RUNBOOK. Medido: el cierre responde 202 en 0.09 s en vez de esperar los 20 a 35 s del modelo. Job unico por turno, sin reintentos, con reapertura si el worker muere. Pega conocida: sin worker levantado el turno se queda en `resolving`
- 6b: `apps/host` para modelos locales (Ollama). Mientras, Ollama en la LAN entra por el preset `ollama` (endpoint compatible con OpenAI); el relay sigue haciendo falta para no exponer el puerto del modelo fuera de la LAN
- 6c: voz neural por bloque para el tier de pago (docs/09, "el usuario oye lo que paga"): `SpeechProvider` del lado servidor con el contrato de OpenAI `/v1/audio/speech`, audio generado por bloque en paralelo a la resolucion del turno y expuesto como `audioUrl` en `TurnBlock`, voz por NPC via `speakerRef`. Proveedores: VoiceStudio (local o self-hosted, AGPL usado sin modificar como servicio aparte; motores con licencia comercial, no OmniVoice que es CC-BY-NC) y OpenAI TTS o ElevenLabs en produccion sin GPU. Evaluado el 2026-09-07

## Entrega 7: Cobro y cupo (cerrada el 2026-09-19)

Criterio del ADR cumplido: un usuario compra creditos con tarjeta y juega con
ellos, de punta a punta en produccion.

- [x] Medicion del consumo: `usage` del engine guardado por turno (`input_tokens`, `output_tokens`, `model`) y acumulado en la campaña; `php artisan turns:usage` lo reporta en tokens y en dinero con los precios de `config/engine.php`
- [x] **Curva de coste medida** (2026-09-19, seis turnos consecutivos reales con un jugador): entrada 2,248 / 2,525 / 2,872 / 3,302 / 3,667 / 4,118. **Crece 374 tokens por turno**, y el snapshot al cerrar sesion la reinicia. Una sesion de 20 turnos con cuatro jugadores cuesta **1.26 USD en Sonnet y 0.42 en Haiku**
- [x] Cupo por turnos: tabla `quotas` por usuario, `QuotaService`, `php artisan quota:grant`. Lo paga el dueño de la mesa, no cada jugador; se descuenta al resolver y no al cerrar, asi que un turno que falla no cobra. Sin cupo, cerrar da 409 y el turno se queda abierto; `GET tables/{t}/state` devuelve `quota.remainingTurns`
- [x] **Cualquier mesa que use nuestra clave gasta cupo**, no solo las One Shot: era lo que quedaba sin cobrar
- [x] Las mesas que gastan cupo narran con el modelo barato (`QUOTA_MODEL`, Haiku). **Probado en produccion el 19-09**: narra bien, el estilo es mas directo que Sonnet pero no se cae. Quien trae su clave conserva el modelo que quiera
- [x] Proveedor obligatorio al crear mesa. **La regla es de creacion, no de resolucion**: las mesas de antes se siguen jugando con el preset por defecto
- [x] **BYOK** (docs/11 D6, con el alcance cambiado a **por usuario** en vez de por mesa): `provider_configs` con la credencial cifrada, `GET/PUT/DELETE /api/v1/profile/keys`, pantalla en web y movil. Se comprueba contra el proveedor antes de guardarla y **no vuelve a salir** (solo las ultimas cuatro letras). Quien trae su clave no gasta cupo ni se le cobra
- [x] **Creditos de prepago con Stripe**: `config/credits.php` con cuatro paquetes (2, 5, 10 y 15 USD) y tres planes con beneficios sin definir, visibles pero apagados. **Solo el webhook acredita** y es idempotente porque Stripe reintenta. Pantalla con Stripe Elements en la web; la movil enseña el saldo y manda a **nuestra** web a recargar (el SDK nativo romperia Expo Go)
- [ ] **Revisar los turnos por paquete con una sesion de cuatro jugadores medida.** Los numeros actuales salen de seis turnos con **un** jugador; el factor de cuatro esta extrapolado
- [ ] Pago dentro de la app movil, cuando existan builds propias con EAS
- [ ] Definir que incluyen Plata, Oro y Diamante (decision de Gabino)

## Cierre del motor y mapa (2026-09-20 y 21)

Sale de una sesion con invitados que salio mal el 20-09. El diagnostico de
Gabino fue que la culpa era **del motor, no de la falta de adornos**, y de ahi
salieron las dos cosas: cerrar los huecos del motor y congelar lo visual
(`docs/14`).

- [x] **Cuatro causas del fiasco, todas arregladas**: toda mesa nueva del piloto nacia **dentro de la mina** (`suggestedSessionCode` devolvia la primera sesion `planned`, y las jugadas por Gabino estaban marcadas `played`, asi que un grupo nuevo abria en la 003, a mitad de la historia); el `recap` de una sesion llegaba al DM aunque esa campaña no la hubiera jugado, y se sentia como spoiler entre mesas; el panel de personalidad salia en todos los packs cuando es de uno solo (bandera `playerPersona`); y "Sin personaje: solo miras y diriges" tambien al invitar, donde es falso. **El `status` del pack es la bitacora del autor, no el punto de partida de las mesas ajenas**
- [x] **El motor sin huecos conocidos.** Se midio preguntandole al validador que formas rechazaba de las que un DM propone en una partida normal: eran seis, mas una septima que solo aparecio jugando. Ahora pasan las diez que se prueban. Lo cerrado: escenas y reloj del mundo (`scene_started`/`scene_closed` y `worldTime`, que el DM no podia emitir y por eso una sesion nueva arrastraba el momento de la anterior), condiciones sobre NPC, `rumor_heard` como evento propio (un rumor **no** es conocimiento: se guarda aparte de `facts`, con quien lo conto y si el DM sabe que es falso), progreso de misiones en `CampaignState`, y NPCs improvisados (el interprete exigia que el NPC estuviera declarado, **y el piloto no declara ninguno** mientras su historia esta llena de ellos)
- [x] **Los fallos de turno ya no rompen la partida**: `resolve` reintenta una vez borrando antes los bloques del intento fallido. Si el segundo sale, solo el anfitrion recibe el motivo. Si fallan los dos, la mesa lee texto de mesa, no jerga del motor
- [x] **Boton "Iniciar partida"**: tarjeta con los pasos y el boton para el anfitrion mientras no hay sesion. Antes habia que escribir tres digitos a ciegas
- [x] **Tercer ruleset `masquerade`** (prestigio, escandalo, rumores, vinculos) y el pack **La Mascarada**: 8 jugables con retrato, 13 NPC, 6 lugares, 5 actos como misiones, 7 secretos
- [x] **Personalidad por jugador** (600 caracteres con plantilla): la escribe el jugador, el DM la recibe en la ficha. Dos jugadores con el mismo arquetipo viven noches distintas
- [x] **Mapa de la partida** (21-09, unica cosa que salio del congelador de `docs/14`, porque Gabino queria medir la reaccion de la gente a su uso narrativo): imagen del pack con los lugares posados por coordenadas en porcentaje, caminos desde las conexiones que los lugares ya declaraban, y quien esta en cada uno. **No es un tablero tactico.** Modal a pantalla completa en web y en la app. Formato en `docs/05`, ubicacion en `docs/08`, lo que se ve en `docs/13` 4.10
- [x] **La party empieza en algun sitio** (21-09): la sesion del pack declara `startLocation` y el engine emite un `world_event` con un `move` por personaje que no tenga ya ubicacion. Sin esto el mapa decia "de camino o fuera de escena" de toda la mesa hasta que el DM moviera a alguien
- [ ] **Observar el mapa jugando**: si los jugadores lo abren por su cuenta, si cambia como se declara ("me voy a la biblioteca") y si el director se acuerda de emitir `move` en una partida larga. Es observacion, no construccion

## Produccion (desplegada el 2026-09-18)

- [x] **https://rpg-worlds.gabinoramirez.com** en Hetzner CX23 (Nuremberg, 7.09 USD/mes): Ubuntu 24.04, HTTPS con Let's Encrypt y renovacion automatica, ufw con solo 22/80/443, fail2ban. Postgres, engine y API cerrados desde fuera
- [x] Seis servicios de systemd con arranque automatico (`rpg-engine`, `rpg-worker`, `rpg-web`, nginx, php8.3-fpm, postgresql). **Comprobado en un reinicio real el 19-09**: vuelven solos
- [x] Nginx: la web de Next sirve `/api/*` (su proxy traduce la cookie httpOnly a Bearer) y Laravel escucha en 127.0.0.1:8010. El webhook de Stripe va directo a Laravel, sin pasar por el proxy
- [x] **Packs privados en Gitea** (organizacion `rpg-packs`, un repo por pack): el repo publico solo admite contenido original o licenciado (docs/07), asi que lo demas vive versionado y respaldado en privado. `tools/packs/new-pack.sh` crea el repo y lo sube; el pack se enlaza a `content/packs` y **la carpeta debe llamarse como el `id` del pack**, porque el engine busca por id
- [x] Los personajes y retratos de un pack del servidor los sirve la API: la web solo lleva empaquetado el piloto, asi que sin esto no se podia elegir personaje en otro pack
- [ ] Despliegue automatico: hoy es `git pull` a mano por SSH
- [x] **Copias de seguridad de Postgres** (2026-09-19, del bloque HOY del VAM): `rpg-backup.timer` diario a las 04:32 UTC con dumps en `/srv/rpg/backups/`, y `deploy/pg-restore-test.sh` que comprueba la restauracion con las mismas cuentas que produccion y el trigger append-only presente
- [ ] Vigilancia: nadie avisa si un servicio se cae

## Antes de abrir a usuarios reales

El servidor ya es publico (https://rpg-worlds.gabinoramirez.com). Esto es lo
que falta para que entre alguien que no seamos nosotros.

- [ ] **Enlace de invitacion a la mesa. PENDIENTE NUMERO UNO** (Gabino, 21-09). Hoy entrar son **seis pasos**: el invitado se registra, da su correo por fuera, recibe solicitud de amistad, la acepta, el anfitrion lo invita buscandolo por correo y recarga. La regla esta en `TableMemberActionController` ("sin amistad aceptada no hay invitacion") y **no existe enlace ni codigo de mesa**. Explica por que la sesion con invitados del 20-09 empezo mal antes de la primera narracion. **No es UX, es funcionalidad de servidor.** Restriccion que condiciona el diseño: quien entra **gasta turnos del anfitrion** (el cupo se descuenta de `owner_id`), y con `MAIL_MAILER=log` el correo no prueba identidad, asi que hace falta tope de plazas, caducidad y revocacion. Opciones en `docs/18` (D-UX-1)
- [ ] **Documentacion de usuario.** No existe ninguna: `docs/` es SDD, y README, ROADMAP y RUNBOOK son para desarrollar. Nadie ajeno sabria como entrar, crear mesa, invitar o jugar un turno
- [ ] **Cuentas sembradas en produccion.** `gabino@example.com` es `admin` con `password`, y `admin` recibe de los seeders de Atomo `users.*` y `payments.refund` (VAM del 19-09): se borra, no se le cambia la clave. `god@example.com` tiene todos los permisos con la clave de `SEED_GOD_PASSWORD`: rotarla. `jaz` y `armando` tienen `password`: cambiarlas. La cuenta real de Gabino es `jadwer@msn.com`, `customer`
- [ ] **El correo todavia no prueba quien eres.** Ya sale correo (ver "Correo saliente"), pero `ATOMO_REQUIRE_EMAIL_VERIFICATION=false`: cualquiera puede registrarse con una direccion ajena. Recuperar contraseña **si funciona** desde el 22-09, asi que la via de rescate ya no es el anfitrion. Encender la verificacion es una decision aparte, porque añade un paso al registro justo donde la gente abandona (`docs/18`, D-UX-1)
- [ ] **Stripe en modo real**: resolver la tarea vencida de la cuenta (transferencias suspendidas) y pasar a claves `live`. Hoy todo esta en sandbox
- [ ] **Terminos de servicio y aviso de privacidad**: se cobra dinero y se guardan datos de terceros
- [x] **Correo saliente** (2026-09-22): **Resend por SMTP estandar**, sin paquete ni dependencia nueva, asi que cambiar de proveedor es cambiar variables. La clave vive en `/root/.rpg/resendkey` y se copia al `.env`, nunca en el repo. Trampas pagadas: `MAIL_SCHEME` en Laravel 12 acepta `smtp` o `smtps`, **no `tls`** (para el 587 con STARTTLS es `smtp`), y tras tocar el `.env` hay que reiniciar **`rpg-worker` y `php8.3-fpm`**, no solo limpiar la cache
  - [x] **Recuperar contraseña**, probado de punta a punta en produccion: correo enviado, token valido, pagina, cambio y login con la clave nueva. Hizo falta arreglar tres cosas: las notifications de `atomo-auth` estaban escritas pero **no las mandaba nadie** (Laravel enviaba las suyas en ingles), una barra final en `FRONTEND_URL` dejaba doble barra en el enlace, y **la pagina `/auth/reset-password` no existia**, asi que el correo acababa en un 404
  - [x] **Correo de bienvenida** (pedido por Gabino el 19-09): `UserRegistered` en la plataforma y `WelcomeNotification` propia de rpg-ngn, que habla de la mesa y no del producto. No se manda si ademas hay que verificar el correo. Va a la cola. De paso: el registro mandaba el correo de verificacion **siempre**, tambien con la verificacion apagada
  - [x] **Dominio `gabinoramirez.com` verificado en Resend** (2026-09-22): DKIM en `resend._domainkey` mas dos CNAME (`rsend` y `send` a `forge.rmta.net`). **El SPF que ya tenia el dominio no se toco**: Resend usa CNAME justo para no chocar con el correo existente, y dos SPF en un dominio lo rompen. El remitente es `no-responder@gabinoramirez.com`, probado con un envio real
  - [ ] **Avisos de mesa**: "es tu turno", "abrieron sesion". Es lo que trae a la gente de vuelta sin que tenga que acordarse sola. Se decide cuando avisar sin volverse pesado viendo jugar a gente, no antes
- [ ] Revisar que pasa cuando un usuario sin creditos entra: hoy choca con un 409 al cerrar turno, que es correcto pero seco
- [ ] **Lo que salio del VAM de arquitectura del 19-09** (rpg-ngn-api/docs/vam-2026-09-19.md, con orden de ejecucion y horas): copias de seguridad, roles de Postgres, reserva de cupo, redaccion de credenciales en logs, modo pantalla que lee bloques de anfitrion, el segundo ruleset jugable de verdad, `world` y la capa `dm` antes de roles ocultos, la app antes del primer APK. Los supuestos nuevos estan escritos en docs/11, docs/06 y los READMEs que cada fallo indica

## Entrega 8: Packs de usuario

- [ ] **WebP como formato de los retratos.** Hoy son JPEG: los cinco de la boticaria pesan unos 480 KB en total y la lamina original 2.5 MB. En WebP con calidad equivalente son la mitad o menos, y el ahorro se multiplica cuando haya cientos de packs servidos desde el servidor. `tools/packs/crop-portraits.py` ya centraliza el recorte, asi que es cambiar el formato de salida y aceptar `.webp` en la ruta de retratos (el engine ya lo contempla en su validacion)

- **Packs de la comunidad: diseño escrito en `docs/15-packs-de-la-comunidad.md`** (21-09). Cubre la subida `.rpgpack`, el catalogo publico, el cobro (limite de packs y turnos, no espacio en disco), la revision en dos vias (privado al instante, publico en cola) y el riesgo de procedencia, que es el que puede doler. Lo que falta decidir esta listado ahi. No se construye antes de medir con gente real (docs/14) ni antes de cerrar los cuatro bloqueos de "Antes de abrir a usuarios reales"
- Subida `.rpgpack`, inspeccion en dos pasos, hash como directorio
- Takedown y aviso de descarga externa
- Texto de pack como contenido no confiable en el contexto del DM
- Informacion asimetrica para packs de deduccion social (issue #2, analisis de GPT del 2026-09-18). Verificado contra el codigo el 2026-09-19 (VAM, reproducido con el reductor): `visibility.layer` existe, `visibleTo()` la respeta y el feed de eventos la filtra en la API (`CampaignEvent::scopeVisibleToPlayers`). Lo que NO la respeta es el reductor: `appendLog` no consulta `visibility`, asi que un evento de capa `dm` entra en `narrative.log` y la proyeccion `narrative` lo sirve a toda la mesa; y `worldProjection` devuelve el estado vivo completo de todos los personajes (`inventory`, `custom`) a cualquier miembro. Hoy nadie emite eventos `dm` y ningun cliente lee esas proyecciones, asi que es trampa armada, no fuga activa. Antes de cualquier pack con roles ocultos hay que cerrar las dos cosas (rpg-ngn-api/docs/vam-2026-09-19.md, S14 y E1). Lo que ademas falta es el modelo de audiencias mas alla de `table`/`host` (por personaje, por rol, por faccion), y se diseña con un pack concreto delante, no antes. Reuniones, votos y condiciones de victoria quedan para v2 si algun pack los pide
- Principio de coste que manda sobre el diseño (del mismo issue): las llamadas al proveedor escalan con eventos del mundo, no con el numero de jugadores. Cinco jugadores que ven la misma explosion son una generacion narrativa y cinco proyecciones deterministas. A 0.019 USD por turno medidos, la version ingenua multiplica el coste por jugador y ahi no hay negocio

## Deuda tecnica (sin entrega asignada)

- **`campaign:import` solo trae eventos.** Una campaña importada llega sin turnos ni bloques, asi que la mesa se ve vacia (los clientes pintan bloques, no eventos) y, si la sesion estaba abierta, queda abierta sin turno: nadie puede responder. Paso con la mina el 19-09 y se arreglo a mano copiando `turns` y `turn_blocks` de la base local mas un bloque `system` de recapitulo ("Donde lo dejamos"). Lo bueno: que el import lleve turnos y bloques, o que `openSession` escriba el recapitulo desde la proyeccion `narrative` cuando la campaña ya tiene historia

Lo cerrado en septiembre queda en el historial de git; aqui solo lo que sigue
abierto.

- [ ] `composer analyse` esta declarado en el composer.json de la API pero no existe `phpstan.neon`, asi que falla con "At least one path must be specified". O se configura Larastan o se quita el script
- [ ] Un solo comando que levante los servicios locales (engine, API, web, worker). En produccion ya lo resuelve systemd; en la laptop siguen siendo cuatro terminales
- [ ] Renombre DM a GM: plan escrito en `docs/12-plan-renombre-gm.md`, sin ejecutar. La capa de visibilidad `dm` de los eventos **no** se renombra (es dato guardado; pediria subir version de esquema con upcast)
- [ ] Traer `legacy` a `dev` con merge **antes** del primer merge de `dev` a `main`, y ampliar el schema `Session` con `veiledFields`, `veilNote` y `hideChronicle`
- [x] **Migrar la campaña de la mina al servidor** (hecho el 2026-09-19, rehecho el 20-09 tras el borrado de mesas de prueba): vive como mesa 15 a nombre de Gabino, importada desde `campaigns/pilot/events.jsonl` + `snapshots/002.json`. **La partida piloto es el repo, no el servidor**: ahi solo vive su continuacion web
- [ ] APKs de Android: falta `eas.json` y el CLI. Con el servidor publico ya tiene sentido, porque la app puede apuntar a un sitio estable

## v2 (sin fecha)

- DM humano y modo remoto (narracion por microfono, analisis de respuestas). Candidato para el reconocimiento de voz de la mesa: VibeVoice-ASR streaming (quien dijo que, 50+ idiomas). Su TTS queda descartado: Microsoft lo declara solo para investigacion y retiro el codigo en 2025
- SSE desde el engine si el polling deja de bastar
