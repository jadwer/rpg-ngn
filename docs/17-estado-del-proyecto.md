# 17. Estado del proyecto

Fecha de corte: **2026-10-12**. Monorepo `dev` `36a05db`; API `main` `872af10`
(platform AtomoPlatform v0.4.1). Produccion en https://adastramentis.com y el
panel en https://dashboard.adastramentis.com. App: AAB v26 en Pruebas
internas de Google Play; APK v27 local.

Responde tres preguntas sin leer codigo: que es, que funciona y que
decisiones estan cerradas. **Lo que falta vive solo en el
[ROADMAP](../ROADMAP.md).** La version anterior de este archivo (hasta el
11-10, con el detalle entrega por entrega) esta en
[archivo/17-estado-hasta-el-11-10.md](archivo/17-estado-hasta-el-11-10.md).

## 1. Que es el producto

Un motor de rol de mesa donde **el GM es el modelo**, no una persona. Esa es
la diferencia con Alchemy VTT o Quest Portal: los dos necesitan un GM humano.
Un grupo sin nadie que sepa dirigir no puede usarlos; aqui si puede sentarse.

Es **agnostico en cuatro ejes**: setting (content packs), sistema de juego
(rulesets), proveedor de modelo y cliente (web, movil, CLI). La regla que lo
sostiene: **el modelo propone, el motor valida, el estado persiste.**

Lanzamiento fijado por Gabino: **15-11-2026**, en web y Android (iPhone entra
por la web).

## 2. Arquitectura

```
cliente (Next.js 15 / Expo)
     |
Laravel 12 (rpg-ngn-api, privado)   <- unico escritor de la base: cuentas, cobro, turnos, cupo
     |
apps/engine (Node)                  <- sin credenciales de base: valida, narra, proyecta
     |
proveedor de modelo (Anthropic por omision; OpenAI y Ollama posibles)
```

- Monorepo pnpm publico (`packages/*` sin React, Next, Expo ni `node:*`).
- API sobre el core de AtomoPlatform (submodule `platform/`), Postgres 16 con
  event store append-only (`campaign_events`, trigger y roles que impiden
  borrar).
- Mundos con contenido ajeno en repos privados (`~/dev/rpg-packs/*`, Gitea
  `rpg-packs/*`), enlazados en el servidor como `content/packs/private-*` y
  actualizados con `git pull`.
- ADR que manda: [11](11-adr-stack-saas.md).

## 3. Que funciona en produccion

**Jugar**
- Mesas de 1 a 9 jugadores con enlace de invitacion; turnos con cuenta atras
  cancelable; tiradas pedidas por el GM con dado en pantalla (el numero lo
  pone el servidor); ideas de accion por jugador; susurros y metas privadas
  que ni el anfitrion ve.
- Reloj de la historia: sesiones corta, media, larga o libre; logros; el GM
  cierra solo y todos ven la pantalla de fin con estrellas y reseña.
- Arcos de autor: capitulos, canon, desenlace fijo, finales con rama, NPCs
  por sesion, mesa "Terminada".
- Ilustraciones de escena (Gemini) en apertura, climax y final; mapas con la
  ubicacion de la party.
- Cronica compartible, presentacion vertical y horizontal, voz del narrador
  (OpenAI) y video por comando.
- Ingles y español (interfaz, narracion y mundos traducidos).

**Sistemas de juego**: `fantasy-d20-lite` (con deuda, calor y respeto, y
combate por elementos como opciones del mundo), `court-intrigue`,
`masquerade`, `drama-lite`, `deduccion-social` (roles ocultos, votos y
veredicto).

**Mundos** (8 en el catalogo; los derivados solo en la beta cerrada):
Los Nueve Viajeros; Ya descubri mi pasion: ¡QUIERO SER MEDICO! (one-shot de
un jugador); La Mascarada (credito a Ternurina97); y los derivados El te que
nadie probo, Benditos sean los inutiles, Turno de noche en la Persefone,
Vuelta al barrio y Las Siete Coronas.

**Cuentas y dinero**
- Registro con casilla de edad, recuperar contraseña, borrar la cuenta,
  legales v1 publicados (falta el abogado).
- Plan gratuito con cubeta de turnos; paquetes de turnos, Bendicion del
  bardo, pase de temporada y mundos en venta por Stripe (cobro en MXN); en la
  app, Google Play Billing (falta la cuenta de servicio para confirmar).
