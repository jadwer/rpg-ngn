# UX v1 — RPG Worlds: experiencia móvil

Estado: propuesta para validación antes de implementación.

> **Sobre las anotaciones de este documento.** Los bloques marcados
> `> **[REVISION]**` los escribio Claude el 21-09 por encargo de Gabino, sin
> tocar el texto original: cada uno queda pegado a la seccion que comenta para
> que se vea el delta. Hay tres clases:
>
> - **CONTRADICE**: choca con una decision ya tomada por Gabino o con el
>   codigo en produccion. Hay que resolverlo antes de implementar.
> - **YA EXISTE**: la propuesta ignora algo que ya esta construido y
>   desplegado. No es un error de criterio, es contexto que faltaba.
> - **FALTA**: una restriccion real del producto que el documento no
>   considera.
>
> Lo que no lleva anotacion es acuerdo. Y el acuerdo es la mayor parte: este
> documento es mejor material de UX que los dos mockups anteriores, porque
> parte del flujo de juego y no de la pantalla de un VTT. En particular, la
> seccion "Fuera de esta propuesta" coincide casi punto por punto con lo que
> `docs/14` ya tenia escrito como "no copiar", y a eso se llego por separado.
>
> Contexto que conviene tener a mano al releer: `docs/13` (el DDS con las
> decisiones de UX tomadas y su riesgo), `docs/14` (lo visual congelado y lo
> que NO hay que copiar de la competencia) y `docs/11` (el ADR del stack, que
> fija que cliente es el producto principal).

## Objetivo

Diseñar la experiencia móvil web desde el flujo de juego, no adaptar el dashboard de escritorio.

RPG Worlds no debe comportarse como un VTT simplificado. El producto es una mesa narrativa donde el motor ocupa la silla del director de juego. La interfaz debe desaparecer cuando no aporta a la decisión del jugador.

## Principios

1. **Narrativa primero.** Durante la partida, la narración es el contenido principal.
2. **Una decisión por momento.** El jugador debe saber qué puede hacer ahora sin estudiar la interfaz.
3. **Revelación progresiva.** Ficha, jugadores, mapa, historial y reglas están disponibles bajo demanda.
4. **Potencia sin obligación.** La configuración avanzada existe, pero no se exige al novato.
5. **Mobile-first.** 390×844 es el viewport de referencia. Desktop se compone después.

> **[REVISION] CONTRADICE (principio 5).** Hay una directriz primaria de
> Gabino, del 2026-09-06 y escrita en `docs/11` linea 215: **la web de Next.js
> es el producto principal de cara al publico**, con mesa propia, independiente
> de la movil y cara para streamers. Su regla operativa dice textualmente que
> ante cualquier disyuntiva (donde invertir diseño, que plataforma prueba
> primero una funcion, cuanto pulido merece una pantalla) **gana la web**,
> manteniendo paridad funcional pero no paridad de acabado.
>
> "Mobile-first, desktop se compone despues" invierte eso. No digo que sea
> peor idea: para un jugador invitado el telefono es la superficie real, y
> diseñar la sesion a 390px obliga a una jerarquia honesta que a 1280px es
> facil de evitar. Digo que **es una decision de Gabino, no del documento**, y
> que mientras no la cambie el orden es el contrario.
>
> Sugerencia concreta si quiere conservar lo bueno de las dos: separar
> **composicion** de **acabado**. Diseñar la jerarquia a 390px (que es donde
> se nota si sobra algo) y hacer el pulido, el modo pantalla y la tipografia
> primero en web. Eso respeta la directriz y conserva el valor del principio.
> Si Gabino cambia la directriz, se corrige en `docs/11` y en la memoria del
> proyecto, no solo aqui.
6. **El anfitrión juega.** Sus controles son overrides, no tareas administrativas obligatorias.
7. **El dado es un momento.** Cuando hay una tirada relevante, debe sentirse y verse.
8. **El ruleset define la ficha.** No codificar una ficha D&D en la interfaz común.

