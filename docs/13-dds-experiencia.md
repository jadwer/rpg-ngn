# 13. Documento de diseño de sistema: la experiencia de rpg-ngn

Estado: borrador para revisión externa. Fecha: 2026-09-20.
Autor del borrador: Claude (el asistente que construyó la interfaz actual).
Destinatario: un revisor de diseño de producto y experiencia de usuario que no
conoce este proyecto.

Este documento describe lo que hoy existe en producción, por qué está así y
dónde sospechamos que está mal. No describe lo que nos gustaría tener. Donde
una decisión fue mía y no del dueño del producto, lo digo, porque son
justamente las que hay que revisar con más dureza.

La sección 12, al final, dice exactamente qué se espera de la revisión.

---

## 1. Qué es el producto

rpg-ngn es un motor de juego de rol de mesa donde el **director de juego es un
modelo de lenguaje**. Un grupo de amigos crea una mesa, cada uno elige un
personaje y juegan por turnos: cada jugador escribe lo que hace su personaje,
y cuando todos han escrito, el director narra las consecuencias.

No es un chat con una IA. Es una mesa de rol con varias personas a la vez,
donde la IA ocupa la silla del director.

### 1.1 Qué lo hace distinto

- **Por turnos, no en tiempo real.** Nadie compite por hablar. Todos escriben,
  el director narra, se repite.
- **El motor manda sobre el modelo.** El modelo propone hechos; el motor los
  valida contra las reglas y solo entonces cuentan. Los dados los tira el
  servidor, no el modelo.
- **Agnóstico de sistema de juego.** Hay tres conjuntos de reglas en
  producción: fantasía con d20, intriga cortesana sin combate, y una comedia
  de enredos sociales donde lo que cambia son las relaciones.
- **El contenido son datos.** Cada mundo es un "pack" (personajes, lugares,
  secretos, sesiones escritas) en archivos, no en el código.

### 1.2 Cómo se paga

Prepago en turnos, no suscripción. Cuatro paquetes (2, 5, 10, 15 USD). Quien
trae su propia clave de API no paga ni consume cupo. Hay un cupo gratuito para
probar.

---

## 2. Quiénes lo usan

Basado en las partidas reales jugadas hasta hoy, no en personas inventadas.

**El anfitrión.** Convoca la partida. Crea la mesa, invita, elige el pack,
abre y cierra la sesión, y además juega su propio personaje. Suele ser quien
ya jugó rol antes y arrastra a los demás. Hoy carga con toda la complejidad de
la aplicación.

**El jugador invitado.** Llega por un amigo. Muchos **no han jugado rol
nunca**. Entra, elige personaje y escribe. No quiere aprender un sistema de
reglas: quiere que le cuenten una historia y decidir qué hace. Es la mayoría y
es el usuario que peor tratamos hoy.

**El espectador (futuro).** Una partida se puede proyectar. Existe un "modo
pantalla" pensado para compartir por streaming.

### 2.1 Contexto de uso real

Las partidas jugadas fueron con gente en la misma casa, cada uno con su
teléfono, y una pantalla grande compartida. También hay jugadores remotos. Las
sesiones duran entre una y tres horas, de noche. Una parte importante del uso
es en **teléfono**, con un navegador, no con la aplicación nativa.

---

## 3. Superficies

| Superficie | Qué es | Estado |
|---|---|---|
| Web (Next.js) | Producto principal, la mesa completa | En producción |
| Aplicación móvil (Expo) | Paridad funcional, para el jugador en su teléfono | En producción, sin publicar en tiendas |
| Visor de fichas | Página estática con las hojas de personaje | Publicado aparte |

La directriz del dueño del producto es **la web primero**: es la cara pública,
la que se ve en streaming y la que debe ganar cualquier disyuntiva. La
aplicación móvil replica lo mismo.

Las dos superficies comparten toda la lógica de presentación (qué texto
mostrar, qué puede hacer cada asiento, cómo se agrupan los bloques narrativos)
en un paquete común. Solo cambian los componentes visuales. Esto es
intencional: evita que una pantalla diga una cosa y la otra diga otra.

---

## 4. El recorrido completo, pantalla por pantalla

### 4.1 Entrada

**Portada** con el nombre del producto, una frase y dos acciones: entrar y
crear cuenta. Debajo, una demostración con narración ya escrita, para ver de
qué va sin registrarse.

**Crear cuenta**: nombre, correo, contraseña. No hay verificación de correo
(está desactivada a propósito: quien se registra entra directo). **El correo
saliente no funciona en el servidor**, así que "recuperar contraseña" está roto
hoy. Es un problema conocido y grave.

### 4.2 Lista de mesas

Tarjetas con una mesa cada una: nombre, estado, qué personaje juegas, el pack
y los demás miembros. Arriba, un botón para crear mesa. La lista se refresca
sola cada diez segundos.

