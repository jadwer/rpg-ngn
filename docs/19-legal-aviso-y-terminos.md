# 19. Textos legales: aviso de privacidad y terminos de servicio

Fecha: 2026-09-22. Estado: **PUBLICADO como version 1**, pendiente de revision
de abogado.

**Decision de Gabino (22-09): publicar antes de la revision.** Su razon, que es
buena: tener algo publicado protege mas que no tener nada mientras se espera al
abogado. Las paginas estan en `/terminos` y `/privacidad`, enlazadas desde el
pie de la portada y desde el registro en web y movil. Lo que el abogado cambie
se publica como version 2.

Este archivo contiene los dos textos que faltan para abrir el servicio a
usuarios (`ROADMAP.md`, "Antes de abrir a usuarios reales"). Se escribieron
**a partir del codigo y del servidor reales**, no de una plantilla: cada dato
que se afirma abajo se comprobo el dia del corte.

## Como usar este documento

1. **Los marcadores `<ASI>` los rellena Gabino** antes de la revision legal.
   Son cinco y estan listados en la seccion siguiente.
2. **El abogado revisa y da el visto bueno.** Al final hay una lista de
   preguntas concretas para el, que es donde conviene que gaste su tiempo.
3. Despues se publican como `/privacidad` y `/terminos` en la web, con enlace
   en el pie y en el registro.

**Lo que este documento NO es**: asesoria legal. Es un borrador tecnico escrito
por quien conoce el sistema, para que el abogado no tenga que averiguar que
hace el software.

## Decisiones de Gabino que lo condicionan (22-09)

| Decision | Consecuencia en el texto |
|---|---|
| **Responsable: persona fisica, Gabino Ramirez** | El aviso va a su nombre y RFC, no a nombre de Atomo |
| **Solo mayores de 18** | Clausula de edad, y hay que **añadir la casilla al registro** (hoy no se pide) |
| **Mexico y LATAM** | Se escribe sobre la LFPDPPP mexicana; no se promete cumplimiento RGPD |
| **Se declara que no se entrena con el texto de los jugadores** | Clausula expresa sobre el proveedor de IA |

## Lo que falta rellenar

- `<RFC>`: RFC de Gabino como persona fisica con actividad empresarial.
- `<DOMICILIO>`: domicilio fiscal completo, que la LFPDPPP exige en el aviso.
- `<CORREO_PRIVACIDAD>`: buzon para ejercer derechos ARCO. Recomendacion:
  `privacidad@gabinoramirez.com`, que hoy **no existe** y hay que crear.
- `<FECHA_PUBLICACION>`: la fecha en que se publiquen.
- `<ESTADO>`: entidad federativa para la clausula de jurisdiccion.

---

## Hechos verificados del sistema (base de los dos textos)

Esto es lo que el abogado necesita saber y no puede adivinar. Todo comprobado
en produccion el 2026-09-22.

### Datos personales que se recogen

| Dato | Donde vive | Origen |
|---|---|---|
| Nombre, correo | tabla `users` | lo escribe el usuario al registrarse |
| Contraseña | `users`, **cifrada con hash bcrypt** | nunca se guarda ni se ve en claro |
| Marca y **ultimos 4 digitos** de la tarjeta | `payment_transactions` | los devuelve Stripe |
| Historial de compras y saldo de turnos | `payment_transactions`, `quotas` | generado por el uso |
| Texto que escribe el jugador en la partida | `turn_responses`, `campaign_events` | lo escribe el usuario |
| Descripcion libre del personaje ("personalidad") | `table_members.persona` | lo escribe el usuario |
| Registro de actividad y sesiones | `activity_log`, `sessions`, `personal_access_tokens` | automatico |
| Clave propia de proveedor de IA (BYOK), **cifrada** | `provider_configs` | opcional, la pone el usuario |

**El numero completo de la tarjeta NO pasa por el servidor ni se guarda**: el
cobro se hace con Stripe Elements, que recoge el dato en el navegador y lo
manda directo a Stripe. Es un hecho relevante para el aviso y es comprobable.

### Con quien se comparten, y para que

| Tercero | Que recibe | Para que | Donde esta |
|---|---|---|---|
| **Anthropic** (o el proveedor que elija el usuario) | el texto de la partida y las fichas de los personajes | generar la narracion del turno | EEUU |
| **Stripe** | datos de pago y correo | cobrar | EEUU / Irlanda |
| **Resend** | correo y contenido de los correos enviados | mandar recuperacion de contraseña y bienvenida | EEUU |
| **Hetzner** | todo lo anterior, como alojamiento | servidor | **Alemania (Nuremberg)** |

