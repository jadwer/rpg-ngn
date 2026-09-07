# @rpg-ngn/engine-contract

Contrato entre la plataforma (Laravel, `rpg-ngn-api`) y `apps/engine` (docs/11, D3 y D5). Version entera en `ENGINE_CONTRACT_VERSION`; viaja en la cabecera `x-engine-contract` y el engine rechaza lo que no conoce.

| Endpoint del engine | Peticion | Respuesta |
|---|---|---|
| `POST /v1/turns/resolve` | `ResolveTurnRequest` | NDJSON de `ResolveLine`: bloques conforme salen y una linea `result` al final (eventos nuevos, personajes interpelados, estado, proyecciones, uso), o `error` |
| `POST /v1/validate/events` | `ValidateEventsRequest` | `ValidateEventsResponse` |
| `POST /v1/project` | `ProjectRequest` | `ProjectResponse`, con `divergence` cuando se manda un snapshot a auditar |
| `GET /v1/providers/probe` | query `kind`, `model` | `ProbeResponse` |

Solo tipos y zod: sin I/O, sin dependencias de plataforma. La API PHP valida la envoltura con el JSON Schema exportado de aqui cuando exista ese paso en CI; mientras tanto, los tests de integracion de `rpg-ngn-api` usan respuestas grabadas con esta forma.
