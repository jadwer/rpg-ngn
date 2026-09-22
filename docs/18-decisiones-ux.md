# 18. Decisiones de UX abiertas

Fecha: 2026-09-21. Decide **Gabino**. Estado: **cinco decisiones sin cerrar**.

Este documento existe para cerrar en una sentada lo que bloquea rehacer
`docs/16` como V2. Cada decision lleva lo que esta en juego, las opciones
reales, lo que cuesta cada una y una recomendacion. **La recomendacion no es la
decision**; queda marcado quien decidio y cuando.

Regla que motiva este documento, y que puso el propio autor de `docs/16`: no
construir una solucion bonita sobre una decision todavia abierta.

**Como se cierra**: Gabino escribe su eleccion y la fecha en la linea
"DECIDIDO" de cada bloque. A partir de ahi, esa linea manda.

---

## D-UX-1: Entrar a una mesa

**Estado: es el pendiente numero uno** (decidido por Gabino el 21-09). Va por
delante de las otras cuatro porque no es una mejora de pantalla: es una
funcionalidad que **no existe**, y es de servidor.

### Lo que pasa hoy, verificado en el codigo

Para que alguien entre a tu mesa hacen falta **seis pasos**, coordinados por
fuera de la aplicacion:

1. Se registra en el sitio.
2. Te dice **su correo** por WhatsApp o de viva voz.
3. Tu le mandas **solicitud de amistad**.
4. El la **acepta**.
5. Tu lo invitas a la mesa buscandolo por ese correo.
6. El recarga y ya ve la mesa.

La regla esta escrita en `TableMemberActionController`: *"Auth por amistad
(docs/09): sin amistad aceptada no hay invitacion"*. **No hay enlace de
invitacion ni codigo de mesa en ninguna parte del producto.**

Esto explica algo que se venia tratando como dos problemas separados: la
sesion con invitados del 20-09 no empezo mal en la primera narracion, empezo
mal **antes**. Y es la razon de fondo de que el anfitrion acabe operando la
aplicacion durante toda la partida.

### Lo que esta en juego, y que no es obvio

**El que entra por un enlace gasta turnos del anfitrion.** El cupo se descuenta
siempre de `owner_id`, no de quien juega (verificado en `QuotaService`). Un
enlace filtrado no es solo alguien colandose en una ficcion: es **dinero de
Gabino o de un cliente**. Eso descarta el enlace eterno y publico.

Agravante de hoy: `MAIL_MAILER=log` y `ATOMO_REQUIRE_EMAIL_VERIFICATION=false`
en produccion. **El correo no prueba nada**: cualquiera se registra con una
direccion ajena y nadie lo verifica. Asi que la identidad del que entra no la
da el correo; la da el enlace.

### Opciones

**A. Enlace con token, caducidad y revocacion (recomendada).**
El anfitrion genera un enlace por mesa. Quien lo abre: si no tiene cuenta, se
registra (dos campos) y entra; si la tiene, entra directo. Elige personaje
entre los libres.
- Caduca (propuesta: 7 dias o al cerrar la campaña) y se puede **revocar y
  regenerar** desde la mesa.
- **Tope de plazas**: el enlace deja entrar hasta N personas, no infinitas. Es
  la proteccion real contra el gasto, mas que la caducidad.
- El sistema de amistades **se queda** para la lista de amigos y para invitar
  sin enlace, pero deja de ser obligatorio.
- Coste: medio. Tabla o columna para el token, dos endpoints, pantalla de
  aterrizaje y el alta de miembro. Toca API y los dos clientes.

**B. Codigo corto de mesa** (tipo "MASQ-7412") que el invitado escribe.
- Ventaja: se dice en voz alta por telefono, sirve en persona, no hace falta
  copiar un enlace largo.
- Desventaja: **es adivinable si es corto**, y sin verificacion de correo no
  hay segunda barrera. Obliga a codigos mas largos o a limitar intentos.
- Coste: parecido a A.

**C. Las dos**: el enlace lleva el codigo dentro, y el codigo se puede teclear.
- Es lo que hacen Jackbox o Among Us, y cubre el caso presencial (todos en la
  misma mesa con sus telefonos) y el remoto (WhatsApp).
- Coste: A mas un formulario.

