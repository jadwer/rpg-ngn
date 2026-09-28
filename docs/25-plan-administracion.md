# 25. Administracion, auditoria, temporadas y constructor de historias

Plan del 2026-09-28. Sale de una preocupacion de Gabino: todo se opera desde
la linea de comandos y por SSH al servidor. Si el producto crece y la gente
empieza a tener problemas, hacen falta un panel para administrar, un canal
para reportes, trazabilidad de cada cambio y herramientas para hacer mejores
mundos. Estado: plan, sin construir. Las temporadas y pases quedan como
bosquejo hasta platicarlos.

## Lo que ya hay (inventario del 28-09)

En rpg-ngn-api:

- `campaign_events` es la verdad del juego: solo anexar, con trigger. Cada
  partida se puede reproducir evento por evento.
- `activity_log` (Spatie) esta migrado, pero **solo `GameTable` registra
  cambios**. Cupos, pases, mundos activados, catalogo, temporadas, miembros y
  sesiones cambian sin dejar rastro de quien ni cuando.
- Roles `god`, `admin`, `tech` y `customer` (atomo-permissions). Las
  comprobaciones de administracion estan repartidas en `PackAccess`,
  `DmController` y `PackReviewController`.
- Operacion por comandos: `catalog:set`, `season:open`, `quota:grant`,
  `packs:review`, `tables:prune`, `funnel:report`, `turns:usage`. Ninguno
  anota quien lo corrio.
- Copia diaria de la base, en el mismo servidor (H1). Fuera de la maquina no
  hay (S1).

En AtomoPlatform (revision de los packages del 28-09):

| Package | Sirve para | Veredicto |
|---|---|---|
| atomo-audit (+ui) | Leer el `activity_log` por JSON:API, pantalla de auditoria | Usar tal cual; ya instalado |
| atomo-permissions (+ui) | Roles y permisos, CRUD | Usar tal cual; ya instalado |
| atomo-user (+ui) | Usuarios, CRUD | Usar con trabajo: falta suspender, forzar cambio de clave |
| atomo-health (+ui) | Salud de base, cola y disco | Usar tal cual; ya instalado |
| atomo-app-config (+ui) | Ajustes del sistema clave/valor | Usar tal cual; falta instalar |
| atomo-notifications (+ui) | Avisos por canal y plantilla | Usar con trabajo; falta instalar |
| atomo-crm | Embudo de ventas | No sirve para soporte: no tiene tickets |
| atomo-subscriptions | Paywall editorial | No encaja; rpg-ngn ya tiene su pase |
| atomo-reports | Reportes contables | No aplica |
| templates/frontend | Panel de administracion Vite + React con login, menu lateral y rutas protegidas | Punto de partida del panel |

Los packages `-ui` son React con Vite y cliente axios; no son para Next.

## Decisiones propuestas

1. **El panel es una app aparte, en el repo privado**: `rpg-ngn-api/admin/`,
   armada desde `platform/templates/frontend` con los `@atomo/*-ui`. No va en
   `apps/web` por dos razones: los packages de Atomo no estan publicados y el
   monorepo es publico, asi que no puede depender de ellos; y el codigo de
   administracion no debe viajar en el bundle de los jugadores. Costo: otra
   app que desplegar y su propia sesion. Se sirve en
   **`dashboard.adastramentis.com`** (Gabino, 28-09), con la cookie de Sanctum
   del dominio padre.
2. **Toda accion de administracion pasa por la API**, con permiso y con
   rastro. Nada de SQL a mano ni de comandos sin actor. Los comandos que
   queden anotan `cli` como actor.
3. **Lo generico se construye en Atomo** (regla del 23-09): el modulo de
   soporte y la auditoria ampliada son de cualquier SaaS; en rpg-ngn solo lo
   del juego.
4. **Nada se borra desde el panel**: se archiva, se suspende o se corrige con
   un evento. Borrar de verdad sigue siendo `tables:prune` y el borrado de
   cuenta que pide la ley, los dos con rastro.

## E11. Panel de administracion y trazabilidad

### E11a. Trazabilidad primero (antes del panel)

Proteger los datos va antes que verlos bonito.

- `LogsActivity` en todo modelo de negocio que cambia: `Quota`,
  `SeasonPass`, `UserPack`, `PackActivation`, `CatalogWorld`, `Season`,
  `TableMember`, `GameSession`, roles de usuario y `ProviderConfig` (sin la
  clave). Campos elegidos por modelo, nunca secretos.
- Actor en todo: quien (usuario, `cli` o `webhook:stripe`), desde donde y un
  id de peticion (`X-Request-Id`) que tambien va al log de Laravel, para
  seguir un problema de punta a punta.
- Los comandos de operacion anotan lo que hicieron en `activity_log`.
- S1, copia de la base fuera del servidor: **deuda hasta comprar el NAS**
  (Gabino, 28-09); entonces, envio diario y una restauracion de prueba al
  mes. S5: dos roles de Postgres para que ni la credencial de la app pueda
  borrar `campaign_events`.
