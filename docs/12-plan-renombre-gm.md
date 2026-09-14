# Plan: renombrar DM a GM (Game Master)

Estado: propuesta, sin ejecutar. Escrito el 2026-09-14 por Opus a peticion de
Gabino, para que lo revise y lo ejecute Fable en una sesion dedicada.

## Por que

"Dungeon Master" ata el motor a fantasia. El eje agnostico de setting es del
proyecto desde el dia uno (docs/02, cuatro ejes), y las entregas 8 (packs de
usuario) y los packs propios planeados incluyen generos donde "mazmorra" no
significa nada: ciencia ficcion, misterio, terror, historico. "Game Master" es
el termino estandar de la industria fuera de D&D y no cambia las siglas en los
sitios donde el cambio costaria una migracion.

Vocabulario resultante, sin ambiguedad:

- **GM**: la IA que narra. Nunca una persona en V1.
- **anfitrion** (`host` en la API desde el 2026-09-12): la persona que crea la
  mesa, invita, abre y cierra sesiones y fuerza cierres. Tambien juega.
- **jugador**: quien tiene personaje en la mesa.

## Alcance medido (2026-09-14)

414 menciones de `DM` como palabra suelta, repartidas asi:

| Zona | Menciones | Naturaleza |
|---|---|---|
| `packages/` | 132 | tipos, clases, constantes, prompts, tests |
| `apps/` | 86 | componentes, textos de UI, variables de entorno |
| `docs/` | 91 | prosa y un nombre de archivo |
| `tools/` | 1 | script |
| `rpg-ngn-api` | 104 | servicio, comando, config, rutas, tests |

## Lo que SI se renombra

### 1. Tipos y clases (`packages/narrative`)

`DMProvider` a `GMProvider`, `DMOutput` a `GMOutput`, `DMProbe` a `GMProbe`,
`DMTurnContext` a `GMTurnContext`, `DMProviderError` a `GMProviderError`,
`ModelDMProvider` a `ModelGMProvider`, `ModelDMOptions` a `ModelGMOptions`,
`ScriptedDMProvider` a `ScriptedGMProvider`. Exportados desde `index.ts`; los
consumen `apps/engine` y los tests. Renombre puro, sin cambio de forma.

### 2. Constantes de prompt (`packages/narrative/src/prompt.ts`)

`DM_SYSTEM_PROMPT` a `GM_SYSTEM_PROMPT`, `DM_SYSTEM_PROMPT_COMPACT` a
`GM_SYSTEM_PROMPT_COMPACT`. **Ademas el texto del prompt cambia**: hoy dice
"Eres el Director de Juego (DM)"; pasa a "Eres el Game Master (GM)". Esto
cambia lo que narra el modelo, asi que revisar `prompt.test.ts` y correr un
turno real antes de dar por buena la entrega.

### 3. Variables de entorno

`DM_PROVIDER` a `GM_PROVIDER` y `DM_LINT` a `GM_LINT`. Tocar:

- `apps/engine/src/main.ts` y `resolve.ts` (lectura y mensaje de error).
- `apps/engine/.env` y `.env.example` (local, no versionado el primero).
- `rpg-ngn-api/config/engine.php`, `app/Services/DmProvider.php`, `.env` y
  `.env.example`, `phpunit.xml` (fija `DM_PROVIDER=scripted` para los tests).
- `RUNBOOK.md` seccion 3a.

**Compatibilidad**: leer `GM_PROVIDER ?? DM_PROVIDER` durante una version, con
aviso en el log si llega el viejo. Evita que un `.env` sin actualizar deje una
mesa sin GM en plena partida.

### 4. API Laravel (`rpg-ngn-api`)

- `App\Services\DmProvider` a `GmProvider` (clase y archivo).
- Comando `dm:probe` a `gm:probe` (`App\Console\Commands\DmProbe` a `GmProbe`).
  Mantener `dm:probe` como alias oculto una version.
- Rutas `GET /api/v1/dm/presets` a `/api/v1/gm/presets` y
  `POST /api/v1/tables/{t}/dm/probe` a `.../gm/probe`. **Romper la ruta rompe
  clientes desplegados**: publicar las dos y borrar la vieja cuando web y movil
  esten actualizadas (o el mismo dia, si nadie mas consume la API; hoy es el
  caso, pero dejarlo escrito).
- Tests: `TurnFlowTest`, `TablesTest` y los de presets nombran la ruta.

### 5. Cliente y UI

- `packages/api-client`: `DmPreset` a `GmPreset`, `DmProbeResult` a
  `GmProbeResult`, `listDmPresets` a `listGmPresets`, `probeDm` a `probeGm`.
- `packages/ui-logic`: `dm-presets.ts` a `gm-presets.ts` y sus tipos.
- `apps/web`: `DmSettingsPanel` a `GmSettingsPanel`, pestaña "DM" a "GM",
  textos ("El DM esta narrando..." a "El GM esta narrando...").
- `apps/mobile`: panel equivalente y los mismos textos.

### 6. Textos visibles al usuario

Barrido por acentos y frase natural (memoria: el texto que lee un jugador
lleva tildes). Los conocidos hoy:

