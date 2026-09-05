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
└── sessions/*.json         datos publicos de sesion (logistica, sin spoilers)
```

Formato JSON en el piloto (lo consume fetch sin parser extra). Los schemas formales viven en `packages/content` (zod) a partir de la fase 1; `tools/validate` los aplicara en CI.

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

## Reglas

0. Todo pack declara su procedencia en `pack.json` segun [07-content-provenance.md](07-content-provenance.md).
1. Un pack de tipo `setting` no contiene estado de campana; un pack de tipo `campaign` puede referenciar un setting.
2. Nada en un pack es secreto: el repo es publico. Los secretos del DM viven fuera (`dm/`, gitignored) y se integran al estado de campana en runtime.
3. Los ids son kebab-case, unicos dentro del pack, y son la forma canonica de referencia cruzada.
4. Todo cambio de lore pasa por PR/commit: Git es el historial del conocimiento del mundo.
