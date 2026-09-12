# Handoff: entrega 6, lint de conocimiento y capa dm (2026-09-12)

Rama `worktree-agent-a1cd1419d4c647cdc` a partir de `dev` (d4990b3), sin push. Worktree en
`.claude/worktrees/agent-a1cd1419d4c647cdc`. La sesion se cerro por limite de contexto con el
codigo compilando y los tests en verde por package; ver "Que falta" para lo que no se alcanzo.

## Hecho y probado

### Capa `dm` del pack (`packages/content`)

- `src/secret.ts`: schema `Secret` = `{ id, about, text, keywords[], revealWhen, revealedBy?, note? }`.
  `about` admite `character|npc|location|quest|item|faction:<id>`. `revealWhen` es
  `{ manual: true }` o `{ event, fact?, actor?, target?, match? }` (todas las claves presentes deben
  cumplirse; `match` compara sin acentos ni mayusculas contra declared, payload.text, .note, .method).
- `pack.json` gana `secrets: []` (default vacio, strict). El loader carga `secrets/<id>.json`,
  expone `LoadedPack.secrets: Map` y valida `about` y `revealedBy`: personaje inexistente es error,
  NPC, lugar o mision fuera del pack es aviso.
- Evento nuevo `secret_revealed`: `{ ...envoltura, type, visibility: { layer, witnesses (min 1) },
  payload: { secretId, how? } }`. Tipo nuevo con `v: 1`, sin subir `EVENT_SCHEMA_VERSION` ni upcast.
  `parseEventLog` exige que `secretId` exista en el pack.
- Pack piloto: `secrets/osric-esta-abajo.json` (manual) y `secrets/brorg-pago-por-zahira.json`
  (discovery de `fact:brorg-pago-por-zahira`). Version del pack sigue en 0.4.0 a proposito: el
  engine (`PackStore`) exige igualdad con la version que fija cada mesa viva. Solo cambio el
  changelog y `updatedAt`.
- Tests: `packages/content/src/secret.test.ts` (schema, loader con el piloto y en memoria,
  evento en el log).

### Proyeccion de secretos revelados (`packages/campaign`)

- `src/knowledge.ts`: `visibleTo(event, state)` (testigos, destinatarios de discovery y
  knowledgeGranted; sin testigos y sin capa dm se toma la party de la sesion; capa dm no la ve
  nadie), `matchesRevealWhen`, `revealsOf`, `revealedSecrets`, `secretsKnownBy`, `fold`.
- `PlayerKnowledge.secrets?: Record<id, { event, seq, how }>` solo aparece cuando hay alguno, asi
  el snapshot canonico `campaigns/pilot/snapshots/002.json` no cambia (verificado byte a byte
  contra `dev`). `applyEvent(state, event, ruleset, secrets = [])`; `reduce` pasa
  `pack.secrets`.
- Tests: `packages/campaign/src/knowledge.test.ts`.

### Lint de conocimiento (`packages/narrative`, `engine-contract`, `apps/engine`)

- `src/lint.ts`: `buildKnowledgeView(ctx, party)` arma lo que sabe la mesa (secretos por
  personaje, refs de entidades presenciadas, texto ya oido: declaraciones del turno, cronica,
  datos publicos de sesion hasta la actual). `lintText(text, view, pack)` devuelve
  `LintFinding[]`: `error` por keyword de secreto no revelado a algun receptor (salvo si la mesa
  ya dijo esa keyword), `warning` por entidad del pack (NPC, lugar, mision) no presenciada.
- `ModelDMProvider`: cada bloque `narration` o `dialogue` y la nota de cada `world_event` pasa por
  el lint antes de emitirse (se conserva el streaming). En `enforce` (default) el bloque se
  sustituye por `{ type: 'system', text: 'El DM revisó su narración: contaba algo que la mesa
  todavía no ha descubierto.' }` y no genera evento `narration`; en `report` pasa y se anota; en
  `off` no se revisa. El modelo puede proponer `{"type":"secret_revealed","payload":{"secretId"}}`
  (validado contra el pack, testigos = party); si va antes del bloque, lo autoriza.
- Contrato (sin subir version): `ResolveTurnRequest.lint?: 'enforce'|'report'|'off'`,
  `ResolveLine result.lint?: LintFinding[]` con `{ level, secretId?, entity?, marker, receivers,
  message }`. `DMOutput` gana `{ kind: 'lint', finding }`.
- Engine: `resolve.ts` acumula `lint` y lo mete en `result` solo si hay hallazgos; `app.ts`
  escribe cada hallazgo en el log (`lint error turno <id>: ...`); `main.ts` lee `DM_LINT`
  (default `enforce`); `state.ts` y `resolve.ts` pasan los secretos al reductor.