- "El DM esta narrando..." / "El DM narra"
- "El DM tuvo un problema y el turno se reabrio"
- "Cuando algo tenga riesgo, tiras un d20. El DM interpreta el resultado"
- "Nota de la sesion; el DM la recibe" / "Momento del mundo...; el DM la recibe"
- "Despues podras probar el DM e invitar a tus amigos"
- "El proveedor del director de juego (...) se elige por mesa, ... pestaña DM"
- "Las sesiones jugadas, las fichas y las reglas del pack, sin servidor ni DM"
- Los cinco bloques de sistema de `model-dm.ts`, `scripted.ts` y `TurnService`.

### 7. Documentacion

`docs/03-dm-contract.md` a `docs/03-gm-contract.md` (renombre de archivo y
todos los enlaces que lo citan: `docs/02`, `docs/06`, `docs/11`, `CLAUDE.md`,
`README.md`). Prosa de `docs/00`, `01`, `02`, `04`, `05`, `06`, `08`, `09`,
`10`, `11`, `README.md`, `ROADMAP.md`, `RUNBOOK.md` y los README de
`packages/narrative`, `apps/engine`, `apps/web`, `apps/mobile`.

Los documentos historicos (`docs/10-audit-2026-09-05.md`, actas de auditoria)
se dejan como estan: son registro de lo que se dijo ese dia. Solo se les añade
una nota al inicio: "DM en este documento es el GM actual (renombrado el
2026-09-XX)".

### 8. Nombres de archivo

`packages/narrative/src/model-dm.ts` a `model-gm.ts` (y su test),
`apps/web/src/components/DmSettingsPanel.tsx` a `GmSettingsPanel.tsx`,
`rpg-ngn-api/app/Services/DmProvider.php` a `GmProvider.php`,
`app/Console/Commands/DmProbe.php` a `GmProbe.php`. Usar `git mv` para
conservar el historial.

## Lo que NO se renombra

### La capa de visibilidad `dm` de los eventos

`KnowledgeLayer = ['canon', 'campaign', 'player', 'dm']` en
`packages/content/src/event.ts`. Es un **valor guardado en datos**: 20 eventos
en Postgres y el log del piloto (`campaigns/pilot/events.jsonl`), que por regla
del repo no se edita a mano (solo eventos `correction`, o el upcast de BA1).

Cambiarlo exige subir `EVENT_SCHEMA_VERSION`, escribir un `upcast` que traduzca
`dm` a `gm` al leer, y migrar las filas de `campaign_events`. Es la via correcta
y esta disponible, pero es una entrega en si misma.

**Decision**: se queda como `dm` hasta que haya otra razon para subir la version
del esquema de eventos, y entonces se migra en el mismo viaje. Mientras tanto,
documentarlo en `docs/08`: "la capa `dm` conserva el nombre historico; es la
capa del GM".

Lo mismo aplica a `dm/` (carpeta gitignored de notas humanas de Gabino): es
suya, no la toca el codigo.

## Riesgos

1. **Cambiar el prompt cambia la narracion.** No es un renombre invisible: el
   modelo lee "Eres el Game Master". Correr un turno real contra Anthropic en
   una mesa desechable y leerlo antes de cerrar la entrega.
2. **Rutas y comando.** Si se renombran sin alias, una web vieja en el navegador
   de alguien deja de poder probar el proveedor. Publicar ambas un ciclo.
3. **Variables de entorno.** El `.env` real no esta versionado: si se renombra
   la variable y no el archivo local, la API se queda sin preset y las mesas
   fallan al cerrar turno. De ahi el fallback `GM_ ?? DM_`.
4. **Confusion GM y anfitrion.** Al revisar textos, comprobar que ninguno use
   "GM" para la persona. GM es siempre la IA.
5. **Merge con `legacy`.** Esa rama tiene la campaña viva y menciona DM en sus
   sesiones; el renombre no debe tocar `content/packs/pilot/sessions/*` ni el
   log. Resolver el conflicto a favor de `legacy` en esos archivos.

## Orden de ejecucion sugerido

1. `packages/content` y `packages/campaign`: nada que tocar salvo comentarios.
2. `packages/narrative`: tipos, clases, constantes, prompt, archivos. Tests en
   verde antes de seguir.
3. `packages/engine-contract` y `apps/engine`: variables de entorno con
   fallback, mensajes.
4. `rpg-ngn-api`: servicio, comando con alias, rutas dobles, config, tests.
5. `packages/api-client` y `packages/ui-logic`.
6. `apps/web` y `apps/mobile`: componentes y textos.
7. Docs, README, ROADMAP, RUNBOOK; renombre de `docs/03`.
8. `pnpm check`, `composer test`, un turno real, y recien entonces quitar los
   alias si se decide.

## Criterio de hecho

- `pnpm check` y `composer test` en verde.
- `grep -rni "\bdm\b"` fuera de `dm/`, `docs/10`, la capa de eventos y los
  alias de compatibilidad no devuelve nada.
- Un turno real narrado por el GM, leido y aprobado por Gabino.
- `RUNBOOK.md` levanta los servicios con las variables nuevas sin tocar nada mas.