- Pase de descubridor con capitulos, camino de premios y coleccion.
- Avisos push en web y app; soporte con reportes y conversacion.

**Operacion**
- Panel: salud, auditoria, usuarios y roles, mesas, turnos atascados, pagos,
  cupos, pases, trabajos fallidos, revision de mundos, catalogo, soporte y
  operaciones con motivo (dar cupo, desatascar, reembolsar, suspender).
- Despliegue con `/root/deploy-rpg.sh` (guardia de turnos en curso, web sin
  cortar); respaldo diario de la base en el mismo servidor.
- Revisar una partida: `tables:review`, `turns:notices` y el lector critico
  (`apps/engine/scripts/critic.mts`).
- Costo por turno bajado con cache de una hora del prompt y `effort: low`
  (mascarada de tres: 0.36 USD la sesion corta).

## 4. Decisiones cerradas (no reabrir sin argumento nuevo)

| # | Decision | Donde |
|---|---|---|
| D1 | El modelo propone, el motor valida, el estado persiste | [02](02-architecture.md) |
| D2 | La web es el producto principal (mesa propia, cara para streamers); la app es la superficie del jugador, con paridad | [11](11-adr-stack-saas.md) |
| D3 | El cierre del turno es una cuenta atras cancelable | [archivo/18](archivo/18-decisiones-ux.md) |
| D4 | Los dados los tira el servidor por omision | memoria del proyecto |
| D5 | Cada mundo declara su procedencia; el repo publico solo admite contenido original o licenciado | [07](07-content-provenance.md) |
| D6 | Medir con gente real antes de elegir que construir | [archivo/14](archivo/14-pendientes-visuales.md) |
| D7 | La ficha la define el ruleset, no la interfaz | [05](05-content-pack-spec.md) |
| D8 | El mapa no es un tablero tactico | [05](05-content-pack-spec.md), [08](08-event-model.md) |
| D9 | Se cobra en turnos (mas pase, Bendicion y mundos), no por tiempo | `rpg-ngn-api/docs/modelo-de-monetizacion.md` |
| D10 | Google Play cobra turnos y Bendicion (+15%); pase y mundos solo en la web | ROADMAP historico, 02-10 |
| D11 | Steam y Epic diferidos | [archivo/23](archivo/23-adr-distribucion-pc.md) |
| D12 | Los mundos derivados se quedan en la beta cerrada; los cuatro con nombres propios se publican como originales despues de la beta | ROADMAP |

## 5. Donde esta cada cosa

| Que | Donde |
|---|---|
| Lo que falta | [ROADMAP](../ROADMAP.md) |
| Vision, dominio, arquitectura | [00](00-vision.md), [01](01-domain-model.md), [02](02-architecture.md), [11](11-adr-stack-saas.md) |
| Contrato del GM y de la realidad | [03](03-gm-contract.md), [06](06-reality-contract.md) |
| Contexto narrativo | [04](04-narrative-context.md) |
| Formato de mundo (pack) | [05](05-content-pack-spec.md) |
| Procedencia de contenido | [07](07-content-provenance.md) |
| Eventos y ubicacion | [08](08-event-model.md) |
| Mundos subidos por la gente | [15](15-packs-de-la-comunidad.md) |
| Legales y sus preguntas para el abogado | [19](19-legal-aviso-y-terminos.md) |
| Prompts de mapas; marca | [20](20-prompts-de-mapas.md), [21](21-brand-rationale.md), [22](22-brand-guidelines.md) |
| Plan del panel | [25](25-plan-administracion.md) |
| Motor: correccion del 05-10, lector critico, como revisar una partida | [27](27-correccion-del-motor.md) |
| Precios, costos y monetizacion | `rpg-ngn-api/docs/modelo-de-monetizacion.md` (privado) |
| Operacion del servidor | [RUNBOOK](../RUNBOOK.md) |
| Planes ya ejecutados, auditorias e historial | [archivo/](archivo/README.md) |

## 6. Como mantener este archivo

Se reescribe cuando cambia el estado, no se le añaden notas encima. Fecha de
corte y commits en la cabecera son obligatorios. Lo pendiente nunca va aqui:
va al ROADMAP.