> **[REVISION] De acuerdo con el principio; el concept board lo desmiente.**
> Es el principio correcto y es el mismo que `docs/14` da como condicion para
> construir la ficha siempre visible. Pero `img/ux-mobile-v1.svg` lo rompe en
> tres sitios, y conviene corregir el dibujo porque es lo que la gente mira:
>
> - **"PERCEPCIÓN" y "ÉXITO" con un d20** (telefono 4) es vocabulario de
>   `fantasy-d20-lite`. Hay tres rulesets en el codigo: `fantasy-d20-lite`,
>   `court-intrigue` (credito, sospecha, pistas) y `masquerade` (prestigio,
>   escandalo, rumores, vinculos). En La Mascarada un 18 en Seduccion no es
>   "exito": mueve prestigio y crea un vinculo. La franja de resultado tiene
>   que salir del ruleset, no ser verde y decir EXITO.
> - **"Dayan" y "Zahira" jugando La Mascarada** (telefonos 1 y 2): son del
>   pack piloto de Valdoria. Los de La Mascarada son armand, camille, etienne,
>   helene, isabeau, lucien, margot y sebastien.
> - **"Arquera · Exploración" e "Intriga · Relaciones"** como subtitulo: el
>   primero es del piloto, el segundo no es de ningun pack.
>
> Es atrezo, no arquitectura, y por eso no cambia mi lectura del documento.
> Pero delata que el board se dibujo sin abrir `content/packs/`, y el riesgo
> real es que un mockup con vocabulario de D&D acabe justificando una ficha de
> D&D, que es exactamente lo que este principio prohibe. Las tiradas de La
> Mascarada, para redibujarlo: Etiqueta, Baile, Seduccion, Observacion,
> Ingenio.
>
> **Corregido en `b430597` (mismo dia)**: el board ya lleva a Armand y Camille,
> "Observacion" en vez de "Percepcion" y "La historia continua" en vez de un
> "Exito" verde. Quedaban dos cosas, revisadas el 22-09: los subtitulos "Corte
> · Prestigio" y "Etiqueta · Rumores" siguen siendo inventados (las
> habilidades de Armand en el pack son Etiqueta, Ingenio, Baile y
> Conversacion; Prestigio es un marcador de estado, no una habilidad), y el
> pie del telefono 3 decia "El anfitrion puede resolver cuando quiera", que
> contradice lo decidido en `docs/18` D-UX-3 (cuenta atras cancelable por
> cualquiera). Ese pie se cambio; los subtitulos se dejan, son atrezo.
9. **El mapa es contexto narrativo.** No convertirlo en tablero táctico.
10. **No competir con la historia.** Ningún panel secundario debe ocupar permanentemente la atención durante un turno.

## Modelo mental

La partida se percibe como:

NARRACIÓN → DECISIÓN → ACCIÓN → ESPERA → RESOLUCIÓN → NUEVA NARRACIÓN

No como:

DASHBOARD → CARDS → CONFIGURACIÓN → CHAT → ESTADÍSTICAS.

## Flujo de jugador nuevo

### 1. Entrada
Objetivo: entrar a una aventura, no aprender el producto.

### 2. Personaje
Presentar personajes como identidades jugables: nombre, retrato, personalidad, objetivo y capacidades relevantes. Los atributos específicos dependen del ruleset.

### 3. Mesa
Mostrar que los amigos están presentes y que la aventura está a punto de comenzar. Evitar configuración innecesaria para invitados.

### 4. Primer turno
La pantalla responde únicamente:
- qué está ocurriendo;
- qué se espera del jugador;
- cómo declarar una acción.

El input debe aceptar lenguaje libre. Una ayuda opcional puede sugerir una acción sin convertirla en menú.

### 5. Espera
Mostrar quién ya respondió y quién está escribiendo. El anfitrión puede resolver o esperar; cuando todos respondieron, el sistema debe permitir resolución automática.

