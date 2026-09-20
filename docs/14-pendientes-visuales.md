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

## Antes de elegir de esta lista

Gabino decidio **medir con gente real primero**: poner rpg-ngn delante de
personas que no hayan jugado rol y ver donde abandonan. La lista de trabajo
sale de ahi, no de la impresion que deja el producto de otro.

Relacionado: `docs/13-dds-experiencia.md` (el documento para auditoria de
UX externa).
