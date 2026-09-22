# Modelo de eventos, conocimiento y descubrimiento

El corazon tecnico del motor. La campana no es un estado: es una secuencia de hechos. El estado (mundo, personajes, conocimiento) es siempre una consecuencia derivada de esa secuencia.

Esto es event sourcing pragmatico: el log de eventos es la fuente de verdad y la historia oficial de la campana; los estados son proyecciones reconstruibles, con snapshots para lectura barata. Pragmatico porque no adoptamos la liturgia completa (no hay CQRS, no hay bus, no hay replay distribuido); a escala de una mesa, un archivo append-only por campana es suficiente.

## El evento

```json
{
  "id": "evt-00142",
  "v": 1,
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

- `v`: version del schema de ese tipo de evento (BA1 de [10](10-audit-2026-09-05.md)). El log es inmutable, asi que un cambio de forma no migra el archivo: `packages/content` expone `upcastEvent`, una cadena de funciones puras por version con fixture del evento viejo real. Los eventos del piloto anteriores a este campo se migraron una sola vez a `v: 1` con `tools/migrate-pilot`.
- `recordedAtPrecision`: `session` cuando el instante se completo con el inicio de la sesion durante esa migracion; ausente (exacto) en todo evento nuevo.
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
| Conocimiento | `discovery`, `rumor_heard`, `secret_revealed` | Cruces entre capas de conocimiento |
| Narrativa | `scene_started`, `scene_closed`, `narration` | Estructura y texto del DM |
| Meta | `session_started`, `session_closed`, `correction` | Fronteras y compensaciones |

`correction` es la respuesta a la regla 16: si un evento registro algo mal (error humano o del DM), no se edita; se agrega una correccion que lo referencia y describe el hecho corregido. Las proyecciones aplican la correccion; el historial conserva ambos.

## Ubicacion: donde esta cada personaje

`CharacterState.location` guarda el id de un lugar del pack, o `null` cuando
el personaje va de camino o salio de escena. Lo mueve el efecto `move` de un
`state_change`:

```json
{"op": "move", "who": "character:zahira", "to": "comedor"}
{"op": "move", "who": "character:calder", "to": null}
```

Tres decisiones y su motivo:

- **Vive en `CharacterState`, no en `custom`**: estar en el comedor no
  depende del sistema de juego. Un personaje esta en un sitio tanto en una
  intriga de corte como en una mina.
- **Lo aplica el reductor comun**, no cada ruleset, por lo mismo.
- **`null` es informacion, no ausencia de dato**: es lo que se ve de quien
  "salio a explorar" y todavia no ha llegado.

El campo es opcional en el tipo para que los snapshots anteriores sigan
siendo validos.

**Donde arranca la party.** Al abrir sesion nadie tiene ubicacion todavia, asi
que sin mas el mapa de la mesa sale vacio de gente durante toda la primera
escena y el DM es el unico que puede arreglarlo. Para evitarlo, la sesion del
pack declara `startLocation` (docs/05) y el engine emite un `world_event` con
un `move` por cada personaje de la party **que no tenga ya ubicacion**:

```json
{"type": "world_event", "location": "salon-grande",
 "payload": {"note": "La sesion arranca en el Salon Grande."},
 "effects": [{"op": "move", "who": "character:camille", "to": "salon-grande"}]}
```

Dos consecuencias buscadas: queda **en el log** como cualquier otro hecho del
mundo (no es estado inventado por el cliente), y al respetar a quien ya tiene
ubicacion, reabrir una sesion no teletransporta a nadie de vuelta a la entrada.
Un pack sin `startLocation` se comporta como antes.

Lo mismo se hizo con dos efectos mas que tampoco dependen del ruleset:
`relationship` (como trata un NPC a un personaje, de -5 a 5, en
`custom.relationships` del NPC) y `condition` cuando el sujeto es un NPC (en
`custom.conditions`). Los tres se aplican antes de pasar el efecto al
ruleset.

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
- **NarrativeState**: la escena en curso, la tension activa, los hilos abiertos y la informacion preparada para emerger. Se deriva de los eventos narrativos y de los cabos sueltos registrados al cierre de cada sesion (ver [04-narrative-context.md](04-narrative-context.md)).
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

## Secretos del pack y `secret_revealed`

La capa `dm` del pack ([05](05-content-pack-spec.md), `secrets/`) da al motor una lista finita de hechos con marcadores. Con eso el punto 3 deja de ser una promesa y se implementa en dos piezas:

**Proyeccion** (`packages/campaign`, `knowledge.ts`). Un secreto queda revelado a un personaje cuando un evento visible para el cumple su `revealWhen`, o cuando un `secret_revealed` lo tiene de testigo. "Visible" son los testigos declarados, los destinatarios de un `discovery` y de `knowledgeGranted`; un evento sin testigos y sin capa `dm` se considera oido por la party de su sesion (asi se escribieron los logs del piloto). La capa `dm` no la ve nadie. El reductor escribe `knowledge[<pc>].secrets[<id>] = { event, seq, how }` solo cuando hay alguno, para que los snapshots anteriores no cambien de forma.

```json
{
  "type": "secret_revealed",
  "visibility": { "layer": "campaign", "witnesses": ["character:zahira", "character:calder"] },
  "payload": { "secretId": "osric-esta-abajo", "how": "lo encuentran en el tercer nivel" }
}
```

Es un tipo nuevo con `v: 1`; no cambia la forma de ningun tipo existente, asi que `EVENT_SCHEMA_VERSION` sigue en 1 y no hay upcast. Los testigos son obligatorios (sin testigos no revela nada) y `secretId` debe existir en el pack. El DM con modelo puede proponerlo cuando la escena revela un secreto de verdad; el engine lo valida y el reductor lo proyecta.

**Lint** (`packages/narrative`, `lint.ts`). Al narrar, cada bloque `narration` o `dialogue` y la nota de cada `world_event` se comparan con lo que saben los receptores (la party presente):

- `error`: aparece una keyword de un secreto que algun receptor no conoce. En modo `enforce` el bloque se sustituye por un aviso `system` ("El DM revisó su narración...") y no entra a la cronica; el motivo (secreto, keyword, receptores) va en `result.lint` del turno y al log del engine. Un `secret_revealed` emitido antes en el mismo turno lo autoriza.
- `warning`: se nombra una entidad del pack (NPC, lugar, mision) que la mesa no ha presenciado. Solo se reporta.

Lo que un jugador declaro este turno, la cronica publica y los datos publicos de sesion (briefing, recap, hilos abiertos) cuentan como oido por la mesa: el DM puede repetir lo que los jugadores ya saben. El lint no entiende prosa; si el modelo parafrasea un secreto sin usar sus marcadores, pasa. Modos por turno (`lint` en `ResolveTurnRequest`) o por engine (`DM_LINT`): `enforce`, `report`, `off`.

## Almacenamiento (fase local-first)

- `campaigns/<id>/events.jsonl`: un evento por linea, append-only.
- `campaigns/<id>/snapshots/<sesion>.json`: proyecciones al cierre de cada sesion.
- Git versiona ambos: el commit posterior a cada sesion es la frontera natural.

Cuando exista servidor (fase 5), el log migra a una tabla append-only y las proyecciones a lecturas materializadas; el modelo no cambia, solo el soporte.