> **[REVISION] CONTRADICE (paso 5, "resolucion automatica").** El cierre manual
> del turno es una decision deliberada, no un descuido, y es una de las tres
> que `docs/13` pone expresamente a criticar. Que este documento la ataque es
> legitimo y bienvenido. Lo que no vale es resolverla en una oracion
> subordinada: es el cambio de mayor alcance de toda la propuesta y llega sin
> argumento.
>
> Lo que el cierre manual sostiene hoy, y que una resolucion automatica tiene
> que resolver explicitamente:
>
> 1. **Cuesta dinero.** Cada turno son 0.019 USD medidos, y se cobran al
>    usuario como creditos. El cierre manual es hoy **la unica palanca contra
>    el gasto involuntario**. Automatico significa que una mesa puede quemar
>    saldo sin que nadie lo decida.
> 2. **El ausente.** Ya existe "me tengo que ir" (`table_members.present`) y
>    el ausente no cuenta para cerrar. Pero el que se fue sin marcarlo, no. Con
>    cierre automatico, "todos respondieron" nunca llega y la mesa se cuelga;
>    hoy el anfitrion fuerza el cierre.
> 3. **El que llega tarde.** Hoy alguien puede reescribir su declaracion
>    mientras el turno sigue abierto. Con cierre automatico, el ultimo en
>    enviar dispara la narracion y le quita a los demas la posibilidad de
>    corregir.
>
> Propuesta de salida, si se quiere avanzar sin perder lo anterior: **cierre
> automatico con cuenta atras visible y cancelable** ("el DM narra en 10
> segundos, cancelar"). Es automatico de facto para el 95% de los turnos,
> mantiene la palanca de coste y da salida a los tres casos. Decide Gabino.

### 6. Resolución
Si el motor requiere una tirada, representar visualmente el dado y luego devolver el resultado a la narrativa.

> **[REVISION] De acuerdo, y con el terreno ya preparado.** Dos apuntes que
> hacen esto mas barato de lo que parece, y uno que lo complica:
>
> - **El servidor ya decide el resultado antes de narrar.** Con `dice: engine`
>   el motor tira un d20 por personaje que declaro, se lo enseña al modelo y
>   este narra la consecuencia en el mismo turno (`source: engine`). Asi que
>   la animacion **representa algo ya decidido**: no hay riesgo de que el dado
>   visual y el real discrepen, que es lo que suele encarecer esta funcion.
> - **En modo `table` no debe animarse nada** (ver anotacion del paso 7): ahi
>   el numero lo escribe una persona con un dado fisico en la mano.
> - **Lo que complica: "ÉXITO" no es vocabulario comun.** Ver la anotacion del
>   principio 8 y la del concept board.
>
> La espera dibujada en el board como "EL DESTINO SE PREPARA" en vez de un
> indicador de carga es, en mi lectura, **la mejor idea de todo el documento**
> y la mas barata: hoy esos 5 a 25 segundos son tiempo muerto, y la sesion que
> salio mal lo fue por aburrimiento. Convertir la espera en ficcion no toca el
> motor.

### 7. Herramientas secundarias
Personaje, jugadores, mapa, historial y reglas se abren como superficies independientes/fullscreen cuando su tamaño lo requiera.

> **[REVISION] YA EXISTE (paso 7).** Cuatro cosas de esta propuesta estan
> construidas y desplegadas en produccion. Conviene saberlo para no
> rediseñarlas desde cero:
>
> - **El mapa, con este mismo criterio.** Linea plegada en la mesa que abre un
>   **modal a pantalla completa**, en web y en la app. Se hizo asi por la razon
>   exacta que da este documento: dentro del pie se veia cortado en escritorio.
>   Formato en `docs/05`, ubicacion en `docs/08`, lo que se ve en `docs/13`
>   4.10. Al abrir sesion la party ya aparece colocada (`startLocation`).
> - **Personalidad escrita por el jugador** (`table_members.persona`, panel
>   "Tu personaje"), que el DM recibe en la ficha. Es la pieza que hace que dos
>   jugadores con el mismo arquetipo vivan noches distintas, y encaja con el
>   paso 2 de este flujo ("identidades jugables").
> - **Presencia**: "me tengo que ir" / "he vuelto". El ausente no cuenta para
>   cerrar el turno y el DM recibe aviso para apartar al personaje sin matarlo.
>   Es el estado 11 de la lista de esta propuesta, ya resuelto.
> - **Modo de dados por mesa**: `engine` (tira el servidor, por omision) o
>   `table` (se acepta el numero que escribe el jugador, para dados fisicos).
>   Importa para el paso 6: en modo `table` la animacion del dado **no debe
>   aparecer**, porque el numero lo puso una persona.
>
> Ninguna de las cuatro aparece en el documento. No invalida la propuesta;
> significa que el punto de partida es mas alto de lo que asume.

## Pantalla central: sesión móvil

Prioridad visual:

1. título/contexto de escena;
2. narración;
3. estado del turno;
4. compositor de acción;
5. progreso de jugadores;
6. navegación secundaria.

No mostrar permanentemente HP, seis atributos, inventario, mapa, historial y controles de anfitrión.

> **[REVISION] FALTA: el coste por turno no aparece en todo el documento.**
> Es la restriccion mas dura del producto y no se menciona ni una vez.
>
> Cada turno cuesta **0.019 USD medidos** (una sesion de 20 turnos con cuatro
> jugadores: 1.26 USD con Sonnet, 0.42 con Haiku), y se le cobra al usuario
> como creditos de prepago, en turnos, no por tiempo. De ahi se sigue algo que
> cambia decisiones de interfaz:
>
> - **Cada boton que dispara una narracion gasta dinero de alguien.** Por eso
>   el cierre del turno es manual hoy (ver anotacion del paso 5).
> - **El saldo tiene que ser legible sin salir de la mesa**, y no mentir: quien
>   trae su propia clave (BYOK) no gasta cupo, y ya hubo que corregir un texto
>   que le decia "te quedan 80 turnos" a quien no gastaba ninguno.
> - **Un reintento tambien cuesta.** El motor reintenta una vez cuando el
>   modelo falla; eso es un turno pagado que el jugador no pidio.
>
> No pido resolverlo en este documento. Pido que aparezca como restriccion,
> igual que aparece la latencia, porque una propuesta de UX que no la nombra
> acaba proponiendo cosas que no se pueden pagar.

## Configuración de mesa

Usar tres niveles:

- **Recomendada:** RPG Worlds decide detalles.
- **Personalizada:** el usuario decide las variables que cambian la experiencia.
- **Avanzada:** acceso a configuración completa.

La complejidad no se elimina; se revela cuando el usuario la solicita.

## Superficies móviles

- **Sesión:** narración y acción.
- **Personaje:** ficha específica del ruleset.
- **Jugadores:** estado individual: listo, escribiendo, pensando.
- **Más:** mapa, historial, reglas, configuración.

Estas superficies no deben convertirse en un pie permanente lleno de tarjetas.

## Estados de sesión que deben diseñarse

1. Mesa recién creada.
2. Primer mensaje del DM.
3. Jugador escribiendo.
4. Jugador ya respondió.
5. Esperando al resto.
6. Todos respondieron.
7. Resolviendo.
8. Tirada.
9. Resultado.
10. Nueva narración.
11. Jugador ausente.
12. Fin de sesión.

> **[REVISION] Es la parte mas util del documento.** Una lista de doce estados
> verificables vale mas que cualquier mockup, porque se puede recorrer con una
> persona delante. Estado por estado, como esta hoy:
>
> | # | Estado | Hoy |
> |---|---|---|
> | 1 | Mesa recien creada | hecho: tarjeta con pasos y boton "Iniciar partida" |
> | 2 | Primer mensaje del DM | hecho: al abrir sesion se presenta la escena (titulo, briefing, como se juega) y la party queda colocada en el mapa |
> | 3 | Jugador escribiendo | **no existe**: hace falta que el cliente avise mientras se teclea |
> | 4 | Jugador ya respondio | existe, pero como linea de texto ("Faltan por responder: Zahira") |
> | 5 | Esperando al resto | igual que el 4 |
> | 6 | Todos respondieron | existe con texto, y el cierre lo da el anfitrion (ver paso 5) |
> | 7 | Resolviendo | existe como indicador tecnico; es justo lo que el board mejora |
> | 8 | Tirada | el dado ya existe y se ve con cara de dado; falta que **se sienta** |
> | 9 | Resultado | hecho |
> | 10 | Nueva narracion | hecho |
> | 11 | Jugador ausente | hecho: "me tengo que ir", el DM aparta al personaje sin matarlo |
> | 12 | Fin de sesion | existe cierre con cliffhanger; sin pantalla propia |
>
> O sea: **de doce, uno no existe (el 3) y cuatro son de presentacion (4, 5, 7,
> 8)**. Ninguno pide motor nuevo. Es la lista de trabajo mas barata que hay
> sobre la mesa, y coincide con lo que `docs/14` ya tenia apuntado como
> "jugadores con estado, no una linea de texto".

## Fuera de esta propuesta

- tablero táctico;
- ficha D&D fija;
- chat privado con el DM como concepto principal;
- dashboard permanente durante el juego;
- configuración avanzada obligatoria;
- copiar patrones de Alchemy o Quest Portal por similitud visual.

## Criterio de aceptación

Un jugador que nunca haya jugado RPG debe poder:

1. entrar;
2. identificar su personaje;
3. leer la primera escena;
4. entender que debe declarar una acción;
5. escribir una acción libre;
6. saber si ya respondió;
7. entender el resultado de una tirada;

sin tutorial externo ni explicación verbal del anfitrión.

> **[REVISION] Esto es exactamente lo que Gabino decidio medir, y conviene
> usarlo tal cual.** Su decision del 20-09, escrita en `docs/14`: poner el
> producto delante de personas que **no hayan jugado rol nunca** y ver donde
> abandonan, antes de elegir que construir. Estos siete pasos son esa medicion
> convertida en guion, que es justo lo que faltaba.
>
> Dos cosas que añadiria al criterio, por lo que ya sabemos de sesiones
> reales:
>
> 8. **Entender que la espera no es un cuelgue.** Entre 5 y 25 segundos por
>    turno; sin señal, se percibe como que la aplicacion se rompio.
> 9. **Saber que hacer cuando el DM no le habla a el.** En una mesa de cuatro,
>    la narracion puede dirigirse a otro dos turnos seguidos. Es donde mas
>    facil se desengancha alguien que nunca jugo.
>
> Y una advertencia de metodo, pagada cuatro veces esta semana en este
> proyecto: **los tests verdes no ven el circuito completo; solo jugar un turno
> de verdad lo enseña.** Vale igual para UX: este criterio hay que correrlo con
> una persona real, no razonarlo.

## Implementación

Separar composición por cliente:

SessionMobile
SessionTablet
SessionDesktop

compartiendo estado, dominio y componentes funcionales, pero no obligando a compartir la misma composición visual.

> **[REVISION] De acuerdo, y el codigo ya esta preparado para eso.** La regla
> del monorepo es que `packages/*` no importa React, Next, Expo ni `node:*`
> (lo vigila eslint), asi que el estado y el dominio ya viven fuera de
> cualquier composicion. `packages/ui-logic` decide que se ve (que bloques,
> que asiento, que textos) sin pintar nada, y tiene 140 tests. Separar la
> composicion por cliente no rompe nada de eso: es justo para lo que se
> aparto.
>
> El sintoma que da la razon a esta seccion ya se cobro: el mapa nacio dentro
> del pie de la mesa, compartido, y **se veia cortado en escritorio** porque
> ese pie esta limitado al 55% del alto. Hubo que sacarlo a pantalla completa.
> Lo mismo pasara con la ficha y con el historial.

---

## Cierre de la revision (Claude, 21-09)

**Veredicto: es el mejor material de UX que ha entrado al proyecto, y hay que
conservarlo.** Los dos mockups anteriores eran pantallas bonitas con supuestos
prestados de VTT con director humano; este parte del flujo de juego y del
motor real, y su seccion "Fuera de esta propuesta" coincide casi punto por
punto con lo que `docs/14` ya tenia escrito como "no copiar". A eso se llego
por caminos separados, que es la mejor señal de que esta bien.

**Lo que hay que resolver antes de implementar nada** (por orden):

1. **Mobile-first contra la directriz primaria** (principio 5). Lo decide
   Gabino, y si cambia, se corrige en `docs/11` y en la memoria, no aqui.
2. **Resolucion automatica del turno** (paso 5). Tiene consecuencias de coste
   y de mesa; la propuesta de cuenta atras cancelable esta en esa anotacion.
3. **El coste por turno como restriccion declarada**, al nivel de la latencia.
4. **Redibujar el concept board sin vocabulario de D&D** (principio 8).

**Lo que se puede hacer ya, sin esperar a la medicion:**

- **La espera como ficcion** ("el destino se prepara"). Barato, no toca motor
  y ataca el aburrimiento directamente. Candidato a salir del congelador de
  `docs/14`, como salio el mapa.
- **Los doce estados de sesion** como guion de la medicion con gente real.
- **"Escribiendo"** (estado 3), que es lo unico de la lista que no existe.

**Lo que NO haria todavia**: rediseñar la sesion entera. `docs/14` esta
congelado a proposito por decision de Gabino, y el orden que el fijo es medir
con gente primero. Este documento es la mejor hipotesis que tenemos, y una
hipotesis se contrasta antes de construirla.

**Dos notas de proceso, sin importancia tecnica pero con consecuencias:**

- Los dos commits (`17a0ae7`, `d81003a`) entraron **directo a `dev`**, que es
  la rama de trabajo, encima de trabajo sin terminar de otro. Salio bien
  porque solo añadian archivos nuevos. Para esto conviene una rama o un PR.
- **La numeracion se asigno a ciegas**: `docs/15-packs-de-la-comunidad.md` se
  escribio el mismo dia, dos horas antes. Esta vez no chocaron por suerte. Si
  se va a escribir en paralelo, mirar `docs/` antes de elegir numero.
