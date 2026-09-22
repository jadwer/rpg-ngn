# 17. Estado del proyecto

Fecha de corte: **2026-09-22, 00:20 CST**. Rama `dev`, commit `ef5c4f3`.

Este archivo existe para responder cuatro preguntas sin tener que leer el
codigo: que esta implementado, que esta en progreso, que esta pendiente y que
decisiones estan cerradas. Se escribio a peticion de un colaborador externo
que revisaba `docs/16`.

**Como leerlo.** Todo lo marcado como implementado esta **desplegado en
produccion** (https://rpg-worlds.gabinoramirez.com) salvo que diga otra cosa.
Los numeros de tests y los estados del servidor de este documento se
verificaron el dia del corte, no se citan de memoria. Cuando algo no se pudo
comprobar, se dice.

**Que NO es este archivo**: no sustituye al `ROADMAP.md` (que tiene el detalle
por entrega) ni al SDD (`docs/00` a `docs/16`, que tiene las decisiones y su
razon). Es el indice de estado que faltaba entre los dos.

---

## 1. Que es el producto, en dos parrafos

Un motor de rol de mesa donde **el director de juego es el modelo**, no una
persona. Esa es la diferencia con Alchemy VTT o Quest Portal: los dos
necesitan un director humano y su IA, donde existe, le asiste. Aqui esa silla
la ocupa el motor. Un grupo sin nadie que sepa dirigir no puede usar aquellos;
si puede sentarse aqui.

Es **agnostico en cuatro ejes** y eso manda sobre el diseño: setting (content
packs), sistema de juego (rulesets), proveedor de modelo (interfaz con
adapters) y cliente (web, movil, CLI). La regla que lo sostiene: **el modelo
propone, el motor valida, el estado persiste.** El modelo nunca es dueño del
estado.

---

## 2. Arquitectura, en una pantalla

```
cliente (Next.js 15 / Expo)
     |
Laravel 12 (rpg-ngn-api, repo privado)   <- unico escritor de la base
     |                                      cobro, cuentas, turnos, cupo
apps/engine (Node)                        <- sin credenciales de base
     |                                      valida, narra, proyecta
proveedor de modelo (Anthropic / OpenAI / Ollama)
```

- **Monorepo pnpm** (`jadwer/rpg-ngn`, publico, rama `dev`) con el motor en
  TypeScript puro. `packages/*` no importa React, Next, Expo ni `node:*`; lo
  vigila eslint.
- **Plataforma Laravel 12** sobre el core de AtomoPlatform, en repo privado
  aparte. **PostgreSQL 16** con event store append-only (`jsonb` + trigger que
  prohibe update y delete).
- **El motor corre una sola vez**, invocado por Laravel por turno.
- **Polling en V1**, sin SSE.

Decision que manda sobre todo esto: `docs/11-adr-stack-saas.md`.

---

## 3. Que esta implementado (y en produccion)

### Motor y dominio

- **Event sourcing completo**: `reduce(events, {pack, ruleset})` es puro, el
  estado es una proyeccion. Append-only real, protegido por trigger en la base.
- **Tres rulesets**, que es lo que demuestra el eje agnostico:
  `fantasy-d20-lite` (d20 clasico), `court-intrigue` (investigacion sin
  combate: credito, sospecha, pistas) y `masquerade` (prestigio, escandalo,
  rumores, vinculos). Sin combate en dos de los tres.
- **Efectos comunes a todos los rulesets**, aplicados en el reductor compartido
  porque no dependen del sistema de juego: `move` (donde esta cada uno),
  `relationship` (como trata un NPC a un personaje, -5 a 5) y `condition`
  cuando el sujeto es un NPC.
- **Eventos del dominio** que el DM puede emitir: `roll`, `discovery`,
  `rumor_heard`, `quest_update`, `npc_action`, `scene_started`/`scene_closed`,
  `world_event`, `inventory_change`, `correction`.
- **Capa de conocimiento por jugador**: `visibility.layer`
  (canon/campaign/player/dm), testigos, y un lint que corta si el DM va a
  filtrar un secreto que la mesa no conoce.

### Mesa y turnos

- **Turnos**: declaracion privada de cada jugador, cierre del turno, narracion.
  El cierre lo da el anfitrion (ver decision D3 mas abajo).
- **Dados pre-tirados**: con `dice: engine` (por omision) el motor tira un d20
  por personaje que declaro **antes** de llamar al modelo y se lo enseña. El DM
  narra la consecuencia en el mismo turno. Modo `table` para dados fisicos.
- **Reintento silencioso**: si el modelo falla, se reintenta una vez borrando
  los bloques del intento fallido. Si el segundo sale, solo el anfitrion ve el
  motivo. Si fallan los dos, la mesa lee "El relato se ha trabado. Vuelvan a
  cerrar el turno: nadie pierde lo que escribio".
- **Apertura de sesion**: presenta titulo, briefing y como se juega del pack, y
  **coloca a la party** en el lugar que declara la sesion (`startLocation`).
- **Presencia**: "me tengo que ir" / "he vuelto". El ausente no cuenta para
  cerrar el turno y el DM recibe aviso para apartar al personaje sin matarlo.
- **Eleccion de personaje**: cada miembro elige al entrar, el primero que llega
  se lo queda.
- **Personalidad por jugador** (600 caracteres, con plantilla): la escribe el
  jugador y el DM la recibe en la ficha. Activable por pack
  (`playerPersona`), no sale en packs donde no aplica.

### Mapa

- **Imagen del pack con lugares posados encima por coordenadas en porcentaje.**
  No es un tablero tactico: nadie se coloca en una casilla. Los caminos entre
  lugares salen de las conexiones que los lugares ya declaraban.
- Linea plegada en la mesa que abre un **modal a pantalla completa**, con
  puntos por lugar (encendidos si hay alguien) y los retratos de quien esta
  alli. Quien no tiene ubicacion aparece como "de camino o fuera de escena".
- **En web y en la app**, con la misma composicion.
- Formato en `docs/05`, ubicacion en `docs/08`, lo que se ve en `docs/13` 4.10.

### Negocio

- **Cobro con Stripe** (Elements, sin salir del sitio). Creditos de prepago
  **en turnos**, no en tiempo ni suscripcion. Solo el webhook acredita, y es
  idempotente.
- **BYOK**: el usuario puede traer su clave, cifrada, que no vuelve a salir.
  Quien la trae no gasta cupo ni se le cobra.
- **Coste medido**, no estimado: **0.019 USD por turno**. Una sesion de 20
  turnos con cuatro jugadores cuesta 1.26 USD con Sonnet y 0.42 con Haiku.

### Operacion

- Seis servicios de systemd con arranque automatico, comprobado en un reinicio
  real. **Copias de seguridad automaticas diarias** (timer activo, 5 dumps al
  dia del corte). HTTPS con renovacion automatica, cortafuegos, fail2ban.

### Verificacion

| Donde | Tests |
|---|---|
| `packages/ui-logic` | 140 |
| `packages/narrative` | 76 |
| `packages/api-client` | 31 (+1 saltado) |
| `packages/core` | 28 |
| `packages/content` | 27 |
| `packages/rules` | 23 |
| `packages/campaign` | 22 |
| `apps/mobile` | 13 |
| `apps/web` | 10 |
| `apps/engine` | 10 |
| `packages/engine-contract` | 4 |
| **Monorepo** | **384** |
| **API (Laravel)** | **99** (551 aserciones) |

Todo en verde el dia del corte. CI en GitHub Actions en ambos repos.

**Advertencia de metodo, pagada cuatro veces esta semana: los tests verdes no
ven el circuito completo.** Cuatro fallos reales de este mes pasaron los tests
y solo apareciron jugando un turno de verdad en produccion. Si se propone algo,
conviene asumir que hasta que no se juega, no esta probado.

---

## 4. Que esta en progreso ahora mismo

**Nada a medias.** El arbol esta limpio, todo lo empezado esta desplegado y
verificado. El trabajo del 21-09 (ubicacion inicial de la party, mapa en la
app, `docs/15`, revision de `docs/16`) se cerro completo.

Lo unico abierto es **observacion, no construccion**: el mapa lleva un dia en
produccion y falta ver, con gente jugando, si lo abren por su cuenta y si el
director se acuerda de emitir `move` en una partida larga.

---

## 5. Que esta pendiente, por orden de urgencia

### Bloquea abrir a usuarios que no seamos nosotros

0. **No se puede entrar a una mesa sin que el anfitrion te lleve de la mano.**
   Hoy son **seis pasos**: el invitado se registra, da su correo por fuera,
   recibe solicitud de amistad, la acepta, el anfitrion lo invita buscandolo
   por correo y recarga. La regla esta en el codigo: sin amistad aceptada no
   hay invitacion. **No existe enlace de invitacion ni codigo de mesa.**
   Descubierto el 21-09 al revisar `docs/16`, y es **el pendiente numero uno**
   (decision de Gabino): explica por que la sesion con invitados del 20-09
   empezo mal antes de la primera narracion, y por que el anfitrion acaba
   operando la aplicacion toda la partida. Ojo: quien entra **gasta turnos del
   anfitrion**, asi que el enlace necesita tope de plazas y revocacion. Opciones
   en `docs/18`, decision D-UX-1.
1. **Recuperar contraseña no funciona.** `MAIL_MAILER=log` en el servidor: el
   enlace se escribe en un archivo que nadie lee. Hace falta un SMTP real.
2. **No hay documentacion de usuario.** Ninguna. `docs/` es SDD; README y
   RUNBOOK son para desarrollar. Nadie ajeno sabria como entrar, crear mesa,
   invitar o jugar un turno.
3. **No hay terminos de servicio ni aviso de privacidad**, y se cobra dinero y
   se guardan datos de terceros.
4. **Stripe en modo prueba.** Falta resolver una tarea vencida de la cuenta y
   pasar a claves reales.

### Decidido y no empezado

5. **Medir con gente real** que no haya jugado rol nunca, y ver donde
   abandonan. Es la decision que ordena todo lo visual: **la lista de trabajo
   de UX sale de esa medicion, no de la impresion que deja el producto de
   otro.** Ver `docs/14`.
6. **Auditoria de UX externa** sobre `docs/13`.

### Deuda tecnica conocida

7. `campaign:import` solo trae eventos, no turnos ni bloques: una campaña
   importada se ve vacia.
8. `composer analyse` declarado sin `phpstan.neon`.
9. Un solo comando que levante los cuatro servicios locales.
10. Renombre de DM a GM: plan escrito en `docs/12`, sin ejecutar.

### Congelado a proposito

Todo lo visual de `docs/14`, **incluido lo que propone `docs/16`**. La decision
es del 20-09 y tiene su razon: la sesion que salio mal lo fue **por el motor**
(turnos sin tiradas, escenas sociales que no dejaban rastro, mesas que
empezaban a mitad de la historia), no por falta de adornos. Arreglar la fachada
con el motor flojo habria tapado el problema.

El motor ya se cerro (ver decision D6). El congelamiento se levanto **una vez**,
para el mapa, porque se queria medir la reaccion de la gente a su uso
narrativo.

---

## 6. Decisiones cerradas (no reabrir sin argumento nuevo)

| # | Decision | Donde | Por que |
|---|---|---|---|
| D1 | El modelo propone, el motor valida, el estado persiste | `docs/02` | El modelo nunca es dueño del estado |
| D2 | **La web es el producto principal**; el movil es la superficie del jugador | `docs/11`:215 | Mesa propia, independiente, cara para streamers. Ante cualquier disyuntiva gana la web. **`docs/16` principio 5 contradice esto** |
| D3 | El cierre del turno es manual, lo da el anfitrion | `docs/13` | Cada turno cuesta dinero; es la unica palanca contra el gasto involuntario. Puesto a critica a proposito |
| D4 | Los dados los tira el servidor por omision | memoria del proyecto | Se podia escribir "tiro 20". Requisito para packs con roles ocultos |
| D5 | El pack declara su procedencia; el repo publico solo admite contenido original o licenciado | `docs/07` | Lo demas vive en repos privados |
| D6 | El motor se cierra antes que lo visual | `docs/14` | Ver "congelado a proposito" |
| D7 | Medir con gente real antes de elegir que construir | `docs/14` | La lista sale de ahi, no de la competencia |
| D8 | La ficha la define el ruleset, no la interfaz | `docs/14` | Hay tres rulesets; una ficha de D&D deja dos vacios o mintiendo |
| D9 | El mapa no es un tablero tactico | `docs/05`, `docs/08` | Contradice el eje narrativo; el propio Alchemy presume de no centrarse en mapas |
| D10 | Creditos en turnos, no suscripcion ni tiempo | `docs/09` | Coste medido por turno |

---

## 7. Lo que `docs/16` propone: que existe ya y que no

Esta seccion responde directamente a la pregunta del autor de `docs/16`. El
detalle esta anotado dentro de ese archivo.

### Ya existe y esta desplegado

- **El mapa como superficie a pantalla completa**, con el mismo criterio que
  propone (dentro del pie se veia cortado en escritorio).
- **Personalidad escrita por el jugador**, que alimenta al director.
- **Presencia del jugador ausente** (estado 11 de sus doce).
- **Dados**: el servidor ya decide el resultado antes de narrar, asi que la
  animacion representaria algo ya decidido. **Modo `table`**: cuando el dado es
  fisico, no debe animarse nada.
- **Apertura de sesion** que presenta la escena (estado 2 de sus doce).

### No existe

- **"Escribiendo"** (estado 3). Es lo unico de sus doce estados que no existe:
  hace falta que el cliente avise mientras se teclea.
- **Espera como ficcion** ("el destino se prepara"): hoy es un indicador
  tecnico. Es, en nuestra lectura, la mejor idea de su documento y la mas
  barata.
- **Jugadores con estado individual** en vez de una linea de texto.
- **Historial de la sesion en tarjetas.**
- **Configuracion en tres niveles.**
- **Composicion separada por cliente** (`SessionMobile` / `SessionTablet` /
  `SessionDesktop`).

### Decidido el 22-09 (detalle y motivos en `docs/18-decisiones-ux.md`)

1. **Enlace de invitacion con tope de plazas**, revocable, sin sala de espera
   (D-UX-1). Lo construye Claude, y es lo siguiente que se hace.
2. **La jerarquia se diseña a 390px; el acabado va primero a la web** (D-UX-2).
   **La directriz de `docs/11` no cambia**: la web sigue siendo el producto
   principal.
3. **Cuenta atras de 10 segundos cancelable** por cualquiera de la mesa, mas
   tiempo maximo de turno con "forzar cierre" para el anfitrion (D-UX-3).
4. **El saldo no se ve durante la partida**, ni siquiera el anfitrion; aviso
   solo cuando queda poco (D-UX-4). El coste sigue siendo restriccion de diseño
   aunque no se vea: es la razon de que el cierre sea cancelable.
5. **Dos composiciones** (movil y escritorio), no tres (D-UX-5, decision de
   arquitectura). Los tres niveles de configuracion, aceptados.

El concept board ya se corrigio (`b430597`): personajes reales del pack,
Observacion en vez de Percepcion, y "LA HISTORIA CONTINUA" en vez de un "EXITO"
verde, que quita el binario exito/fracaso.

---

## 8. Donde esta cada cosa

| Que | Donde |
|---|---|
| Vision y alcance | `docs/00`, `docs/09` |
| Arquitectura y ADR del stack | `docs/02`, `docs/11` |
| Contrato del DM y de la realidad | `docs/03`, `docs/06` |
| Formato de pack (personajes, lugares, mapas, secretos) | `docs/05` |
| Procedencia de contenido | `docs/07` |
| Modelo de eventos y ubicacion | `docs/08` |
| Experiencia actual y sus riesgos (DDS) | `docs/13` |
| Visual congelado y que NO copiar de la competencia | `docs/14` |
| Packs de la comunidad (diseño, sin construir) | `docs/15` |
| UX v1 propuesta, con revision anotada | `docs/16` |
| Decisiones de UX abiertas, con opciones y coste | `docs/18` |
| Detalle por entrega | `ROADMAP.md` |
| Operacion del servidor | `RUNBOOK.md` |

**No esta en este repo**: la plataforma Laravel (repo privado), los packs con
contenido de terceros (repos privados, por `docs/07`) y las notas de operacion
con credenciales.

---

## 9. Como mantener este archivo

Se actualiza cuando cambia el estado, no cada commit. La fecha de corte y el
commit de la cabecera son obligatorios: **un archivo de estado sin fecha miente
en cuanto pasa una semana.** Si una afirmacion no se pudo verificar el dia del
corte, se dice en vez de darla por buena.
