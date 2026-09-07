# apps/engine

El unico lugar donde `packages/campaign` y `packages/narrative` corren en produccion (docs/11, D3). Lo invoca la plataforma Laravel por turno; no tiene credenciales de base de datos ni sabe de usuarios. Todo lo que necesita llega en la peticion: referencia del pack, ruleset, ultimo snapshot, eventos posteriores, respuestas del turno y configuracion del proveedor.

```bash
ENGINE_TOKEN=cambia-esto pnpm --filter engine dev      # 127.0.0.1:3100, packs en content/packs
HOST=0.0.0.0 PORT=3100 ENGINE_TOKEN=... pnpm --filter engine start   # tras pnpm build
```

Variables: `ENGINE_TOKEN` (obligatoria; la misma que `ENGINE_TOKEN` en la API), `PORT` (3100), `HOST` (127.0.0.1; en produccion queda detras de Laravel en la misma maquina), `PACKS_DIR` (por defecto `content/packs` del repo).

Endpoints, todos bajo `/v1` con cabeceras `x-engine-token` y `x-engine-contract: 1` (ver `@rpg-ngn/engine-contract`):

| Ruta | Que hace |
|---|---|
| `POST /v1/turns/resolve` | Reconstruye el estado (snapshot + eventos), pide al DM que narre, valida y aplica cada evento propuesto y emite NDJSON: bloques conforme salen, `result` al final o `error` |
| `POST /v1/validate/events` | Upcast, schema y referencias de un lote de eventos |
| `POST /v1/project` | Reproyecta una campaña; con `compareWith` audita un snapshot y nombra la divergencia (BA2) |
| `GET /v1/providers/probe` | Smoke test del proveedor configurado |
| `GET /health` | Sin token |

Con el proveedor `scripted` (entrega 5) el engine no gasta un token y es determinista: sirve para probar el circuito de turnos de punta a punta. El proveedor de Anthropic entra en la entrega 6 sin cambiar el contrato.
