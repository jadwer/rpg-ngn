# @rpg-ngn/content

Schemas zod de content packs y del log de eventos, loader con verificacion de referencias, y upcasting de eventos. Es el contrato entre los datos (`content/`, `campaigns/`) y todo lo demas.

Sin I/O: recibe un `FileSource` (`readText`, `exists`, `list`) y quien lo llama lo implementa con fs, fetch o un zip. `tools/validate` trae la version sobre fs.

## Que exporta

| Modulo | Contenido |
|---|---|
| `character`, `npc`, `location`, `quest`, `session`, `pack` | Schemas de entidades del pack (docs/05), todos `strictObject` |
| `secret` | Capa `dm` del pack: `Secret` con `keywords` y `revealWhen` (por evento o manual); nunca llega a una proyeccion de jugador |
| `event` | `CampaignEvent` (union discriminada por `type`, incluye `secret_revealed`), `EventEnvelope`, `EVENT_SCHEMA_VERSION` |
| `upcast` | `upcastEvent(raw, ctx)`: lleva un evento viejo a la version vigente (BA1) |
| `loader` | `loadPack(source)`: pack tipado mas lista de `Issue` |
| `campaign-log` | `parseEventLog(text, {pack})`: eventos tipados mas `Issue`; `formatEventLog` |

## Version de schema del evento

Cada evento lleva `v` e `id`. La version vigente es 1. Un evento sin `v` es v0 (los del piloto antes de la migracion) y `upcastEvent` lo convierte al leerlo; el log nunca se edita. Cuando cambie la forma de un tipo se incrementa `EVENT_SCHEMA_VERSION`, se agrega el paso `steps[1]` en `upcast.ts` y un fixture real del evento viejo en `upcast.test.ts`.

## Tests

```bash
pnpm --filter @rpg-ngn/content test
```

Los tests usan los fixtures reales del repo: `content/packs/pilot` y `campaigns/pilot/events.jsonl`. Si cambias el pack o el log y un test falla, el test tiene razon hasta que se demuestre lo contrario.
