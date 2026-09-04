# Procedencia de contenido

Todo content pack declara de donde viene su contenido y que se puede hacer con el. El motor no necesita saber si un mundo es original, homebrew o inspirado en IP ajena; la procedencia si, porque decide que puede distribuirse.

## Clasificacion

| Clase | Descripcion | Distribucion |
|---|---|---|
| `original` | Creado para este proyecto (Valdoria, los Nueve Viajeros) | Libre dentro del proyecto |
| `user-provided` | Subido o creado por un usuario para su mesa | Solo su mesa; el usuario declara tener derechos |
| `licensed` | Contenido de terceros con licencia explicita | Segun licencia, documentada en el pack |
| `third-party-ip` | Basado en IP ajena sin licencia (ej. un Teyvat casero) | Solo uso privado; jamas en el repo publico ni en el SaaS |

## Manifiesto

Cada `pack.json` incorpora (a partir de fase 1, obligatorio en `tools/validate`):

```json
{
  "provenance": {
    "class": "original",
    "authors": ["Gabino Ramirez"],
    "sources": [],
    "license": "propietario",
    "createdAt": "2026-09-04",
    "updatedAt": "2026-09-04"
  }
}
```

- `sources`: referencias de donde proviene el material (documentos, wikis, sesiones), util sobre todo para packs generados por pipeline de ingestion.
- Las imagenes y retratos declaran su origen igual que el texto (generadas por IA, fotografia propia, licenciadas).

## Reglas

1. Este repositorio es publico: solo admite packs `original` (o `licensed` con licencia que permita redistribucion).
2. Los experimentos privados con IP ajena viven fuera del repo, como packs locales; el motor los carga igual, la procedencia los frena en la puerta de cualquier distribucion.
3. Cuando exista SaaS con contenido de usuarios, `user-provided` implica: el usuario declara derechos, el contenido no se comparte entre mesas sin accion explicita, y hay mecanismo de takedown.
4. Un pack sin bloque de procedencia se trata como `third-party-ip` (la clase mas restrictiva) hasta que se declare.
