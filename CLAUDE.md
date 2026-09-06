# rpg-ngn

Motor agnostico de RPG de mesa con DM asistido por IA. Proyecto personal de Gabino (marca Atomo a futuro, si el piloto valida).

## Decisiones tomadas

Del 2026-09-04 (SDD inicial):

- **Motor en TypeScript puro**, monorepo pnpm. El motor no depende de Laravel.
- **Agnostico en cuatro ejes**: setting (content packs), sistema de juego (core = primitivas, packages/rules = rulesets), proveedor LLM (interfaz DMProvider con adapters) y cliente (web, Expo, CLI).
- **El modelo propone, el engine valida, el estado persiste.** El LLM nunca es dueño del estado (docs/02-architecture.md).
- **Procedencia de contenido** declarada en cada pack (docs/07-content-provenance.md). Este repo publico solo admite contenido original o licenciado redistribuible.
- **Repo publico.** Consecuencia: nada de secretos de campaña aqui. Las notas privadas del DM viven en `dm/` (gitignored).
- **Contenido versionado como datos** (JSON/YAML en `content/`); la base de datos guarda el estado vivo de campaña.

Del 2026-09-05 (docs/11-adr-stack-saas.md, manda sobre 09 y sobre el ROADMAP):

- **Plataforma Laravel 12 sobre el core de AtomoPlatform** (`~/dev/AtomoSoluciones/AtomoPlatform`, packages `atomo/*`), en un repo privado aparte (`rpg-ngn-api`). No api-base. Atomo es desarrollo propio y se modifica directo cuando rpg-ngn lo necesita.
- **PostgreSQL 16.** Event store append-only con `jsonb`.
- **El motor corre una sola vez**, en `apps/engine` (Node) invocado por Laravel por turno. El engine no tiene credenciales de base de datos; Laravel es el unico escritor.
- **Clientes**: Next.js 15 con `@atomo/ui` y `@atomo/core` (web delgada) y Expo (superficie del jugador). Ningun package bajo `packages/` importa React, Next, Expo ni `node:*`.
- **Polling en V1**, sin SSE. Nube con clave custodiada en servidor; Ollama por relay `apps/host` (entrega 6b).

## Contexto del piloto

Sesiones presenciales con DM Claude: 001 y 002 jugadas, 003 planeada para el 2026-09-06. Content pack `content/packs/pilot/`: los Nueve Viajeros (personajes pregenerados D&D 5e simplificado, transcritos de `img/personajes.png`) y la campaña "Los Nueve Viajeros" en el pueblo de Valdoria. HP y CA fueron derivados a valores plausibles de nivel 1; la lamina original no los incluia.

## Ramas

- `main`: lo que sirve GitHub Pages (fichas de la mesa). Solo recibe merges.
- `legacy`: la campaña de Valdoria en curso. Se mergea a `main` con fast-forward para publicar y se vuelve a `legacy`.
- `dev`: el SaaS. No toca `content/packs/pilot` salvo para migrarlo.

## Reglas del repo

- Docs y commits siguen las directrices de estilo del CLAUDE.md global de Gabino: sin guiones largos en prosa, sin emojis, sin muletillas de IA.
- Los archivos de `content/` son la fuente de verdad del mundo; el codigo nunca hardcodea lore.
- `campaigns/pilot/events.jsonl` no se edita a mano. Las correcciones son eventos `correction` (regla 16). La unica excepcion es la migracion de BA1 (`tools/migrate-pilot`), una sola vez.
- El schema de personaje de `content/packs/pilot/characters/` es el primer contrato de datos del motor; cambios ahi impactan a `apps/sheets` y a `packages/content`.
- `docs/06-reality-contract.md` manda sobre cualquier implementacion del DM.

## Comandos

Todavia no hay build ni tests (entrega 0 en curso). El visor de fichas es estatico: abrir `apps/sheets/index.html` con un server local (`python3 -m http.server` desde la raiz) porque usa fetch.
