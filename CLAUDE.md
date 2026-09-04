# rpg-ngn

Motor agnostico de RPG de mesa con DM asistido por IA. Proyecto personal de Gabino (marca Atomo a futuro, si el piloto valida).

## Decisiones tomadas (2026-09-04)

- **Motor en TypeScript puro**, monorepo pnpm. Laravel queda reservado para una eventual plataforma SaaS; el motor no depende de el.
- **Agnostico en cuatro ejes**: setting (content packs), sistema de juego (core = primitivas, packages/rules = rulesets), proveedor LLM (interfaz DMProvider con adapters) y cliente (web, Expo, CLI).
- **El modelo propone, el engine valida, el estado persiste.** El LLM nunca es dueno del estado (docs/02-architecture.md).
- **Procedencia de contenido** declarada en cada pack (docs/07-content-provenance.md). Este repo publico solo admite contenido original o licenciado redistribuible.
- **Repo publico.** Consecuencia: nada de secretos de campana aqui. Las notas privadas del DM viven en `dm/` (gitignored).
- **Contenido versionado como datos** (JSON/YAML en `content/`), la base de datos se reserva para el estado vivo de campana cuando exista servidor.
- **Local-first**: el piloto se juega sin servidor. Los jugadores consultan sus fichas en GitHub Pages (`apps/sheets/`, servido desde la raiz del repo).
- El codigo del motor (`packages/`) se escribe despues del piloto, con lo aprendido. Primero el SDD.

## Contexto del piloto

Sesion piloto presencial el 2026-09-05. Content pack `content/packs/pilot/`: los Nueve Viajeros (personajes pregenerados D&D 5e simplificado, transcritos de `img/personajes.png`) y la campana "Los Nueve Viajeros" en el pueblo de Valdoria. HP y CA fueron derivados a valores plausibles de nivel 1; la lamina original no los incluia.

## Reglas del repo

- Docs y commits siguen las directrices de estilo del CLAUDE.md global de Gabino: sin guiones largos en prosa, sin emojis, sin muletillas de IA.
- Los archivos de `content/` son la fuente de verdad del mundo; el codigo nunca hardcodea lore.
- El schema de personaje de `content/packs/pilot/characters/` es el primer contrato de datos del motor; cambios ahi impactan a `apps/sheets` y al futuro `packages/content`.
- `docs/06-reality-contract.md` manda sobre cualquier implementacion del DM.

## Comandos

Todavia no hay build ni tests (fase 0). El visor de fichas es estatico: abrir `apps/sheets/index.html` con un server local (`python3 -m http.server` desde la raiz) porque usa fetch.
