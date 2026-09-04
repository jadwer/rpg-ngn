# Arquitectura

## Vista general

```
                 content/packs/*          (datos versionados, Git)
                        |
        +---------------+----------------+
        |                                |
  packages/content              packages/campaign
  (schemas + loader)            (estado vivo, capas de conocimiento)
        |                                |
        +---------------+----------------+
                        |
                 packages/rules          (rulesets: como funciona cada juego)
                        |
                 packages/core           (primitivas deterministas)
                        |
                 packages/narrative      (DM: contexto controlado + DMProvider)
                        |
            +-----------+-----------+
            |           |           |
        adapter     adapter     adapter
       anthropic    openai       local
                        |
            +-----------+-----------+
            |                       |
       apps/* (web, harness)   futura API -> Expo
```

## Packages

- **core**: primitivas deterministas, sin asumir ningun sistema de juego. Dados (con RNG inyectable para tests y tiradas verificables), checks, modificadores, recursos, acciones, efectos, estado y eventos. Sin I/O, sin dependencia de contenido. Core no sabe que es "combate", ni "HP", ni "spell slot".
- **rules**: rulesets que componen las primitivas de core en un juego concreto. Un ruleset define que recursos existen (HP y AC en un d20 fantasy; elementos y energia en otro sistema), que acciones son posibles y como se resuelven. El primero es `fantasy-d20-lite` (el del piloto).
- **content**: schemas zod de todas las entidades canonicas y el loader/validador de content packs. Es el contrato entre los datos y todo lo demas.
- **campaign**: estado vivo. Aplica eventos validados, mantiene las capas de conocimiento, produce snapshots del estado. Persistencia inicial en archivos JSON; la interfaz de persistencia permite cambiar a DB sin tocar la logica.
- **narrative**: el DM. Se descompone en context builder (arma el [contexto narrativo](04-narrative-context.md)), prompt policy (tono, restricciones, presupuesto narrativo), provider adapter (`DMProvider`) y response interpreter (convierte la salida del modelo en propuestas verificables). Expone el [contrato de herramientas](03-dm-contract.md).

## El modelo propone, el engine dispone

El LLM nunca es dueno del estado. El flujo de una accion:

```
Jugador: "Ataco al guardia"
   -> narrative: interpreta la accion, la convierte en propuesta
   -> rules:     resuelve la propuesta (que tirada aplica, contra que)
   -> core:      roll d20 = 17 (registrado, inmutable)
   -> campaign:  aplica el efecto validado (HP guardia 12 -> 5)
   -> narrative: narra sobre el estado resultante
```

Pedirle al modelo que recuerde que el guardia tenia 12 HP es exactamente el bug que este motor existe para evitar.

## DMProvider

```ts
interface DMProvider {
  narrate(input: {
    context: NarrativeContext;   // solo lo que el DM puede usar
    action: PlayerAction;
    tools: DMToolset;            // roll_dice, get_npc, record_event...
  }): AsyncIterable<DMOutput>;   // streaming de narrativa + tool calls
}
```

Los adapters (anthropic, openai, local para tests) implementan esta interfaz. Permite: blind test de modelos con la misma escena, modelo por tarea (narrador caro, clasificador barato) y negociar costos sin reescribir el motor.

## Decisiones y sus porques

| Decision | Razon | Costo aceptado |
|---|---|---|
| TypeScript puro | Un solo motor importable desde Next, Expo y Node; SDKs de LLM first-class | No se reusa api-base (Laravel) en el motor |
| Contenido en Git, no en DB | Historial, review de cambios de lore, cero infra | Sin edicion concurrente de contenido |
| Local-first | No sabemos aun que merece ser servidor | Multijugador en tiempo real queda para fase 5 |
| Tiradas fuera del modelo | El DM jamas inventa un numero; toda tirada queda registrada | Mas tool calls por turno |
| Repo publico | GitHub Pages gratis, raw JSON accesible | Los secretos del DM viven fuera del repo (`dm/`, gitignored) |

## Clientes

- **apps/sheets** (existe): visor estatico de fichas, GitHub Pages, cero build. Lee los JSON del content pack por fetch relativo.
- **DM harness** (fase 3): web minima para jugar por texto contra el DM y evaluar proveedores.
- **Web de jugador y Expo** (fase 4): consumen los mismos packages; Expo llega cuando sepamos que necesita realmente el jugador en la mesa.
