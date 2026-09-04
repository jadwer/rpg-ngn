# Especificacion de content packs

Un content pack es un directorio bajo `content/packs/<id>/` con un manifiesto y colecciones de entidades. Es la unica fuente de lore del motor.

## Estructura

```
content/packs/<id>/
├── pack.json               manifiesto: id, nombre, tipo, version, colecciones
├── characters/*.json       personajes jugables pregenerados
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
  "skills": ["Tiro con arco", "Sigilo", "Percepcion", "Supervivencia"],
  "roles": ["Danio a distancia", "Exploracion"],
  "goal": "una linea con el objetivo del personaje",
  "portrait": null
}
```

Notas:

- `stats` usa las seis caracteristicas clasicas en espanol abreviado (fue, des, con, int, sab, car), valores 3 a 20.
- `hp` y `ac` son valores de nivel 1. En el pack piloto fueron derivados por clase; la lamina original no los traia.
- `portrait` es una ruta relativa al pack o null (los retratos del piloto estan en la lamina completa).
- `skills` y `roles` son texto libre en v0; en fase 1 se normalizan a catalogos.

## Reglas

0. Todo pack declara su procedencia en `pack.json` segun [07-content-provenance.md](07-content-provenance.md).
1. Un pack de tipo `setting` no contiene estado de campana; un pack de tipo `campaign` puede referenciar un setting.
2. Nada en un pack es secreto: el repo es publico. Los secretos del DM viven fuera (`dm/`, gitignored) y se integran al estado de campana en runtime.
3. Los ids son kebab-case, unicos dentro del pack, y son la forma canonica de referencia cruzada.
4. Todo cambio de lore pasa por PR/commit: Git es el historial del conocimiento del mundo.
