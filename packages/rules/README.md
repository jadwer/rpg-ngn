# @rpg-ngn/rules

Rulesets: como se combinan las primitivas de core en un juego concreto. El reductor de `@rpg-ngn/campaign` recibe el ruleset como parametro y registra `id@version` en cada snapshot (BA2): reproyectar con otra version es otra decision, no un accidente.

`Ruleset` define: estado inicial de un personaje desde su ficha, modificador de caracteristica, tier de Fortuna y `applyEffect`. Un `op` que el ruleset no conoce lanza `UnknownEffectError`; nunca se ignora.

## fantasy-d20-lite 1.0.0

El del piloto. Ops de effect: `memory_recovered`, `gain`, `lose`, `hp`, `condition`. La tabla de Fortuna es la publicada en las sesiones del pack (abierta: el jugador ve el tier, docs/09).

El segundo ruleset real es el que valida el eje "agnostico de sistema" (docs/00). Hasta entonces la interfaz se mantiene minima a proposito.
