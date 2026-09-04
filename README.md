# rpg-ngn

Motor agnostico para campanas de rol de mesa dirigidas por un DM asistido por IA.

Agnostico en cuatro ejes:

- **Setting**: el mundo, los personajes y el lore viven en content packs versionados, no en el codigo.
- **Sistema de juego**: el core son primitivas; cada ruleset define como se combinan (d20 fantasy, sistemas elementales, otros).
- **Proveedor LLM**: el DM narra a traves de una interfaz de proveedor con adapters intercambiables.
- **Cliente**: el motor no sabe si lo consume una web, una app Expo o un CLI.

```
Content Pack + Ruleset + Narrative Provider + Campaign = RPG Session
```

## Estado

Fase 0: diseno (SDD en [docs/](docs/)) y sesion piloto con el content pack [pilot](content/packs/pilot/).

Fichas de personaje del piloto: https://jadwer.github.io/rpg-ngn/

## Estructura

```
docs/               SDD: vision, dominio, arquitectura, contratos
packages/           motor TypeScript (core, content, campaign, narrative)
content/packs/      settings y campanas como datos versionados
apps/sheets/        visor estatico de fichas (GitHub Pages)
tools/              validacion de content packs
```

## Documentos clave

- [Vision](docs/00-vision.md)
- [Contrato de realidad](docs/06-reality-contract.md) (la filosofia del DM)
- [Modelo de eventos y conocimiento](docs/08-event-model.md) (el corazon tecnico)
- [Contrato del DM](docs/03-dm-contract.md)
- [Especificacion de content packs](docs/05-content-pack-spec.md)
- [ROADMAP](ROADMAP.md)