**Hay transferencia internacional de datos** y el aviso tiene que decirlo: el
servidor esta en Alemania y tres proveedores estan en Estados Unidos.

### Lo que NO se hace

- **No se venden datos a nadie.** No hay integracion publicitaria ni analitica
  de terceros en el producto.
- **No se entrena ningun modelo de IA con el texto de los jugadores.** Anthropic
  no usa datos de su API para entrenar por defecto. El texto viaja para generar
  la respuesta del turno y nada mas.
- **No se lee el correo del usuario** ni se accede a otros servicios suyos.

### Cosas incomodas que conviene declarar, no esconder

Tres puntos que el abogado debe conocer porque afectan a lo que se puede
prometer:

1. **El registro de partidas es de solo-anexar por diseño** (`campaign_events`
   esta protegida por un disparador en la base que impide modificar y borrar).
   Es lo que garantiza que la partida no se reescribe. **Consecuencia: borrar
   por completo lo que un jugador escribio no es inmediato** y hay que decir
   como se cumple el derecho de cancelacion. Propuesta en el texto: se borra la
   cuenta y se disocia al usuario de lo escrito, conservando el registro de la
   partida sin datos que identifiquen a la persona.
2. **Hoy no existe borrado de cuenta ni borrado de mesas** en el producto.
   Gabino lo señalo el 22-09 y tiene razon: un usuario **no puede borrar ni
   archivar una mesa suya**. Solo existe `php artisan tables:prune`, que es un
   comando de servidor que ejecuta el administrador. Con los textos publicados,
   esto pasa de incomodidad a **promesa incumplida**: el aviso reconoce el
   derecho de cancelacion y los terminos dicen que se puede dejar de usar el
   Servicio. Hay que construirlo, y **archivar no es borrar**: la mesa
   archivada deja de verse pero el registro sigue, que es justo la disociacion
   que describe el punto 5 del aviso.
3. **El correo no prueba identidad**: cualquiera puede registrarse con una
   direccion ajena porque la verificacion esta apagada. Afecta a que se puede
   afirmar sobre la titularidad de una cuenta.

### Lo que el usuario paga

- **Creditos de prepago medidos en turnos**, no suscripcion ni tiempo.
- Cuatro paquetes (2, 5, 10 y 15 USD). Tres planes anunciados pero **apagados**.
- **Lo paga el dueño de la mesa**, no cada jugador.
- **Stripe esta en modo prueba al dia del corte**: no se puede publicar el texto
  de cobro hasta pasar a modo real.

---

# AVISO DE PRIVACIDAD INTEGRAL

**Ultima actualizacion: `<FECHA_PUBLICACION>`**

## 1. Quien es responsable de tus datos