**D. No hacer nada y mejorar el flujo de amistad.**
- Honesto de considerar, pero no resuelve el problema: seis pasos siguen siendo
  seis pasos, y el invitado sigue necesitando que el anfitrion actue.

**Recomendacion: A, con el tope de plazas como proteccion principal**, dejando
B para cuando haya partidas presenciales que lo pidan. La caducidad da
tranquilidad, pero lo que de verdad frena el gasto es el numero de asientos.

> **DECIDIDO:** _(pendiente)_

---

## D-UX-2: Mobile-first o web primero

Contradiccion entre `docs/16` (principio 5) y la directriz primaria de
`docs/11`:215.

### Lo que esta en juego

La directriz del 2026-09-06 dice que **la web de Next.js es el producto
principal**: mesa propia, independiente de la movil, cara para streamers, y
ante cualquier disyuntiva gana la web. `docs/16` propone lo contrario: 390x844
como referencia y escritorio compuesto despues.

Ninguna de las dos es absurda. A favor del movil: el invitado real entra por
telefono, y diseñar a 390px obliga a una jerarquia honesta que a 1280px es
facil de evitar (el pie saturado de hoy es exactamente ese sintoma). A favor de
la web: es donde se ve el producto, donde se comparte pantalla y donde esta el
publico de streaming que Gabino busca.

### Opciones

**A. Se mantiene la directriz.** La web manda; el movil guarda paridad
funcional pero no de acabado. `docs/16` corrige su principio 5.

**B. Se cambia la directriz a mobile-first.** Entonces se corrige **`docs/11` y
la memoria del proyecto**, no solo `docs/16`. Una directriz que se contradice
en otro documento deja de ser directriz.

**C. Separar composicion de acabado (recomendada).** La **jerarquia** se diseña
a 390px, porque ahi se nota si sobra algo; el **acabado** (pulido, modo
pantalla, tipografia, la cara para streamers) se hace primero en web. Respeta
la directriz en lo que la motivo y toma lo bueno del principio 5.

> **DECIDIDO:** _(pendiente)_

---

## D-UX-3: Quien cierra el turno

Hoy lo cierra el anfitrion, a mano. `docs/16` propone resolucion automatica
cuando todos han respondido. Es el cambio de mayor alcance de esa propuesta.

### Lo que el cierre manual sostiene hoy

1. **Cuesta dinero.** 0.019 USD por turno medidos, cobrados como creditos. Es
   **la unica palanca contra el gasto involuntario**.
2. **El que se fue sin avisar.** Existe "me tengo que ir" y el ausente no
   cuenta, pero quien cierra el navegador sin marcarlo, no. Con cierre
   automatico "todos respondieron" no llega nunca y la mesa se cuelga; hoy el
   anfitrion fuerza el cierre.
3. **El que llega tarde o se corrige.** Hoy se puede reescribir la declaracion
   mientras el turno sigue abierto. Con cierre automatico, el ultimo en enviar
   dispara la narracion y le quita a los demas esa posibilidad.

Y a favor del automatico, que es serio: **es la mitad de "que el anfitrion no
tenga que operar la aplicacion"**, que es la segunda hipotesis de `docs/16` y
probablemente la mas importante para que una partida fluya.

### Opciones

**A. Se queda manual.** Cero trabajo. El anfitrion sigue operando.

**B. Automatico puro.** Cuando todos respondieron, narra. Simple, y rompe los
tres casos de arriba.

**C. Cuenta atras visible y cancelable (recomendada).** Cuando todos han
respondido: *"El director narra en 10 segundos. Cancelar."* Automatico de facto
para la mayoria de los turnos, deja la palanca de coste (cualquiera cancela) y
da salida a corregirse. Para el colgado del punto 2 hace falta ademas un
**tiempo maximo de turno** tras el cual el anfitrion ve "forzar cierre".
- Coste: bajo en cliente, nulo en motor.

**D. C, y ademas configurable por mesa** (manual / automatico / con cuenta
atras), dentro del nivel "personalizada" de D-UX-5.

> **DECIDIDO:** _(pendiente)_

---

## D-UX-4: El coste por turno como restriccion de interfaz

`docs/16` no menciona el coste ni una vez en todo el documento. No es una
omision menor: es la restriccion mas dura del producto y deberia estar al nivel
de la latencia.

### Los numeros, medidos