Si tienes invitaciones de amistad pendientes, aparece un aviso arriba con un
enlace a la sección de amigos.

### 4.3 Crear mesa

Un formulario largo, en una sola pantalla:

1. Nombre de la mesa.
2. Qué van a jugar (selector de packs, con una línea de resumen).
3. Tu personaje (cuadrícula de retratos, o "sin personaje" para solo dirigir).
4. Director de juego (proveedor de IA; por omisión el del servidor).
5. Premisa opcional: texto libre que el director recibe como intención de la
   escena.

Al enviar, la mesa se crea y aparece un panel para invitar amigos, con un
botón "Ir a la mesa".

**Problema conocido**: es la pantalla más larga del producto y la primera que
ve alguien que nunca jugó. Cinco decisiones antes de jugar nada.

### 4.4 Invitar

La aplicación exige **amistad aceptada** antes de invitar a alguien a una
mesa. El flujo es: buscar por correo exacto, enviar solicitud, que la acepte,
y entonces invitar, opcionalmente con un personaje asignado.

Esto son tres pasos y dos personas. **Es la fricción más alta del producto** y
fue una decisión de seguridad, no de experiencia: evita que un desconocido te
meta en una mesa. No hay invitación por enlace.

### 4.5 La mesa

Es la pantalla donde se juega y concentra casi todo. De arriba abajo:

- **Cabecera**: nombre de la mesa, sesión, momento del mundo, número de turno
  y quién falta por responder. Botones de fichas y modo pantalla.
- **Barra de herramientas**: dos vistas (narrativa o diálogo) y controles de
  lectura en voz alta.
- **Cuerpo**: los bloques que ha narrado el director, en orden. Es el centro
  de la experiencia y ocupa la mayor parte de la pantalla.
- **Pie**: aquí se apilan, según el caso, la tarjeta de inicio, el selector de
  personaje, el panel de personalidad, el mando del anfitrión y el cuadro de
  respuesta del turno.

El estado se consulta por sondeo cada pocos segundos (no hay conexión
persistente en esta versión).

**Problema conocido**: el pie acumula demasiadas cosas. En un teléfono, el
mando del anfitrión, el panel de personalidad y el cuadro de respuesta compiten
por el mismo espacio, y el jugador tiene que desplazarse para encontrar dónde
escribir.

### 4.6 Tipos de bloque narrativo

El director produce bloques tipados, no texto plano:

| Tipo | Qué es | Quién lo ve |
|---|---|---|
| Narración | Prosa del director | Toda la mesa |
| Diálogo | Un personaje no jugador habla, con su retrato | Toda la mesa |
| Tirada | Un dado con su resultado y para qué era | Toda la mesa |
| Sistema | Avisos: apertura de sesión, errores, notas | Toda la mesa o solo el anfitrión |

Los bloques con destinatario "anfitrión" se filtran **en el servidor**, no en
el cliente. Esto fue un fallo real: una vez se publicó una ruta interna del
servidor a todos los jugadores.

### 4.7 El turno

El jugador escribe en un cuadro de texto lo que hace su personaje. Hay atajo
de teclado para enviar. Mientras tanto, ve quién ha respondido y quién falta.

Cuando todos han respondido, **el anfitrión cierra el turno** y el director
narra. El cierre es manual a propósito: permite esperar a alguien que fue al
baño.

Al abrir sesión, el turno 1 se cierra solo, sin declaraciones: el director
presenta la escena, explica cómo se juega y devuelve la palabra. Sin esto, la
mesa arrancaba con una pantalla vacía que decía "faltan todos".

### 4.8 Dados

Dos modos por mesa:

- **El servidor tira** (por omisión): el motor tira un dado por cada personaje
  que declaró algo, *antes* de llamar al modelo, y se lo enseña. El director
  usa ese número si la acción tiene riesgo, lo publica como bloque de tirada y
  narra la consecuencia en el mismo turno. Si el modelo inventa otro número,
  se descarta y se vuelve a tirar.
- **La mesa tira**: con dados físicos; el jugador escribe su resultado.

Esto viene de un fallo real: durante seis turnos seguidos con cinco jugadores
**no apareció ni una sola tirada**, porque las instrucciones al director le
decían que propusiera la tirada y terminara el turno ahí. Las tiradas son gran
parte de la emoción de una mesa y estaban ausentes.

### 4.9 Fichas de personaje

Panel lateral con las hojas: retrato, características, capacidades, estado
vivo (vida, condiciones, inventario). Cambia según el sistema de reglas: una
mesa de intriga muestra crédito, sospecha y pistas en vez de puntos de vida.

### 4.10 Ausencias

