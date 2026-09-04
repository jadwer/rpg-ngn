# Contrato del DM

Conjunto de herramientas que el motor expone al LLM. Primero son funciones TypeScript; MCP es un transporte posible despues, no el punto de partida.

Regla general: el DM narra, las herramientas deciden. Todo numero, todo hecho consultado y todo cambio de estado pasa por una herramienta y queda registrado.

## Lectura

| Herramienta | Devuelve |
|---|---|
| `get_character(id)` | Ficha completa del personaje (solo para uso interno del DM) |
| `get_npc(id)` | Ficha del NPC: objetivos, conocimiento, relaciones |
| `get_location(id)` | Ficha del lugar, incluyendo la vista de recien llegado |
| `search_lore(query)` | Busqueda sobre el content pack |
| `get_active_quests()` | Misiones activas con objetivos y progreso |
| `get_campaign_history(filter)` | Eventos previos, filtrables por sesion, lugar o personaje |
| `get_player_knowledge(characterId)` | Que sabe ese personaje (para no revelar de mas) |

## Azar

| Herramienta | Comportamiento |
|---|---|
| `roll_dice(spec, context)` | Tira (ej. `1d20+3`), registra el Roll inmutable y devuelve el resultado. El DM jamas modifica ni inventa una tirada. Si sale 1, es 1 |

## Escritura

| Herramienta | Efecto |
|---|---|
| `update_character(id, patch)` | HP, XP, condiciones |
| `update_inventory(id, changes)` | Objetos y dinero |
| `update_quest(id, patch)` | Progreso, cierre, fallo |
| `update_relationship(a, b, patch)` | Relaciones entre personajes y NPCs |
| `record_event(event)` | Registra un hecho con su capa de visibilidad y testigos |
| `record_discovery(characterId, fact)` | Promueve informacion de DM knowledge a player knowledge |

## Invariantes

1. Ninguna escritura ocurre fuera de estas herramientas; la narrativa que contradiga el estado registrado es un bug del DM, no un cambio de estado.
2. `record_discovery` es la unica via por la que un jugador aprende un secreto.
3. Toda tirada referenciada en la narrativa debe existir como Roll registrado.
4. Las herramientas validan contra los schemas de `packages/content`; el DM no puede inventar entidades que no existen en el pack ni en el campaign canon.
