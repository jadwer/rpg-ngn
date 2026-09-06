# rpg-ngn

Motor agnostico para campañas de rol de mesa dirigidas por un DM asistido por IA.

Agnostico en cuatro ejes:

- **Setting**: el mundo, los personajes y el lore viven en content packs versionados, no en el codigo.
- **Sistema de juego**: el core son primitivas; cada ruleset define como se combinan (d20 fantasy, sistemas elementales, otros).
- **Proveedor LLM**: el DM narra a traves de una interfaz de proveedor con adapters intercambiables.
- **Cliente**: el motor no sabe si lo consume una web, una app Expo o un CLI.

```
Content Pack + Ruleset + Narrative Provider + Campaign = RPG Session
```

## Estado

Diseño cerrado (SDD en [docs/](docs/)) tras dos sesiones piloto con el content pack [pilot](content/packs/pilot/). Arranca la construccion segun el [ROADMAP](ROADMAP.md).

Fichas de personaje del piloto: https://jadwer.github.io/rpg-ngn/

## Estructura

```
docs/               SDD: vision, dominio, arquitectura, contratos, ADR de stack
packages/           motor TypeScript (content, core, rules, campaign, narrative)
apps/               sheets (visor estatico), web (Next.js), mobile (Expo), engine (Node), host (relay LLM local)
content/packs/      settings y campañas como datos versionados
campaigns/          log de eventos del piloto (fixture y archivo historico)
tools/              validacion de content packs y migracion del piloto
```

La plataforma (cuentas, mesas, cobro, event store) vive en un repo privado aparte, `rpg-ngn-api`, sobre Laravel y el core de AtomoPlatform. Ver [docs/11-adr-stack-saas.md](docs/11-adr-stack-saas.md).

## Documentos clave

- [Vision](docs/00-vision.md)
- [Contrato de realidad](docs/06-reality-contract.md) (la filosofia del DM)
- [Modelo de eventos y conocimiento](docs/08-event-model.md) (el corazon tecnico)
- [Contrato del DM](docs/03-dm-contract.md)
- [Especificacion de content packs](docs/05-content-pack-spec.md)
- [Alcance del SaaS](docs/09-saas-scope.md) (lo que pidio la mesa)
- [ADR de stack y arquitectura](docs/11-adr-stack-saas.md)
- [ROADMAP](ROADMAP.md)
