# @rpg-ngn/narrative

El DM. `DMProvider` recibe el contexto del turno y produce un flujo de bloques (lo que la mesa ve), eventos propuestos (lo que el engine valida y aplica) y la lista de personajes interpelados (los que cierran el siguiente turno).

En la entrega 5 solo existe `ScriptedDMProvider`: determinista y sin modelo, convierte cada respuesta en un bloque de dialogo y un `player_action`, cierra con una narracion y devuelve la palabra a toda la party. Sirve para probar el circuito completo de turnos sin gastar un token.

La entrega 6 agrega el context builder de cuatro capas (docs/04) mas la capa `dm` con los secretos del pack, la politica de prompt (contrato de realidad, agencia del jugador, secretos), los adapters de Anthropic y OpenAI, y el lint de conocimiento (`lint.ts`, docs/08 invariante 3): cada bloque se compara con lo que saben los receptores y el que cuenta un secreto no revelado se sustituye por un aviso `system`; los hallazgos salen como `{ kind: 'lint' }` y el engine los acumula en `result.lint`. El contrato de salida no cambia.

Regla que ya aplica: el proveedor nunca escribe estado. Propone eventos; el engine les pone `id`, `seq` y `recordedAt`, los valida con `CampaignEvent` y los aplica con el ruleset. Si uno falla, el turno falla entero y la plataforma lo reabre.
