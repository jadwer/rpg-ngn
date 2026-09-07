# @rpg-ngn/ui-logic

Logica de interfaz compartida entre `apps/mobile` y `apps/web`, sin React ni Expo (docs/11, D8; hallazgo menor de docs/10 sobre `packages/ui`). Lo que aqui vive se comparte al cien por cien; los componentes visuales se escriben en cada app.

| Modulo | Contenido |
|---|---|
| `blocks` | Bloques tipados de un turno (`narration`, `dialogue`, `roll`, `system`) y `speechTextOf`, lo que el TTS lee de cada uno |
| `narration` | `splitNarration`: prosa partida por parrafos y oraciones agrupadas hasta 320 caracteres, para leer bloque a bloque (limite de Android en docs/09) |
| `session-blocks` | `sessionBlocks({pack, session, state?, events?})`: los bloques de una sesion offline. Briefing como `system`, la party se presenta con su cita como `dialogue`, el recap como `narration`, tiradas y sucesos del log como `roll` y `system`, cabos sueltos, como se juega y tabla de Fortuna como `system`. Una sesion planeada solo muestra briefing, reglas, Fortuna y notas |
| `views` | `groupBlocks(blocks, mode)`: las vistas narrativa y dialogo son dos agrupaciones del mismo array; en dialogo la prosa va comprimida (`proseExcerpt`) |
| `veil` | Velado de fichas (IL2): en una sesion planeada con `availableCharacters`, quien nunca ha tenido dueño oculta `bio`, `goal`, `quote` y `abilities`. `sessionVisibility` nunca deja pasar `recap` ni `openThreads` de una sesion planeada. Misma regla que `apps/sheets` |
| `sheet` | `characterSheet(character, {visibility, state, modifier})`: modelo de vista de una ficha, ya velada y con HP, Fortuna, inventario y condiciones del estado reducido |
| `turn` | Turno online (docs/09, "Respuesta y cierre"): `blocksFromApi(envelopes, resolver)` convierte los bloques del contrato del engine (`@rpg-ngn/engine-contract`) que devuelve `GET /tables/{id}/state` en bloques de ui-logic, con retrato del pack via `packSpeakerResolver(pack)`; `turnProgress(turn, viewer)` decide quien falta, quien puede responder, cuando se puede cerrar y cuando solo el DM puede forzar; `turnStatusLine` es la frase de la barra |
| `tts` | `ttsReducer` (idle, speaking, paused, done) y `createTtsController(engine, items)` con `start`, `next`, `pause`, `resume`, `stop`. `SpeechEngine` se inyecta; si no ofrece `pause`/`resume` (Android), pausar detiene y reanudar salta al bloque siguiente |

## Tests

Los tests usan los fixtures reales del piloto (`content/packs/pilot`, `campaigns/pilot/events.jsonl`) reducidos con `fantasy-d20-lite`. `pilot.test-helpers.ts` es el unico archivo que toca `node:fs` y queda fuera del build.

```bash
pnpm --filter @rpg-ngn/ui-logic test
```
