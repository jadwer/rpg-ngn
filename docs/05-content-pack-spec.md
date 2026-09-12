# Especificacion de content packs

Un content pack es un directorio bajo `content/packs/<id>/` con un manifiesto y colecciones de entidades. Es la unica fuente de lore del motor.

## Estructura

```
content/packs/<id>/
├── pack.json               manifiesto: id, nombre, tipo, version, colecciones
├── characters/*.json       personajes jugables pregenerados
├── portraits/*.jpg         (opcional) retratos referidos por `portrait`
├── npcs/*.json             (opcional)
├── locations/*.json        (opcional)
├── factions/*.json         (opcional)
├── rumors.json             (opcional)
├── timeline.json           (opcional)
├── secrets/*.json          (opcional) capa `dm`: hechos que la party no sabe, con condicion de revelacion
└── sessions/*.json         datos publicos de sesion (logistica, sin spoilers)
```

Formato JSON en el piloto (lo consume fetch sin parser extra). Los schemas formales viven en `packages/content` (zod, `strictObject`: una clave desconocida es error) y `tools/validate` los aplica en CI sobre `content/packs/*` y `campaigns/*`. Este documento describe la intencion; ante una duda, manda el schema.

## Schema de personaje (v0, el contrato vigente)

```json
{
  "id": "dayan",
  "name": "Dayan",
  "race": "Elfa oscura",
  "class": "Arquera",
  "age": "72 anios (joven)",
  "quote": "La sombra tambien puede ser un hogar.",
  "bio": "...",
  "stats": { "fue": 10, "des": 17, "con": 14, "int": 12, "sab": 14, "car": 11 },
  "hp": 12,
  "ac": 14,
  "attacks": [
    { "id": "arco-largo", "name": "Arco largo", "use": "des",
      "damage": "1d8", "damageType": "perforante", "range": "largo" }
  ],
  "abilities": [
    { "id": "disparo-certero", "name": "Disparo certero", "type": "rasgo",
      "uses": 2, "per": "descanso corto",
      "effect": "Aniade 1d6 al danio de un disparo declarado antes de tirar." }
  ],
  "skills": ["Tiro con arco", "Sigilo", "Percepcion", "Supervivencia"],
  "roles": ["Danio a distancia", "Exploracion"],
  "goal": "una linea con el objetivo del personaje",
  "portrait": "portraits/dayan.jpg"
}
```

Notas:

- `stats` usa las seis caracteristicas clasicas en espanol abreviado (fue, des, con, int, sab, car), valores 3 a 20.
- `hp` y `ac` son valores de nivel 1. En el pack piloto fueron derivados por clase; la lamina original no los traia.
- `portrait` es una ruta relativa al pack o null.
- `skills` y `roles` son texto libre en v0; en fase 1 se normalizan a catalogos.

### attacks y abilities

Se agregaron en v0.2 despues de la sesion piloto: un jugador tuvo que preguntarle al
DM que podia hacer su personaje, y el DM improviso el kit. Sin este bloque las fichas
no son reproducibles entre sesiones ni entre DMs.

El vocabulario es deliberadamente neutro (`type`, `uses`, `per`, `effect` en prosa) y
no menciona niveles de conjuro ni nombres propios de ningun sistema. El mapeo a un
ruleset concreto es responsabilidad de `packages/rules`, no del content pack.

- `attacks[].use` nombra la caracteristica que se aplica (`fue`, `des`, ...).
- `abilities[].type`: `truco`, `conjuro`, `rasgo` o `pasiva` en v0.
- `abilities[].uses`: numero de usos, o `null` si es a voluntad. Se acompania de `per`
  cuando hay limite (`descanso corto`, `descanso largo`).
- `effect` es prosa dirigida al jugador, no una formula. La resolucion la arbitra el DM.
- Una capacidad que hace daño (trucos y conjuros de ataque) lleva ademas `damage`,
  `damageType` y `range`, con el mismo vocabulario que `attacks`.

