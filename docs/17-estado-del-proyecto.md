# 17. Estado del proyecto

Fecha de corte: **2026-09-22, 21:10 CST**. Rama `dev`, commit `8b2ef93`.

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
- **Los tres packs tienen mapa** (22-09): La Mascarada uno; el piloto dos
  (Valdoria y la mina, unidos por la boca de la mina, que vive en el mapa del
  pueblo); la boticaria dos (el palacio y la ciudad exterior, con la muralla
  como nexo). Catorce coordenadas medidas sobre la imagen real, comprobadas
  pintando los marcadores encima.
- **Con varios mapas, la mesa enseña el que toca**: el del personaje de quien
  mira, si no el de mas gente, si no el primero; y se cambia desde el modal.
- Formato en `docs/05`, ubicacion en `docs/08`, lo que se ve en `docs/13`
  4.10, prompts para generar imagenes y retratos en `docs/20`.

### Negocio

- **Cobro con Stripe** (Elements, sin salir del sitio). Creditos de prepago
  **en turnos**, no en tiempo ni suscripcion. Solo el webhook acredita, y es
  idempotente.
- **BYOK**: el usuario puede traer su clave, cifrada, que no vuelve a salir.
  Quien la trae no gasta cupo ni se le cobra.
- **Coste medido**, no estimado: **0.019 USD por turno**. Una sesion de 20
  turnos con cuatro jugadores cuesta 1.26 USD con Sonnet y 0.42 con Haiku.

### Correo (22-09)

- **Sale correo de verdad**: Resend por SMTP estandar, sin paquete ni
  dependencia nueva, asi que cambiar de proveedor es cambiar variables.
- **Recuperar contraseña funciona**, probado de punta a punta en produccion:
  correo, token, pagina, cambio y login con la clave nueva.
- **Correo de bienvenida** al registrarse, que habla de la mesa y no del
  producto; va a la cola y no sale si ademas hay que verificar el correo.
- **Sale desde `no-responder@gabinoramirez.com`**, con el dominio verificado
  (DKIM y dos CNAME). El SPF que el dominio ya tenia no se toco: Resend usa
  CNAME justo para no chocar con el correo existente.
- Pendiente: los avisos de mesa ("es tu turno", "abrieron sesion"), que se
  diseñan viendo jugar a gente, no antes.

### Entrar a una mesa con un enlace (22-09)

Era el pendiente numero uno. **Probado de punta a punta en produccion**: el
anfitrion crea el enlace, una desconocida lo abre **sin cuenta**, ve la mesa y
quien invita, se registra **conservando el enlace**, vuelve a el y entra. Cero
amistades de por medio.

- **El tope de plazas es la proteccion principal**, no la caducidad: quien
  entra gasta turnos del anfitrion, asi que un enlace reenviado tiene techo.
  Cinco plazas por omision, siete dias, uno vivo por mesa y revocable.
- **Se acepta con bloqueo**: dos personas abriendo el ultimo asiento a la vez
  no pueden pasar las dos.
- **El token se guarda hasheado** y solo se enseña al crearlo, como una
  contraseña.
- **La consulta del enlace es publica a proposito**: quien lo abre todavia no
  tiene cuenta y tiene que ver a que le invitan. Solo enseña nombre de mesa,
  pack y anfitrion; nada de la partida.
- **Entrar y crear cuenta aceptan un destino de vuelta**, validado para que
  solo pueda ser una ruta interna.
- **La amistad se queda** para invitar a mano; deja de ser obligatoria.
- **En la app tambien**: el anfitrion comparte el enlace con la hoja nativa y
  el invitado lo pega en "Tengo un enlace" (vale la URL o solo el codigo).

### Retirar una mesa (22-09)

**Solo en la web por ahora**; en la app falta (pendiente de paridad).

- **Archivar**: la saca de la lista y la deja plegada al final, sin tocar la
  cronica. Es lo normal: una partida jugada tambien es de los demas jugadores.
- **Borrar de verdad**: solo si la mesa **nunca llego a jugarse**. Si ya tiene
  eventos responde 409 con el motivo, no con un error del servidor.
- **Salir de la mesa**: para el invitado. El anfitrion no puede salirse de lo
  suyo, porque dejaria la mesa sin quien abra sesiones ni pague los turnos.
- Antes solo existia `tables:prune` por SSH, y el `DELETE` que JSON:API dejaba
  expuesto **respondia 500 con la sentencia SQL y el nombre de la base**.
- `tableRetirement` decide que se ofrece, en `ui-logic` con tests.

### Cuenta y datos personales (22-09)

- **Borrar la propia cuenta** desde el perfil. Se borra **de verdad**
  (`forceDelete`, no el soft delete de la plataforma: con soft delete el nombre
  y el correo seguirian en la base), y lo escrito en las partidas **queda sin
  identidad** en vez de destruirse. Es el derecho de cancelacion del aviso.
- **Bloquea mientras la persona sea anfitriona de alguna mesa** y le dice
  cuales y si estan jugadas, porque borrarla dejaria la mesa sin anfitrion.
  Pide la contraseña: un token robado no basta.
- **Constancia de aceptacion** (`legal_acceptances`) con version, fecha y
  origen. En tabla aparte porque se acepta varias veces y la constancia
  **sobrevive al borrado de la cuenta**, disociada.
- **Fallo de diseño que encontro el test**: `turn_responses` caia en cascada
  con el miembro, asi que al irse alguien de una mesa su texto se destruia y la
  cronica quedaba con huecos para los demas. Ahora es `nullOnDelete`.

### Legal (22-09)

- **Terminos y aviso de privacidad publicados** como version 1 en `/terminos` y
  `/privacidad`, enlazados desde el pie de la portada y desde el registro en
  web y movil. **Pendientes de revision de abogado**: Gabino decidio publicar
  antes, porque tener algo publicado protege mas que no tener nada.
- Se escribieron mirando el sistema, no una plantilla: las tablas que guardan
  datos, los cuatro terceros a los que sale informacion (Anthropic, Stripe,
  Resend y Hetzner, con el servidor en Alemania) y que el numero de tarjeta
  nunca toca el servidor. Se declara que el texto de las partidas **no entrena
  modelos**.
- Alcance decidido: **solo mayores de 18**, responsable **persona fisica**,
  ley mexicana (LFPDPPP). Texto completo, hechos verificados y cinco preguntas
  para el abogado en `docs/19`.

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

0. ~~No se puede entrar a una mesa sin que el anfitrion te lleve de la mano.~~
   **RESUELTO el 22-09** con el enlace de invitacion (ver mas arriba). Lo que
   sigue describe el problema que habia, porque explica decisiones del
   producto:
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
1. **No hay documentacion de usuario.** Ninguna: `docs/` es SDD, y README y
   RUNBOOK son para desarrollar. Nadie ajeno sabria como entrar, crear mesa,
   invitar o jugar un turno.
2. **Stripe en modo prueba.** Falta resolver una tarea vencida de la cuenta y
   pasar a claves reales.
3. **Casilla de edad explicita en el registro.** Hoy se declara en el texto
   junto al boton y queda registrado quien acepto, cuando y que version; una
   casilla separada seria mas defendible.

**Ya no bloquean, cerrados el 22-09:** el correo (recuperar contraseña estaba
roto) y los **textos legales**, publicados como version 1 en `/terminos` y
`/privacidad` y pendientes de revision de abogado (`docs/19`).

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