Un jugador que se va pulsa "me tengo que ir". Deja de contar para cerrar el
turno, sale de la escena y el director recibe el aviso de apartar a su
personaje **sin matarlo**. Al volver, recupera la palabra.

### 4.11 Ajustes y pagos

Pantalla aparte: saldo de turnos, compra de paquetes con tarjeta sin salir del
sitio, y la clave propia de API. En el teléfono, la compra manda a la web.

---

## 5. Decisiones de diseño tomadas, con su motivo

Esta lista importa: casi todas son mías, y por eso son sospechosas.

| Decisión | Motivo declarado | Riesgo |
|---|---|---|
| Cierre de turno manual, por el anfitrión | Esperar a quien se levantó de la mesa | Carga al anfitrión y frena la partida si se distrae |
| Amistad obligatoria antes de invitar | Que nadie te meta en una mesa sin permiso | Tres pasos y dos personas antes de jugar |
| El servidor tira los dados por omisión | Un dado que escribe el jugador no es un dado | Quien juega con dados físicos debe cambiar un ajuste |
| Tarjeta de inicio con botón grande | "No se entiende cómo empezar la campaña" | Ocupa la pantalla y esconde lo demás |
| Panel de personalidad del jugador | Un pack lo pedía (arquetipo hecho, personalidad propia) | **Se aplicó a todos los packs por error**; corregido hoy |
| Sondeo cada pocos segundos | Simplicidad en la primera versión | Retraso perceptible al ver lo que hace otro |
| Todo en una sola pantalla de mesa | No perder el hilo de la narración | El pie se satura, sobre todo en teléfono |

---

## 6. Fallos reales encontrados jugando

Los cito porque el patrón importa más que el detalle: **todos aparecieron
jugando de verdad, ninguno lo detectó una prueba automática**.

1. **Toda mesa nueva empezaba dentro de una mina.** El pack marca qué sesiones
   ya se jugaron; la aplicación arrancaba en la primera *no* jugada. Como el
   autor del pack había marcado las dos primeras como jugadas (su campaña
   presencial), cualquier grupo nuevo empezaba en la sesión 3, a mitad de la
   historia y sin contexto. Cinco mesas de producción nacieron así.
2. **Spoiler entre mesas.** El resumen de una sesión del pack llegaba al
   director aunque ese grupo no la hubiera jugado. Gente que sí la jugó
   percibió que "se filtraba" su partida a otras mesas.
3. **Seis turnos sin un solo dado** (sección 4.8).
4. **"Sin personaje" decía "solo miras y diriges la mesa"** también al
   invitar, donde es falso: el invitado sí juega, solo elige al entrar.
5. **Fuga de una ruta del servidor** a todos los jugadores dentro de un aviso
   de error.
6. **Identificadores técnicos en pantallas de jugador**: "juegas a shiho" en
   minúscula, o "pilot@0.4.0, fantasy-d20-lite" en un selector.

Los tres primeros son de diseño, no de programación: la interfaz hacía
exactamente lo que le pedimos, y lo que le pedimos estaba mal pensado.

---

## 7. Lo que sabemos que está mal hoy

Ordenado por lo que creo que más duele. Esta priorización también hay que
cuestionarla.

1. **El anfitrión carga con todo.** Crea, invita, configura, abre, cierra cada
   turno y además juega. Si se distrae, la mesa se para.
2. **Invitar es demasiado caro.** Amistad + invitación, sin enlace de
   invitación, y las dos personas tienen que estar disponibles.
3. **El jugador nuevo no sabe qué escribir.** Le damos un cuadro de texto
   vacío. No hay ejemplos ni sugerencias de lo que su personaje podría hacer.
4. **La pantalla de crear mesa es un muro.** Cinco decisiones antes de jugar.
5. **El pie de la mesa se satura** en pantallas pequeñas.
6. **No hay documentación de usuario.** Ninguna.
7. **No se puede recuperar la contraseña** (correo saliente roto).
8. **No hay términos ni aviso de privacidad**, y se cobra dinero.
9. **El retraso del sondeo** hace que la mesa se sienta menos viva de lo que
   es.
10. **No hay resumen al terminar.** Una sesión acaba y no queda nada legible
    de lo vivido.

---

## 8. Restricciones reales

Quien revise esto debe saber qué no se puede cambiar de un plumazo:

- **El director es un modelo de lenguaje.** Tarda entre 5 y 25 segundos por
  turno. Esa espera es física y hay que diseñarla, no esconderla.
- **Cuesta dinero por turno.** Una sesión de 20 turnos con cuatro jugadores
  cuesta entre 0.42 y 1.26 USD según el modelo. Cualquier idea que multiplique
  las llamadas al modelo multiplica el coste.
- **El modelo no es de fiar como fuente de verdad.** Propone; el motor valida.
  Todo lo que sea estado (vida, dados, secretos, relaciones) pasa por reglas.