`<TITULAR: Gabino Ramirez>`, persona fisica con actividad empresarial, con RFC
`<RFC>` y domicilio en `<DOMICILIO>`, es responsable del tratamiento de los
datos personales que nos proporcionas al usar **rpg-worlds**
(https://rpg-worlds.gabinoramirez.com), en adelante "el Servicio".

Este aviso se emite conforme a la Ley Federal de Proteccion de Datos Personales
en Posesion de los Particulares y su Reglamento.

Para cualquier asunto relacionado con tus datos: `<CORREO_PRIVACIDAD>`.

## 2. Que datos recogemos

**Los que nos das al crear tu cuenta:** nombre y correo electronico.

**Los que generas al jugar:** el texto que escribes en tus partidas, la
descripcion que hagas de tu personaje, y el historial de las mesas en las que
participas.

**Los que genera tu actividad:** fecha y hora de tus accesos, tu saldo de
turnos y tu historial de compras.

**Si compras creditos:** la marca de tu tarjeta y sus ultimos cuatro digitos.
**Nunca recibimos ni almacenamos el numero completo de tu tarjeta, su fecha de
vencimiento ni su codigo de seguridad**: esos datos los captura directamente
nuestro procesador de pagos en tu navegador y no pasan por nuestros servidores.

**Si decides usar tu propia clave de un proveedor de inteligencia artificial:**
esa credencial, que guardamos cifrada y no volvemos a mostrarte completa.

**Tu contraseña** se guarda transformada mediante un algoritmo de cifrado
irreversible. Nadie, incluido el responsable, puede leerla.

No recogemos datos personales sensibles.

## 3. Para que los usamos

Usamos tus datos para las siguientes finalidades, todas **necesarias** para
prestarte el Servicio:

- Crear y mantener tu cuenta, y permitirte iniciar sesion.
- Hacer funcionar las partidas: mostrar a los demas jugadores de tu mesa lo que
  ocurre en la ficcion y generar la narracion.
- Cobrarte los creditos que compres y llevar tu saldo.
- Enviarte correos imprescindibles: recuperacion de contraseña y confirmacion de
  tu registro.
- Atender lo que nos pidas y cumplir obligaciones legales, incluidas las
  fiscales.

**Finalidad adicional, que puedes rechazar sin que afecte a tu uso del
Servicio:** enviarte avisos sobre tus mesas (por ejemplo, que es tu turno o que
alguien abrio una sesion). Puedes oponerte escribiendo a
`<CORREO_PRIVACIDAD>`.

**No vendemos tus datos, no los cedemos con fines publicitarios y no hacemos
perfiles comerciales contigo.**

## 4. Con quien los compartimos

Para que el Servicio funcione, algunos datos se transmiten a proveedores que
actuan por nuestra cuenta:

| Proveedor | Que recibe | Para que | Pais |
|---|---|---|---|
| Anthropic PBC | el texto de tu partida y las fichas de los personajes | generar la narracion | Estados Unidos |
| Stripe, Inc. | tu correo y los datos del cobro | procesar el pago | Estados Unidos |
| Resend, Inc. | tu correo y el contenido del mensaje | enviarte correos | Estados Unidos |
| Hetzner Online GmbH | alojamiento de la informacion | servidores | Alemania |

**Esto implica transferencias internacionales de datos.** Al usar el Servicio
consientes dichas transferencias, que se realizan unicamente para las
finalidades descritas en este aviso.

**Sobre la inteligencia artificial que dirige tus partidas:** el texto que
escribes se transmite al proveedor del modelo exclusivamente para generar la
respuesta de ese turno. **Ese contenido no se utiliza para entrenar modelos de
inteligencia artificial.** Si prefieres usar tu propia cuenta con un proveedor,
puedes hacerlo, y en ese caso la relacion con ese proveedor es tuya y se rige
por sus condiciones.

No compartimos tus datos con ninguna otra persona o empresa, salvo requerimiento
de autoridad competente.

## 5. Tus derechos (ARCO)

Tienes derecho a **acceder** a tus datos, **rectificarlos** si son inexactos,
**cancelarlos** cuando consideres que no son necesarios, y **oponerte** a un
uso concreto. Tambien puedes **revocar tu consentimiento** en cualquier momento.

Para ejercerlos, escribe a `<CORREO_PRIVACIDAD>` desde el correo de tu cuenta,
indicando que solicitas y aportando un documento que acredite tu identidad.
**Te responderemos en un plazo maximo de 20 dias habiles**, y si procede, se
hara efectivo dentro de los 15 dias habiles siguientes.

**Como funciona la cancelacion, en concreto:** al cancelar tu cuenta eliminamos
tu nombre, tu correo y tus credenciales. El registro de las partidas que jugaste
se conserva **disociado de tu identidad**, porque una partida es una obra
colectiva y borrarla afectaria a los demas jugadores de esa mesa. A partir de
ese momento, ese registro ya no permite identificarte.

**Lo que conservamos aunque canceles, y por que:** los comprobantes de las
compras que hayas realizado, durante el plazo que exige la legislacion fiscal.

## 6. Cuanto tiempo conservamos tus datos

- **Datos de tu cuenta**: mientras la cuenta exista.
- **Partidas**: mientras existan, o de forma disociada si cancelas tu cuenta.
- **Datos de facturacion**: el plazo que exija la legislacion fiscal aplicable.
- **Registros de acceso**: los necesarios para la seguridad del Servicio.

## 7. Como los protegemos

La informacion viaja cifrada entre tu dispositivo y nuestros servidores
(HTTPS). Las contraseñas se guardan cifradas de forma irreversible y las
credenciales de proveedores externos se guardan cifradas. El acceso a los
servidores esta restringido y se realizan copias de seguridad periodicas.

Ningun sistema es invulnerable. Si ocurriera una vulneracion que afecte de
forma significativa a tus datos, te lo comunicaremos.

## 8. Edad minima

**El Servicio esta dirigido exclusivamente a mayores de 18 años.** No recogemos
datos de menores de edad de forma consciente. Si detectamos una cuenta de una
persona menor de edad, la cancelaremos y eliminaremos sus datos.

## 9. Cambios a este aviso

Si modificamos este aviso, publicaremos la nueva version en esta misma
direccion y actualizaremos la fecha. Si el cambio afecta de forma sustancial a
como usamos tus datos, te lo avisaremos por correo.

## 10. Autoridad

Si consideras que tu derecho a la proteccion de datos ha sido vulnerado, puedes
acudir al **INAI** (Instituto Nacional de Transparencia, Acceso a la
Informacion y Proteccion de Datos Personales): www.inai.org.mx.

---

# TERMINOS Y CONDICIONES DE USO

**Ultima actualizacion: `<FECHA_PUBLICACION>`**

## 1. Que es esto y quien lo ofrece

rpg-worlds es un servicio en linea para jugar partidas de rol narrativo en las
que **la direccion del juego la realiza un sistema de inteligencia artificial**
en lugar de una persona.

Lo ofrece `<TITULAR: Gabino Ramirez>`, RFC `<RFC>`, con domicilio en
`<DOMICILIO>`.

Al crear una cuenta aceptas estos terminos. Si no estas de acuerdo con ellos,
no uses el Servicio.

## 2. Quien puede usarlo

Debes ser **mayor de 18 años** y tener capacidad legal para obligarte. Al
registrarte declaras que cumples ambos requisitos.

Eres responsable de la actividad que ocurra en tu cuenta y de mantener tu
contraseña en secreto. Avisanos si crees que alguien mas accedio a ella.

## 3. Como funcionan los creditos

El Servicio se paga con **creditos de prepago medidos en turnos**. No es una
suscripcion: no se renueva solo ni se te cobra de forma periodica.

- Un **turno** es una intervencion del director de juego: se consume cuando la
  mesa cierra el turno y el sistema genera la narracion.
- **Los turnos los paga quien crea la mesa**, no cada jugador. Si invitas a
  alguien a tu mesa, sus intervenciones consumen tus turnos.
- Si un turno **falla por un error del sistema**, no se te cobra.
- Los creditos **no caducan** mientras tu cuenta exista.
- Los creditos **no son transferibles ni canjeables por dinero**.

Los precios se muestran antes de cada compra. Podemos modificarlos en el
futuro; los cambios **no afectan a los creditos que ya compraste**.

## 4. Devoluciones

Si los creditos no funcionaron por un fallo atribuible al Servicio, escribenos
a `<CORREO_PRIVACIDAD>` y te devolvemos el importe correspondiente.

**Los creditos ya consumidos no son reembolsables**, porque cada turno gastado
representa un coste real ya incurrido.

## 5. Contenido: tuyo, nuestro y generado por la maquina

**Lo que tu escribes es tuyo.** Conservas los derechos sobre el texto que
escribes en tus partidas. Nos concedes unicamente la licencia necesaria para
almacenarlo, mostrarlo a los demas jugadores de tu mesa y transmitirlo al
proveedor del modelo para generar la narracion.

**Los mundos de juego** que ofrecemos son de sus respectivos autores, y se usan
dentro del Servicio conforme a lo que cada uno permita.

**Sobre la narracion que genera la inteligencia artificial**, y esto es
importante que lo entiendas:

- El texto que produce el director de juego **lo genera un modelo de lenguaje**,
  y puede contener errores, incoherencias o contenido inesperado.
- **No garantizamos que la narracion sea original ni unica.** Dos partidas
  distintas pueden recibir textos parecidos.
- **No respondemos del contenido narrativo generado** mas alla de retirar lo que
  resulte manifiestamente inapropiado cuando se nos informe.

Si algo generado por el sistema te parece inaceptable, avisanos.

## 6. Lo que no puedes hacer

- Usar el Servicio para actividades ilegales, o para producir contenido que
  promueva el odio, la violencia real contra personas, el abuso sexual infantil
  o el acoso.
- Intentar acceder a cuentas o partidas ajenas, o eludir los limites de
  creditos.
- Automatizar el uso del Servicio para consumir recursos de forma masiva.
- Revender el acceso al Servicio sin nuestro permiso.
- Subir o introducir contenido sobre el que no tengas derechos.

Podemos suspender una cuenta que incumpla estos puntos. Si la suspension no
esta justificada, se restituye.

## 7. Disponibilidad del Servicio

El Servicio se ofrece **"tal cual"**. Trabajamos para que este disponible, pero
**no garantizamos que funcione de forma ininterrumpida ni libre de errores**.
Puede haber interrupciones por mantenimiento, por fallos de nuestros
proveedores o por causas ajenas a nosotros.

**Dependemos de servicios de terceros** (el proveedor del modelo de inteligencia
artificial, el procesador de pagos y el alojamiento). Una interrupcion en
cualquiera de ellos puede afectar al Servicio.

## 8. Limitacion de responsabilidad

En la medida que permita la ley, nuestra responsabilidad total frente a ti por
cualquier reclamacion relacionada con el Servicio **no excedera el importe que
hayas pagado en los tres meses anteriores** al hecho que la origine.

No respondemos de daños indirectos, perdida de datos de partidas por causas
ajenas a nuestro control, ni de lo que otros usuarios escriban en tus mesas.

Nada de lo anterior limita la responsabilidad que por ley no puede limitarse.

## 9. Cancelacion

**Tu puedes dejar de usar el Servicio cuando quieras** y solicitar la
cancelacion de tu cuenta escribiendo a `<CORREO_PRIVACIDAD>`. La cancelacion
implica la perdida de los creditos no consumidos.

**Nosotros podemos suspender o cancelar tu cuenta** si incumples estos terminos,
avisandote del motivo salvo que la ley lo impida.

Podemos dejar de ofrecer el Servicio. Si lo hacemos, te avisaremos con
antelacion razonable y **te devolveremos los creditos no consumidos**.

## 10. Cambios a estos terminos

Podemos modificar estos terminos. Publicaremos la version nueva en esta misma
direccion. Si el cambio es sustancial, te avisaremos por correo con antelacion.
Seguir usando el Servicio despues de un cambio significa que lo aceptas.

## 11. Ley aplicable y jurisdiccion

Estos terminos se rigen por las leyes de los Estados Unidos Mexicanos. Para
cualquier controversia, las partes se someten a los tribunales competentes de
`<ESTADO>`, renunciando a cualquier otro fuero.

---

## Preguntas para el abogado

El texto de arriba esta completo. Estas son las cinco cosas donde conviene que
gaste su tiempo, porque son las que no puedo resolver yo:

1. **La clausula de cancelacion con registro de solo-anexar** (aviso, punto 5).
   El diseño del sistema impide borrar lo escrito en una partida sin destruir
   la partida de los demas. La solucion propuesta es **disociar** en vez de
   borrar. ¿Es suficiente frente a la LFPDPPP, y esta bien redactado?

2. **Limitacion de responsabilidad por contenido generado por IA** (terminos,
   puntos 5 y 8). El director de juego es un modelo de lenguaje que produce
   texto libre. ¿Esta bien acotado el riesgo? ¿Falta alguna advertencia?

3. **Turnos pagados por el anfitrion y consumidos por invitados** (terminos,
   punto 3). Una persona paga y otras gastan lo que pago. ¿Requiere algo mas,
   sobre todo de cara a la proteccion del consumidor?

4. **Transferencia internacional de datos** (aviso, punto 4). Servidor en
   Alemania y tres proveedores en Estados Unidos, con usuarios mexicanos.
   ¿Basta el consentimiento por aceptacion del aviso o hace falta algo mas?

5. **Devoluciones y PROFECO** (terminos, punto 4). Se venden creditos digitales
   de consumo inmediato. ¿La politica propuesta cumple con lo que exige la
   normativa de proteccion al consumidor en Mexico?

## Lo que ya esta publicado

- [x] **Paginas `/privacidad` y `/terminos`** en la web, enlazadas desde el pie
  de la portada y desde el registro.
- [x] **Aviso de aceptacion en el registro**, en web y en la app: "al crear la
  cuenta declaras que eres mayor de 18 años y aceptas...". En la app los
  enlaces apuntan al **servidor al que se conecta**, no a una URL fija.

## Lo que el texto promete y el software todavia no cumple

Esto es deuda declarada, no un descuido. Cada linea es una promesa publicada
que hay que sostener:

- [x] **Retirar una mesa desde el producto** (22-09): archivar siempre, borrar
  solo si nunca se jugo, y salir de la mesa para el invitado. Era lo mas
  urgente de esta lista.
- [ ] **Borrado de cuenta** con la disociacion que describe el punto 5 del
  aviso. Hoy se cumpliria a mano, y el plazo de 20 dias habiles esta publicado.
- [ ] **Guardar la aceptacion**: hoy el aviso se muestra pero **no se registra
  quien acepto, cuando y que version**. Sin eso, la aceptacion es dificil de
  probar. Es una columna y un dato al registrar.
- [ ] **Casilla de edad explicita.** Hoy se declara en el texto del boton; una
  casilla separada es mas defendible.
- [ ] **Buzon `privacidad@gabinoramirez.com`**, que hoy **no existe** y esta
  publicado en los dos documentos. Es lo mas rapido de arreglar y lo mas
  visible si alguien escribe.
- [ ] **Stripe en modo real.** Sigue en modo prueba, asi que el apartado de
  creditos describe algo que todavia no cobra de verdad.

Relacionado: `docs/17` (estado del proyecto), `docs/15` (packs de la comunidad,
que añadira obligaciones nuevas sobre contenido de terceros), `docs/07`
(procedencia del contenido).