- Context builder: seccion `# Capa del DM: secretos` con cada secreto, quien de la party lo conoce
  ("NO REVELADO a ..."), su condicion y `revealedBy`. Va entre la cronica y el turno.
- Tests: `packages/narrative/src/lint.test.ts`, `model-dm.test.ts` (describe "lint de
  conocimiento": corte, caso limpio, secret_revealed, modos report y off), `context.test.ts`,
  `apps/engine/src/app.test.ts` (lint en result, proyecciones sin secreto, secret_revealed
  proyectado en knowledge).

### Prompt de agencia (`packages/narrative/src/prompt.ts`)

- Seccion "# Agencia del jugador" con ejemplos permitidos y prohibidos, cierre obligatorio con la
  palabra a la mesa; seccion "# Secretos (capa del DM)"; forma del evento `secret_revealed`. La
  version compacta lleva lo mismo en corto (regla 1 y 6). Test: `prompt.test.ts`.

### Clientes

- `apps/mobile/scripts/bundle-pack.ts` omite `secrets/` y deja `secrets: []` en el `pack.json`
  empaquetado; `src/generated/pilot-pack.ts` regenerado (comprobado: sin texto de secretos).
- `apps/sheets/index.html` solo lee `characters/` y `sessions/`; no toca `secrets/`.
- `apps/web` no se toco.

### Docs

`docs/05` (seccion "Secretos", regla 2 reescrita), `docs/08` (tipo `secret_revealed`, seccion
"Secretos del pack y secret_revealed" con proyeccion y lint), `ROADMAP.md` (entrega 6),
`apps/engine/README.md`, `packages/narrative/README.md`, `packages/content/README.md`.

## A medias o sin hacer

- `pnpm check` completo (build, typecheck, lint, tests, validate, `next build`) paso en verde
  en el ultimo commit. `apps/web` recibio el cambio minimo que exige el contrato: su
  `scripts/bundle-pack.ts` tambien omite `secrets/` (regenerado `src/generated/pilot-pack.ts`).
- La API (`~/dev/rpg-ngn-api`) no se toco. `TurnService::commitResult` solo lee `events`, `state`
  y `addressed` del `result`, asi que `lint` se ignora sin romper nada; la mesa ve el bloque
  `system`. Guardarlo pide una columna en `turns` (migracion en plena partida, descartado hoy) o
  un bloque con detalle para el asiento `host`. Anotado en el ROADMAP.
- No se hizo el turno real contra Anthropic desde un engine en 3101 ni el caso grabado con salida
  real del modelo para el prompt de agencia. Los tests usan transportes falsos.
- Sin modo por mesa (`settings.lint`): hoy solo `DM_LINT` en el engine o `lint` en la peticion.

## Como correr lo nuevo

```bash
pnpm install && pnpm build
pnpm --filter @rpg-ngn/content test
pnpm --filter @rpg-ngn/campaign test
pnpm --filter @rpg-ngn/narrative test
pnpm --filter engine test
pnpm validate            # el piloto pasa con dos avisos: npc:osric no esta en el pack
pnpm check               # todo, incluido next build
```

## Riesgos

- Falsos positivos del lint en partida: una keyword generica en un secreto corta narracion
  legitima y la mesa ve "El DM revisó su narración". Las keywords del piloto son frases
  especificas ("fue Brorg", "Osric está abajo", "quemaduras de bronce"). Si pasa: arrancar el
  engine con `DM_LINT=report` (o `off`), o mandar `lint: "report"` en la peticion; no hace falta
  tocar la API. Los motivos estan en el stdout del engine.
- El engine de 3100 que sirve la partida de hoy corre desde el checkout `dev` sin estos cambios;
  nada de esto entra hasta que se mergee y se reinicie.
- Los dos secretos del piloto salen de `dm/session-003.md` (sesion no jugada) y quedan en un repo
  publico. Gabino decide antes de mergear si los deja, los cambia por otros o los mueve a un
  pack privado; una vez pusheados quedan en el historial.
- El secreto original propuesto (la confesion de Osric hace treinta años) no es secreto: el recap
  publico de `sessions/002.json` lo cuenta entero, y el lint lo trata como oido por la mesa. Por
  eso se sustituyo por `osric-esta-abajo`.
- Merge con `legacy`: `content/packs/pilot/pack.json` cambio (secrets, changelog, updatedAt) y
  `legacy` tambien toca ese pack; conflicto trivial pero hay que resolverlo a mano.
- El lint no entiende prosa: una parafrasis del secreto sin sus marcadores pasa. Es la
  limitacion aceptada en el diseño (marcadores verificables, sin heuristicas fragiles).
