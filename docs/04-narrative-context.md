# Contexto narrativo

El motor nunca le da al modelo "estamos en Valdoria" y libertad creativa. Cada turno del DM recibe un contexto construido, acotado y auditable.

## Las cuatro capas de conocimiento

| Capa | Contenido | Quien la ve |
|---|---|---|
| Canon | Lo cierto en el mundo del content pack | Motor y DM |
| Campaign canon | Lo ocurrido en esta campana | Motor y DM |
| Player knowledge | Lo que cada personaje sabe (por personaje) | Motor, DM y ese jugador |
| DM knowledge | Secretos, tramas, identidades ocultas | Motor y DM, jamas la narrativa sin `record_discovery` |

La distincion critica es entre "esto existe en el lore" y "mi personaje sabe que esto existe". El DM recibe ambas y tiene prohibido narrar la primera como si fuera la segunda.

## Estructura del NarrativeContext

```
NarrativeContext
├── world
│   ├── era / fecha del mundo
│   ├── region y location actual
│   ├── clima y hora
│   └── eventos conocidos publicamente
├── party
│   └── por personaje presente: ficha resumida, estado, objetivos, fortuna
├── knownNpcs            (solo NPCs que la party ya conocio)
├── activeQuests         (vista del jugador, no la resolucion)
├── recentEvents         (ultimos N eventos visibles para la party)
├── playerKnowledge      (que sabe cada personaje, para dosificar informacion)
├── secretState          (DM knowledge relevante a la escena, marcado como NO revelable)
└── constraints
    ├── tono de la campana
    ├── limites de contenido acordados en session 0
    ├── restricciones de escena (ej. "no revelar identidad de X hasta interaccion valida")
    └── presupuesto narrativo (longitud, terminar en pregunta a los jugadores)
```

## World State y Narrative State

Son dos cosas distintas y el contexto las separa (Issue #1, punto 5):

- **World State**: lo objetivamente cierto en el mundo. HP, posiciones, inventarios, relaciones, hechos. Es la proyeccion de los `effects` del log de eventos.
- **Narrative State**: la escena en curso. Que tension esta activa, que hilos quedaron abiertos, que informacion esta preparada para emerger y bajo que condicion. Se deriva de los eventos narrativos (`scene_started`, `narration`, cabos de sesiones previas) mas las restricciones de escena.

La distincion existe para atacar el peligro central de un LLM como DM: confundir "lo se" con "debo contarselo al jugador". El World State completo esta disponible para resolver mecanica; a la narrativa solo entra lo que el Narrative State marca como emergible. En la estructura de arriba, `world` y `party` son World State; `constraints` y `secretState` (con sus condiciones de revelacion) son la parte explicita del Narrative State.

## Reglas de construccion

1. El contexto se construye por escena, no por campana completa: entra lo relevante a la ubicacion, la party presente y las quests activas.
2. `secretState` incluye solo los secretos que la escena puede rozar, cada uno con su condicion de revelacion.
3. Los jugadores ausentes de la sesion se representan con su justificacion narrativa, no desaparecen.
4. El historial largo se compacta: resumenes de sesion en lugar de transcripciones.
5. Todo contexto enviado se registra, de modo que un fallo del DM sea reproducible y diagnosticable.