- **0.019 USD por turno.**
- Una sesion de 20 turnos con cuatro jugadores: **1.26 USD con Sonnet, 0.42 con
  Haiku**.
- Se vende como **creditos de prepago en turnos**, no por tiempo.
- **Lo paga el dueño de la mesa**, no cada jugador.
- Un **reintento tambien cuesta**: el motor reintenta una vez cuando el modelo
  falla, y ese es un turno pagado que nadie pidio.

### Lo que hay que decidir

No es si el coste existe, sino **cuanto se le enseña al jugador**.

**A. Invisible durante la partida (recomendada).** El saldo se ve al crear la
mesa y en el perfil, no en la mesa. Motivo: un contador de dinero bajando
durante una escena mata la ficcion, y es el anfitrion quien paga, no el
jugador. Aviso solo cuando queda poco, y solo al anfitrion.

**B. Visible siempre** para todos. Honesto y frio.

**C. Visible solo para el anfitrion**, discreto.

En cualquiera de las tres queda una regla que no se negocia: **todo boton que
dispare una narracion gasta dinero de alguien**, y eso condiciona el automatico
de D-UX-3. Y el saldo no debe mentir: quien trae su clave (BYOK) no gasta cupo,
y ya hubo que corregir un texto que le decia "te quedan 80 turnos" a quien no
gastaba ninguno.

> **DECIDIDO:** _(pendiente)_

---

## D-UX-5: Arquitectura de superficies

`docs/16` propone `SessionMobile` / `SessionTablet` / `SessionDesktop`
compartiendo estado y dominio pero no composicion, y tres niveles de
configuracion (recomendada / personalizada / avanzada).

### Lo que ya esta a favor

El monorepo esta preparado: `packages/*` no importa React, Next ni Expo (lo
vigila eslint), y `packages/ui-logic` decide **que** se ve sin pintar nada, con
140 tests. Separar composicion por cliente no rompe nada de eso.

Y hay un sintoma que ya se cobro: el mapa nacio dentro del pie de la mesa,
compartido, y **se veia cortado en escritorio** porque ese pie esta limitado al
55% del alto. Hubo que sacarlo a pantalla completa. Lo mismo pasara con la
ficha y con el historial.

### Lo que hay que decidir

**A. Tres composiciones separadas**, como propone `docs/16`.
- Ventaja: cada pantalla se diseña para su tamaño.
- Riesgo real: **triplica la superficie de mantenimiento**, y hoy el equipo es
  una persona. Cada funcion nueva se implementa tres veces o se olvida en dos.

**B. Dos composiciones** (movil y escritorio), con la tablet cayendo en una de
las dos. Es lo que hay hoy de facto (web y app).

**C. Una composicion adaptable**, como hoy, arreglando los casos concretos que
duelen (el pie saturado).

**Recomendacion: B**, y tratar "tablet" como escritorio estrecho. La tercera
composicion se añade cuando alguien juegue de verdad en tablet, no antes.

Sobre los tres niveles de configuracion: **de acuerdo sin reservas**. Ya existe
el nivel "recomendada" de facto (el boton "Iniciar partida" abre la sesion
sugerida sin preguntar nada) y funciono.

> **DECIDIDO:** _(pendiente)_

---

## Lo que NO se decide aqui

- **Que se construye primero.** Eso sale de medir con gente real (`docs/14`), y
  la medicion va **despues** de D-UX-1, porque hoy medir el flujo de entrada
  mediria el via crucis de la amistad, no el juego.
- **El concept board.** Se rehace cuando estas cinco esten cerradas; redibujar
  antes es trabajo que se tira.
- **Lo visual congelado** de `docs/14`. Sigue congelado.

## Orden propuesto, una vez cerradas

1. **D-UX-1**: enlace de invitacion. Es lo unico que hoy impide que alguien
   entre sin que el anfitrion lo lleve de la mano.
2. **Medir con gente real** los tres flujos que `docs/16` llama fricciones:
   entrar, crear, primer turno.
3. Lo que salga de esa medicion, con las decisiones 2 a 5 ya cerradas como
   marco.

Relacionado: `docs/16` (la propuesta anotada), `docs/17` (estado del proyecto),
`docs/13` (las decisiones de UX ya tomadas y su riesgo), `docs/14` (lo
congelado y por que).
