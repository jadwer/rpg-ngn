# ROADMAP

## Fase 0: Diseno y piloto (en curso, 2026-09-04)

- [x] Definir alcance del motor y ejes de agnosticismo
- [x] Estructura del repo y SDD inicial en `docs/`
- [x] Content pack `pilot`: 9 personajes pregenerados + campana Valdoria
- [x] Visor de fichas mobile (GitHub Pages)
- [ ] Sesion piloto presencial (2026-09-05)
- [ ] Retro del piloto: que pidio la mesa, que le falto al DM, que registrar

## Fase 1: Contratos y contenido

- Schemas zod en `packages/content` (personaje, NPC, ubicacion, quest, evento)
- `tools/validate` corriendo en CI
- Content pack del primer mundo propio (Valdoria expandida): 1 ciudad, ~10 ubicaciones, ~10 NPCs, rumores, timeline
- Contrato de realidad refinado con lo aprendido en el piloto

## Fase 2: Motor minimo

- `packages/core`: primitivas (dados, checks, modificadores, recursos, efectos, eventos). Determinista, sin I/O, 100% testeado
- `packages/rules`: ruleset `fantasy-d20-lite` componiendo las primitivas
- `packages/campaign`: estado vivo (party, quests, eventos, capas de conocimiento) sobre archivos JSON

## Fase 3: DM harness

- `packages/narrative`: interfaz DMProvider + adapters (Anthropic, OpenAI)
- Constructor de contexto narrativo (las 4 capas de conocimiento)
- Harness web minimo para jugar por texto contra el DM
- Blind test de proveedores con la misma escena

## Fase 4: Clientes

- Web de jugador (Next.js): ficha viva, historial de sesion
- App Expo consumiendo los mismos packages

## Fase 5: Servidor y multijugador

- API (decidir entonces: Node o Laravel como plataforma) cuando exista algo que sincronizar en tiempo real
- Estado de campana en DB; el contenido canonico sigue versionado en Git
