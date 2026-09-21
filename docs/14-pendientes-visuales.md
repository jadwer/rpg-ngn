# 14. Pendientes de mejora visual y de experiencia

Estado: congelado a proposito. Fecha: 2026-09-20.

Esto no se toca hasta que el motor este cerrado. La decision es de Gabino y
tiene su razon: la sesion del 20-09 salio aburrida **por el motor** (turnos
sin tiradas, escenas sociales que no dejaban rastro, mesas que empezaban a
mitad de la historia), no por la falta de adornos. Arreglar la fachada con
el motor flojo habria tapado el problema en vez de resolverlo.

Se guarda aqui para no perderlo y para no volver a discutirlo cada vez que
aparezca un producto bonito.

## De donde sale esta lista

- Un mockup de diseño que Gabino encargo a GPT (paleta justificada, tres
  vistas moviles, principios de diseño).
- Dos competidores que Gabino trajo el 20-09:
  - **Alchemy VTT**: fondos animados por escena, musica y ambientacion que
    controla el director, perfiles de personaje que aparecen al hablar, modo
    streamer con chat de espectadores y video. 8 USD al mes. Presume de
    "theater of the mind": los mapas tacticos NO son su eje.
  - **Quest Portal VTT**: fichas por sistema, mapas tacticos con tokens,
    chat con tiradas, notas de campaña, biblioteca de aventuras, movil y
    escritorio. Su IA genera NPCs y ganchos **para el director humano**.

**Lo que los dos tienen en comun y conviene no olvidar: necesitan un
director de juego humano.** La IA, donde existe, es su ayudante. En rpg-ngn
esa silla la ocupa el motor, y eso es el producto, no una version reducida
del de ellos. Un grupo sin nadie que sepa dirigir no puede usar Alchemy ni
Quest Portal; si puede sentarse en rpg-ngn.

## Lo pendiente, por coste y efecto

### Barato y mucho efecto

1. **Dados 3D visibles.** Que la tirada se vea caer en vez de aparecer un
   numero. El servidor ya decide el resultado (source `engine`), asi que la
   animacion solo representa algo ya decidido: no hay riesgo de que el dado
   visual y el real discrepen. Es lo que mas emocion compra por hora.
2. **Identidad visual.** Paleta, tipografia y jerarquia del mockup aplicadas
   a la web. Hace que parezca un producto y no un prototipo, sin tocar
   mecanica.

### Medio

3. **Ficha y jugadores en movil.** Ficha con inventario y habilidades
   accesible sin salir de la sesion, y lista de jugadores con quien ya
   respondio y quien esta escribiendo. Ataca el "pie saturado" que el DDS
   (docs/13) señala como problema 7.5.
4. **Ambientacion de escena.** Imagen de fondo por escena y sonido
   ambiental, como Alchemy. Es el mayor salto visual respecto a hoy.
   Requiere decidir quien genera las imagenes y que los packs las traigan;
   eso toca el formato de pack (docs/05).

### Caro, y ademas discutible

5. **Mapas tacticos con tokens.** Meses de trabajo, competencia directa con
   equipos financiados y en su terreno. Ademas tira contra el eje narrativo:
   el propio Alchemy presume de no centrarse en mapas. No entrar aqui sin
   una razon mejor que "los demas lo tienen".

## Del segundo mockup (img/idea_web.png e img/ideas_movil.png, 21-09)

Gabino encargo una segunda tanda de pantallas. Lo aprovechable, por orden de
lo que mas cambia la partida:

6. **La ficha del personaje, siempre visible.** En el mockup vive en una
   columna derecha fija; hoy esta detras de un boton "Fichas" que abre un
   panel, y en una partida nadie lo abre porque pierde el hilo de la
   narracion. **Condicion para construirlo: la ficha la decide el ruleset.**
   El mockup pinta puntos de golpe, clase de armadura y seis
   caracteristicas, que es D&D; en La Mascarada hay prestigio, escandalo y
   vinculos, y en la corte credito, sospecha y pistas. Copiar la ficha tal
   cual deja el panel vacio o mintiendo en dos de los tres rulesets.
7. **Jugadores con estado, no una linea de texto.** "3/4 listos" con una
   fila por persona y su marca (Listo, Escribiendo, Pensando) en vez del
   actual "Faltan por responder: Zahira, Calder". Hace que la espera del DM
   se sienta acompañada. **"Escribiendo" no existe hoy**: hace falta que el
   cliente avise mientras se teclea, parecido a la bandera de narrador que
   ya existe. Es barato y se nota mucho.
8. **Historial de la sesion en tarjetas.** Una tira al pie con los turnos
   anteriores y su titulo ("Turno 2: la discusion en la taberna"). Hoy, para
   ver que paso hace media hora, hay que subir por el scroll; en una sesion
   de tres horas eso es un problema real.
9. **Cabecera que dice donde estas.** "Sesion: La Posada del Cuervo,
   Capitulo 1, Rumores y puertas cerradas" en vez del subtitulo tecnico de
   hoy. Barato: el pack ya trae titulo de sesion.

**Lo que NO hay que copiar de ese mockup**, y conviene dejarlo escrito para
no rediscutirlo:

- **Ficha de D&D** (ver punto 6): contradice el eje agnostico del motor.
- **"Mensaje al DM (privado)"**: no es un boton, es una decision de diseño.
  Toda declaracion ya es privada hasta que el DM narra. Un canal secreto con
  una IA que tiene lint de secretos obliga a decidir que pasa cuando alguien
  le pide por privado algo que revelaria un secreto a la mesa.
- **"Abandonar sesion" en rojo y arriba a la derecha**: es el color de
  destructivo de la propia paleta, en el sitio donde la gente busca cerrar
  cosas. Ya existe "Me tengo que ir", que hace lo correcto (el DM aparta al
  personaje sin matarlo). Ese boton invita a salirse por error.
- **"D&D 5e" y "Faerun (Custom)" en la cabecera**: Faerun es de Wizards of
  the Coast y docs/07 solo admite contenido original o licenciado. En un
  mockup da igual; en una captura publica es un problema legal.

**Lo que falta en las dos imagenes y es justo lo que arruino la sesion del
20-09: los dados.** No aparece ninguna tirada ni sitio donde se vea caer un
dado. Cualquier rediseño tiene que reservarles un lugar visible.

Juicio de conjunto: el mockup es **buena direccion visual y mala
especificacion funcional**. Esta dibujado mirando a Alchemy y Quest Portal,
que son VTT con director humano, y arrastra sus supuestos. Como paleta,
jerarquia y disposicion, mejora lo que hay. Como lista de funciones, mete
semanas de trabajo en cosas que contradicen el motor.

## Antes de elegir de esta lista

Gabino decidio **medir con gente real primero**: poner rpg-ngn delante de
personas que no hayan jugado rol y ver donde abandonan. La lista de trabajo
sale de ahi, no de la impresion que deja el producto de otro.

Relacionado: `docs/13-dds-experiencia.md` (el documento para auditoria de
UX externa).
