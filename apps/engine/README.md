# apps/engine

El unico lugar donde `packages/campaign` y `packages/narrative` corren en produccion (docs/11, D3). Lo invoca la plataforma Laravel por turno; no tiene credenciales de base de datos ni sabe de usuarios. Todo lo que necesita llega en la peticion: referencia del pack, ruleset, ultimo snapshot, eventos posteriores, respuestas del turno y configuracion del proveedor.

```bash
ENGINE_TOKEN=cambia-esto pnpm --filter engine dev      # 127.0.0.1:3100, packs en content/packs
HOST=0.0.0.0 PORT=3100 ENGINE_TOKEN=... pnpm --filter engine start   # tras pnpm build
```

Variables: `ENGINE_TOKEN` (obligatoria; la misma que `ENGINE_TOKEN` en la API), `PORT` (3100), `HOST` (127.0.0.1; en produccion queda detras de Laravel en la misma maquina), `PACKS_DIR` (por defecto `content/packs` del repo), `PROVIDER_TIMEOUT_MS` (180000; tiempo maximo de una llamada al modelo, subirlo para modelos locales lentos), `DM_LINT` (`enforce` por defecto; `report` solo anota los hallazgos del lint de conocimiento sin cortar bloques, `off` no revisa; la peticion puede fijar otro modo por turno con `lint`).

Endpoints, todos bajo `/v1` con cabeceras `x-engine-token` y `x-engine-contract: 1` (ver `@rpg-ngn/engine-contract`):

| Ruta | Que hace |
|---|---|
| `POST /v1/turns/resolve` | Reconstruye el estado (snapshot + eventos), pide al DM que narre, valida y aplica cada evento propuesto y emite NDJSON: bloques conforme salen, `result` al final o `error` |
| `POST /v1/validate/events` | Upcast, schema y referencias de un lote de eventos |
| `POST /v1/project` | Reproyecta una campaña; con `compareWith` audita un snapshot y nombra la divergencia (BA2) |
| `GET /v1/providers/probe` | Smoke test del proveedor: `?kind=scripted\|anthropic\|openai&model=...&baseUrl=...` con la credencial en la cabecera `x-provider-credential`; nunca vuelve en la respuesta |
| `GET /health` | Sin token |

Proveedores (`provider` de la peticion, ver `ProviderConfig` en `@rpg-ngn/engine-contract`):

- `scripted` (entrega 5): no gasta un token y es determinista; sirve para probar el circuito de turnos de punta a punta y para demos con guion.
- `anthropic` (entrega 6): Messages API con streaming, prompt de sistema cacheado, pensamiento adaptativo con esfuerzo medio.
- `openai` (entrega 6): Chat Completions con streaming contra OpenAI o cualquier API compatible via `baseUrl` (DeepSeek `https://api.deepseek.com`, Ollama `http://host:11434/v1` con credencial `ollama`). `contextProfile: "compact"` recorta el contexto a menos de 3000 tokens para modelos locales.

Con modelo, el engine registra solo las declaraciones de los jugadores y la narracion; los eventos mecanicos que el modelo propone (tiradas reportadas, HP, condiciones, inventario, hechos del mundo, `secret_revealed`) se validan contra el estado antes de entrar al log y lo que no se puede aplicar se ignora con un aviso `system`. La credencial viaja en la peticion, vive en memoria durante la llamada y se redacta de cualquier mensaje de error.

Lint de conocimiento (docs/08, invariante 3): si el pack tiene `secrets/`, cada bloque de narracion o dialogo se compara con lo que sabe la party presente. Un bloque que usa una keyword de un secreto no revelado se sustituye por el aviso `system` "El DM revisó su narración..." y no entra a la cronica; el motivo va en `result.lint` y al log del engine (`lint error turno <id>: ...`). Si corta narracion legitima en una partida, arrancar el engine con `DM_LINT=report` (o `off`) o mandar `lint: "report"` en la peticion.