- Retencion: `activity_log` no se poda antes de un año.

### E11b. El panel, primera version

Desde el template, en este orden:

1. **Entrar y ver**: login con Sanctum, solo `god`, `admin` y `tech`.
   Salud del sistema (atomo-health-ui), auditoria (atomo-audit-ui) y usuarios
   con sus roles (atomo-user-ui, atomo-permissions-ui).
2. **Lo del juego, en lectura**: mesas, campañas (con su registro de eventos
   y proyecciones), turnos atascados, mundos y catalogo, pagos, cupos, pases.
   Buscar por correo, por mesa o por id de pago.
3. **Las operaciones que hoy son comandos**: revisar mundos, precio y beta
   del catalogo, dar cupo, desatascar un turno, reembolsar, suspender una
   cuenta. Cada una con confirmacion y motivo escrito, que queda en la
   auditoria.
4. **Numeros**: el embudo de `funnel:report` y el coste de `turns:usage` en
   pantalla, por semana.

`tech` ve y opera soporte; `admin` ademas toca dinero y catalogo; `god`
ademas roles.

### E11c. Reportes y soporte

AtomoPlatform no tiene tickets. Se construye `atomo/support` (generico):

- Ticket con estado (abierto, en curso, esperando al usuario, resuelto),
  prioridad, quien lo atiende, conversacion y adjuntos.
- Enlace polimorfico a lo que trata (una mesa, un turno, un pago), asi el
  ticket llega con contexto y no con "no me funciona".
- En web y app, "Reportar un problema" dentro de la mesa y en Mi cuenta:
  adjunta sola la mesa, el turno y la version de la app.
- Aviso al usuario cuando cambia el estado (correo; atomo-notifications si ya
  esta instalado para entonces).

## E12. Temporadas y pases (bosquejo, se platica)

Hoy: `season:open` por comando, umbrales de capitulos en `season_worlds`,
un pase de 5 USD en `season_passes`. Lo que tendria que existir:

- Programar temporadas desde el panel: fechas, arte, mundos del camino y sus
  umbrales, con vista previa del camino como lo vera el jugador.
- Pases por temporada en dos niveles, **free** y **gold**: que da cada uno,
  precio, vigencia, y publicacion programada.
- Reportes por temporada: capitulos jugados, pases vendidos, mundos
  desbloqueados.

Preguntas para platicar: que incluye free y que gold; si gold sustituye a
Plata, Oro y Diamante o conviven; que pasa con lo ganado al cerrar la
temporada; reembolsos del gold (hoy: se quita el pase y lo ganado se queda,
E3).

## E13. Constructor de historias

Un pack ya es datos con schema (`packages/content`) y el engine ya lo valida.
El constructor es un editor en el panel sobre ese schema, con versiones.

- **Estructura**: mundo, lugares y mapas, personajes jugables, NPC, sesiones
  con sus momentos, secretos (quien los sabe y como se descubren), misiones.
  Se guarda como borrador versionado en la base; cada version se puede
  comparar con la anterior.
- **Salida**: el `.rpgpack` de siempre por el mismo camino de subida y
  validacion, asi que no hay un segundo formato.
- **Probar antes de publicar**: una mesa de prueba con el DM con guion o con
  el modelo, desde el mismo panel.

Dos validadores, que nunca publican solos (el modelo señala, una persona
decide):

1. **Propiedad intelectual**: la procedencia declarada (docs/07) mas una
   revision automatica que busca nombres, personajes, lugares y frases de
   obras con derechos, con evidencia de por que lo marca. Un pack marcado
   no puede salir al catalogo abierto; puede seguir privado.
2. **Calidad**: una rubrica fija (gancho de apertura, que cada personaje
   tenga algo que hacer, secretos bien repartidos, motivos de los NPC, ritmo
   por sesion, lo que esta en juego) que devuelve "se puede mejorar en X por
   Y". Con el tiempo se suma lo que dicen las partidas reales de esa version:
   donde se abandona, cuantos turnos dura una sesion, que ideas se usan.

Lo que se aprende de una version queda guardado junto a ella: por eso cada
pack nuevo puede salir mejor que el anterior.

## Orden y tamaño

| Paso | Que | Tamaño | Depende de |
|---|---|---|---|
| 1 | E11a trazabilidad y S5 (S1 espera el NAS) | M | nada |
| 2 | E11b.1 panel: entrar, salud, auditoria, usuarios | M | 1 |
| 3 | E11b.2 y .3 lo del juego y las operaciones | L | 2 |
| 4 | E11c soporte (`atomo/support`) y "Reportar un problema" | L | 2 |
| 5 | E12 temporadas y pases | M a L | platicarlo |
| 6 | E13 constructor de historias | XL | 3 |

Decidido el 28-09: el panel va en `dashboard.adastramentis.com`; las copias
fuera del servidor esperan a que se compre el NAS.
