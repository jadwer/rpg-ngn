# @rpg-ngn/core

Primitivas deterministas del motor. Sin I/O, sin dependencia de plataforma, sin conocer ningun sistema de juego: core no sabe que es "HP" ni "combate", solo recursos acotados, dados y un estado del mundo con forma.

| Modulo | Contenido |
|---|---|
| `random` | `RandomSource` inyectable: `seededRandom` (replay y tests), `recordedRandom` (dados fisicos tecleados por el DM), `webCryptoRandom` (produccion) |
| `dice` | `parseDice`, `rollDice`, `rollD20` con ventaja y desventaja |
| `resource` | `Resource {current, max}` con `spend`, `restore`, `adjust` |
| `state` | `WorldState`, `CharacterState`, `NpcState` y helpers inmutables |
| `serialize` | `stableStringify`: JSON con claves ordenadas, lo que hace comparables los snapshots |

Cobertura exigida: 100% (`pnpm --filter @rpg-ngn/core test`).