- **Hay secretos en juego.** Un pack tiene información que unos personajes
  conocen y otros no. La interfaz no puede enseñar a todos lo mismo.
- **El contenido puede ser de terceros.** Algunos packs son privados y no se
  distribuyen.
- **Equipo de una persona.** Todo lo que se proponga compite con todo lo demás.

---

## 9. Principios que creo que deberían regir (a validar)

Los escribo para que el revisor los ataque, no porque estén aprobados.

1. **La narración es el producto.** Todo lo demás debería ceder espacio.
2. **El jugador nuevo no debería aprender nada antes de jugar.** El primer
   turno tendría que ser posible sin leer instrucciones.
3. **El anfitrión es un jugador con permisos, no un operador.** Hoy es un
   operador.
4. **La espera del director debe sentirse como tensión, no como error.**
5. **El azar tiene que verse.** Un dado oculto no emociona.
6. **Nada de jerga del motor en pantallas de jugador.**

---

## 10. Métricas que no tenemos

Tampoco esto lo hemos pensado bien. Hoy solo medimos consumo de tokens y
turnos resueltos. No sabemos:

- Cuánta gente abandona en la pantalla de crear mesa.
- Cuántos invitados llegan a escribir su primer turno.
- Cuántas mesas juegan una segunda sesión.
- Cuánto tarda un jugador nuevo desde que entra hasta que escribe algo.

---

## 11. Glosario

- **Mesa**: el grupo y su partida. Contiene miembros y una campaña.
- **Campaña**: el registro de todo lo ocurrido en una mesa.
- **Sesión**: una noche de juego. Se abre y se cierra.
- **Turno**: una ronda. Todos declaran, el director narra.
- **Pack**: un mundo como datos (personajes, lugares, secretos, sesiones).
- **Ruleset**: el sistema de reglas que el pack asume.
- **Bloque**: una unidad de salida del director (narración, diálogo, tirada).
- **Anfitrión**: quien creó la mesa. Juega y además administra.
- **Director de juego**: el modelo de lenguaje que narra.

---

## 12. Qué se espera de la revisión

Esta es la parte que importa. Lo que sigue es lo que pedimos en concreto.

### 12.1 Preguntas directas

1. **El anfitrión como operador** (sección 7.1). ¿Cierre automático cuando
   todos responden, con posibilidad de esperar? ¿Rotar quién cierra? ¿Otra
   cosa? Justifica el efecto sobre una mesa de cinco personas donde una se
   distrae.
2. **Invitar** (7.2). Dado que un enlace de invitación abre la puerta a abusos,
   ¿cuál es el mínimo de fricción aceptable? ¿Enlace con caducidad? ¿Código de
   mesa?
3. **El cuadro vacío** (7.3). ¿Cómo se ayuda a alguien que nunca jugó rol a
   escribir su primer turno, sin convertirlo en un menú de opciones que mate la
   libertad?
4. **Crear mesa** (7.4). ¿Qué decisiones se pueden diferir o eliminar? ¿Cuál es
   el mínimo para empezar a jugar?
5. **Estructura de la mesa** (7.5). En un teléfono, con narración, respuesta,
   fichas, personalidad y mando del anfitrión, ¿qué arquitectura propones?
6. **La espera de 5 a 25 segundos** (8). ¿Cómo se diseña esa espera en una
   mesa donde varias personas miran a la vez?
7. **Las tiradas** (4.8). Hoy es un bloque más en el hilo. ¿Cómo se le da el
   peso emocional que tiene en una mesa física, sin romper la lectura?
8. **Cierre de sesión** (7.10). ¿Qué debería quedar cuando la noche termina?

### 12.2 Lo que no queremos

- Recomendaciones genéricas de usabilidad sin referencia a este producto.
- Propuestas que ignoren el coste por turno o la latencia del modelo.
- Rediseños completos sin orden de ejecución: si algo es lo primero, dilo.

### 12.3 Formato de respuesta pedido

Por cada problema que trates:

1. **Qué está mal**, en una frase, y por qué le duele a qué usuario.
2. **Qué proponer**, concreto, con el texto de la interfaz si aplica.
3. **Qué se rompe** con tu propuesta (siempre se rompe algo).
4. **Cómo se mide** que funcionó.
5. **Prioridad**: primero, después, o algún día.

Y al final, una lista corta de **lo que estamos haciendo bien y no deberíamos
tocar**. Es tan útil como lo demás.

### 12.4 Juicio explícito pedido

Sobre estas tres decisiones quiero un veredicto directo, porque las tomé yo
sin consultar y sospecho de ellas:

1. Cierre de turno manual por el anfitrión.
2. Tarjeta de inicio grande que ocupa la mesa mientras no hay sesión abierta.
3. Que la mesa entera viva en una sola pantalla con todo apilado en el pie.
