# @rpg-ngn/campaign

Estado vivo de campaña como proyeccion del log (docs/08). `reduce(events, {pack, ruleset})` es una funcion pura: el mismo log, el mismo pack y el mismo ruleset dan siempre el mismo estado, y `stableStringify` lo hace comparable byte a byte.

| Modulo | Contenido |
|---|---|
| `state` | `CampaignState`: `meta` (pack, ruleset, sesiones, cabeza del log), `world` (de core), `knowledge` por personaje, `narrative` |
| `reduce` | `reduce`, `applyEvent`, `initialState`. El ruleset entra como parametro (BA2) |
| `projections` | `worldProjection`, `playerProjection(characterId)`, `narrativeProjection`: lo que sirve la API, nunca el log crudo |
| `snapshot` | `takeSnapshot` al cierre de sesion, `serializeSnapshot`, `diffSnapshot` para detectar divergencia de ruleset |

## Fixture de regresion

`campaigns/pilot/snapshots/002.json` es el estado canonico al cierre de la sesion 002 con `fantasy-d20-lite@1.0.0`. El test lo compara byte a byte con el replay. Si cambia el reductor o el ruleset y el snapshot diverge, gana el snapshot: o el cambio es un bug, o es deliberado y se regenera con `pnpm --filter @rpg-ngn/campaign snapshot:pilot` en un commit que explique por que.

Sin I/O en `src/`; `scripts/` y los tests usan fs porque viven fuera del build.