## Secretos: la capa `dm` del pack

`secrets/<id>.json`, declarados en `pack.json` bajo `secrets`. Son la capa DM knowledge de
[04](04-narrative-context.md) escrita como datos: hechos que existen en el mundo y que la party
no ha descubierto. Schema en `packages/content/src/secret.ts`:

```json
{
  "id": "brorg-pago-por-zahira",
  "about": "character:brorg",
  "text": "Brorg pagó por Zahira: la empujó hacia arriba tocando la campana con la palma.",
  "keywords": ["Brorg pagó", "pagó por Zahira", "quemaduras de bronce", "fue Brorg"],
  "revealWhen": { "event": "discovery", "fact": "fact:brorg-pago-por-zahira" },
  "revealedBy": "character:brorg",
  "note": "Zahira solo recuerda una mano verdosa; la identidad se revela con un discovery propio."
}
```

- `about`: la entidad a la que pertenece (`character`, `npc`, `location`, `quest`, `item`, `faction`).
  Un personaje debe existir en el pack; NPC, lugar o mision pueden vivir solo en la cronica (aviso).
- `text`: el hecho, escrito para el DM. Es lo que entra a la capa `dm` del contexto del modelo.
- `keywords`: frases que solo aparecen si se esta contando este hecho. El lint de conocimiento
  las busca en la narracion sin acentos ni mayusculas; una frase generica ("la campana") produce
  falsos positivos y corta narracion legitima. Elegirlas como marcadores, no como temas.
- `revealWhen`: `{ "manual": true }` (solo lo revela el DM con un evento `secret_revealed`) o una
  condicion sobre un evento del log: `event` (tipo) y opcionalmente `fact` (discovery), `actor`,
  `target` y `match` (texto que debe contener el evento, sin acentos).
- `revealedBy` y `note`: quien puede soltarlo en la ficcion y una nota de mantenimiento.

Semantica: un secreto esta revelado a un personaje cuando el log tiene un evento visible para el
que cumple `revealWhen`, o un `secret_revealed` con ese personaje entre los testigos
([08](08-event-model.md)). `packages/campaign` lo proyecta en `knowledge[<pc>].secrets`; el texto
y las keywords nunca entran a una proyeccion de jugador, al visor de fichas ni al pack empaquetado
en la app movil (`bundle-pack` los omite y deja `secrets: []` en el manifiesto).

En un repo publico como este, "secreto" significa oculto a los jugadores por software, no oculto
al mundo: quien quiera secretos que nadie pueda leer los mantiene en un pack privado. Los dos del
pack piloto (`osric-esta-abajo`, `brorg-pago-por-zahira`) salen de las notas de la sesion 003.

## Log de eventos de campaña

`campaigns/<id>/events.jsonl` no forma parte del pack, pero se valida contra el pack
de la misma id. Cada linea es un evento con `id` (`evt-NNNNN`), `v` (version del
schema de ese tipo; hoy 1), `seq`, `type`, `sessionId` y `recordedAt`. Los eventos
escritos antes de existir `v` se leen con `upcastEvent`; el archivo no se edita. El
detalle esta en [08](08-event-model.md) y en `packages/content/src/event.ts`.

## Reglas

0. Todo pack declara su procedencia en `pack.json` segun [07-content-provenance.md](07-content-provenance.md).
1. Un pack de tipo `setting` no contiene estado de campana; un pack de tipo `campaign` puede referenciar un setting.
2. La unica parte del pack que un jugador no ve es `secrets/`, y solo por software (proyecciones, visor y bundle la omiten). Este repo es publico, asi que las notas privadas del DM siguen viviendo fuera (`dm/`, gitignored); a `secrets/` van los hechos que el motor debe vigilar.
3. Los ids son kebab-case, unicos dentro del pack, y son la forma canonica de referencia cruzada.
4. Todo cambio de lore pasa por PR/commit: Git es el historial del conocimiento del mundo.
