# Modelo de eventos, conocimiento y descubrimiento

El corazon tecnico del motor. La campana no es un estado: es una secuencia de hechos. El estado (mundo, personajes, conocimiento) es siempre una consecuencia derivada de esa secuencia.

Esto es event sourcing pragmatico: el log de eventos es la fuente de verdad y la historia oficial de la campana; los estados son proyecciones reconstruibles, con snapshots para lectura barata. Pragmatico porque no adoptamos la liturgia completa (no hay CQRS, no hay bus, no hay replay distribuido); a escala de una mesa, un archivo append-only por campana es suficiente.

## El evento

```json
{
  "id": "evt-00142",
  "seq": 142,
  "recordedAt": "2026-09-05T21:14:03Z",
  "worldTime": "23 de Lumina 742, anochecer",
  "sessionId": "001",
  "type": "npc_interaction",
  "actor": "character:talin",
  "targets": ["npc:posadera-mera"],
  "location": "valdoria.farol-torcido",
  "declared": "Le pregunto a la posadera desde cuando trabaja aqui",
  "resolved": {
    "action": "asked_about_history",
    "rollRefs": ["roll-0037"],
    "outcome": "partial_success"
  },
  "effects": [
    { "op": "relationship", "a": "character:talin", "b": "npc:posadera-mera", "delta": "curiosidad mutua" }
  ],
  "visibility": {
    "layer": "campaign",
    "witnesses": ["character:talin", "character:kael"]
  },
  "knowledgeGranted": [
    { "to": "character:talin", "fact": "fact:posadera-llego-hace-un-anio", "confidence": "uncertain", "how": "se lo dijo ella; podria mentir" }
  ]
}
```

Campos clave:

- `seq`: orden total dentro de la campana. La secuencia es la historia.
- `declared` vs `resolved`: la accion textual del jugador y su interpretacion viven separadas (regla 18 del contrato). El interprete propone `resolved`; nunca ejecuta mas de lo declarado.
- `effects`: parches de estado validados por el ruleset. Un evento sin `effects` es narrativo puro.
- `visibility.witnesses`: quien estuvo ahi. Alimenta la proyeccion de conocimiento por personaje.
- `knowledgeGranted`: la unica via por la que informacion cruza hacia un jugador.
- `rollRefs`: toda tirada citada existe como evento `roll` previo e inmutable.

## Tipos de evento (v0)

| Categoria | Tipos | Nota |
|---|---|---|
| Accion | `player_action`, `npc_action`, `world_event` | Lo que alguien intenta o el mundo hace |
| Resolucion | `roll` | Inmutable; RNG registrado con semilla o fuente |
| Efecto | `state_change`, `quest_update`, `inventory_change`, `relationship_change` | Siempre producidos por una resolucion o decision valida |
| Conocimiento | `discovery`, `rumor_heard` | Cruces entre capas de conocimiento |
| Narrativa | `scene_started`, `scene_closed`, `narration` | Estructura y texto del DM |
| Meta | `session_started`, `session_closed`, `correction` | Fronteras y compensaciones |

`correction` es la respuesta a la regla 16: si un evento registro algo mal (error humano o del DM), no se edita; se agrega una correccion que lo referencia y describe el hecho corregido. Las proyecciones aplican la correccion; el historial conserva ambos.

## Proyecciones

```
                    events.jsonl  (append-only, fuente de verdad)
                         |
      +------------------+---------------------+
      |                  |                     |
  WorldState      PlayerKnowledge(pc)    SessionLog
  reduce(effects) reduce(witnesses +     reduce(narrativa
                  knowledgeGranted)      por sesion)
      |                  |                     |
      +------------------+---------------------+
                         |
                  NarrativeContext (por turno, ver 04-narrative-context.md)
```

- **WorldState**: HP, inventarios, quests, relaciones, posiciones. Se reconstruye aplicando `effects` en orden de `seq`.
- **PlayerKnowledge(pc)**: todo lo presenciado por ese personaje mas lo otorgado via `knowledgeGranted`. Es una proyeccion por personaje, no por mesa: dos jugadores en la misma campana pueden saber cosas distintas.
- **Snapshots**: al cerrar cada sesion se persiste un snapshot de ambas proyecciones. Reabrir una campana de 30 sesiones no requiere replay completo.

Asi se cumplen a la vez "el mundo recuerda" (regla 3) y "el jugador solo sabe lo que descubrio" (reglas 2 y 14).

## Conocimiento y estados epistemicos

Un hecho conocido no es booleano. Cada asercion de conocimiento lleva confianza (regla 17):

| Estado | Significado | Comportamiento del DM |
|---|---|---|
| `known` | Registrado en canon, campaign canon o presenciado | Puede afirmarse |
| `uncertain` | Obtenido de fuente falible (rumor, NPC que puede mentir) | Se narra con la duda incorporada |
| `conflicting` | Dos fuentes registradas se contradicen | El conflicto es material narrativo, no se resuelve en silencio |
| `unknown` | No hay registro | El DM no rellena; puede responder "no hay informacion" y registrar el hueco |

Los huecos registrados (`unknown` consultados) son ademas la lista de trabajo del contenido: dicen exactamente que le falta al content pack, descubierto jugando y no especulando.

## Discovery

`discovery` es el unico puente entre DM knowledge y player knowledge:

```json
{
  "type": "discovery",
  "targets": ["character:calder"],
  "payload": {
    "fact": "fact:libro-huespedes-fechado-hace-nueve-dias",
    "confidence": "known",
    "sourceEvent": "evt-00139",
    "method": "examino el libro y comparo la tinta"
  }
}
```

Invariantes:

1. Ningun `knowledgeGranted` puede referir un `fact` de DM knowledge sin un evento `discovery` que lo respalde.
2. Todo `discovery` referencia el evento que lo causo (`sourceEvent`): los secretos no se filtran, se ganan.
3. Revelar en narrativa algo sin su `discovery` correspondiente es una violacion del contrato detectable automaticamente: se puede lintear la salida del DM contra la proyeccion de conocimiento del receptor.

Ese punto 3 es la promesa central del modelo: el cumplimiento del contrato de realidad deja de ser una esperanza sobre el comportamiento del LLM y se vuelve verificable por software.

## Almacenamiento (fase local-first)

- `campaigns/<id>/events.jsonl`: un evento por linea, append-only.
- `campaigns/<id>/snapshots/<sesion>.json`: proyecciones al cierre de cada sesion.
- Git versiona ambos: el commit posterior a cada sesion es la frontera natural.

Cuando exista servidor (fase 5), el log migra a una tabla append-only y las proyecciones a lecturas materializadas; el modelo no cambia, solo el soporte.
