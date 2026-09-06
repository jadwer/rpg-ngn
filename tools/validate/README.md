# @rpg-ngn/validate

Validador de content packs y logs de campaña contra los schemas de `@rpg-ngn/content`. Corre en CI en cada push.

```bash
pnpm validate                 # desde la raiz del repo
pnpm --filter @rpg-ngn/validate validate
```

Recorre `content/packs/*` (cada pack se carga completo, con referencias cruzadas) y `campaigns/*` (cada `events.jsonl` se valida contra el pack de la misma id). Sale con 1 ante cualquier error; los avisos (por ejemplo un `npc:*` que no esta en el pack porque vive en las notas del DM) no bloquean.

Lo que detecta: JSON invalido, claves desconocidas, ids que no coinciden con el archivo, retratos que no existen, party con personajes inexistentes, `seq` fuera de orden, ids duplicados, eventos antes de `session_started`, referencias a personajes o eventos que no existen.
