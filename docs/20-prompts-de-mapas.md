# 20. Prompts para generar los mapas de un pack

Fecha: 2026-09-22.

Los cuatro prompts con los que se generaron los mapas del piloto y de la
boticaria (hechos el 22-09, ya en los packs), y la receta para escribir el
siguiente. Salen de lo aprendido generando el palacio de La
Mascarada, que fue el primero y costo tres intentos.

## La regla que manda sobre todo

**Un generador de imagenes no obedece coordenadas, obedece composicion.**

Pedirle "el salon en (53.5, 41.0)" no sirve de nada. Lo que si entiende es
"el salon grande en el centro exacto, el comedor a la izquierda a media
altura". Por eso el metodo es:

1. Se le pide la **disposicion en rejilla de 3x3** con palabras.
2. Se genera la imagen.
3. **Las coordenadas se miden despues, sobre la imagen ya generada.**
4. Se comprueban **pintando los marcadores encima**, no a ojo.

En el palacio, dos de seis coordenadas estaban mal al primer intento (los
pasillos caian en la despensa y el jardin en un escalon). Sin el paso 4 se
habrian quedado asi.

## Lo que todo prompt de mapa tiene que decir

- **Vista cenital o isometrica suave.** Nada de perspectiva de personaje.
- **Sin texto, sin etiquetas, sin numeros, sin brujula.** Los nombres los pone
  la aplicacion encima; si la imagen trae letras, se ven dos veces y mal.
- **Sin personas ni criaturas.** La gente la pinta el mapa con los retratos de
  los personajes.
- **1536x1024 pixeles (3:2 apaisada)**, y **1024x1536 si el mapa representa
  profundidad**, como el corte de una mina. Es lo que ya funciona: el palacio
  de La Mascarada es 1536x1024 y pesa 418 KB en WebP.
  - **Por que ese tamaño**: en escritorio el mapa se pinta a unos 1000 px de
    ancho, asi que 1536 deja margen para pantallas de mucha densidad. Mas
    grande solo tarda en cargar en el telefono; mas pequeño se ve borroso al
    abrirlo a pantalla completa.
  - **Por que apaisada y no cuadrada**: el lienzo se adapta a la proporcion que
    tenga la imagen (`fit-content` mas `object-fit: contain`), asi que no hay
    recorte nunca; pero el modal de escritorio es apaisado, y una imagen
    cuadrada deja franjas vacias a los lados.
- **Zonas bien separadas y distinguibles**, con espacio vacio entre ellas: ahi
  es donde caen los marcadores.
- **Separar lo que es lugar de lo que es relleno, y decirlo.** Un mapa con solo
  cuatro edificios parece un diagrama, no un sitio; pero si el relleno tiene el
  mismo tamaño y detalle que los lugares reales, la gente intenta pulsarlo.
  Conviene pedir el relleno expresamente y pedir que quede **mas pequeño, mas
  oscuro y con menos detalle**.
- **Describir el sitio, no una lista de edificios.** De que vive, que hora es,
  que ha pasado ahi, que se nota al mirarlo. Un prompt escueto deja que el
  generador rellene, **y rellena mucho**: en el primer Valdoria puso una
  bocamina entera que el prompt no pedia. Esa salio bien y se aprovecho, pero
  pudo haber salido un castillo que contradijera el pack.
- **Decir que NO se quiere, en una lista al final.** Texto, numeros, personas,
  criaturas y cualquier cosa del genero que no toque (en una mina de trabajo,
  ni tesoros ni cristales magicos).
- **Nombrar los lugares por lo que son en el pack** y describirlos con su
  `newcomerView`, que es justo lo que un recien llegado ve. Ya esta escrito;
  no hay que inventarlo.
- **Decir la forma del recorrido, no solo por donde pasa.** "El camino pasa
  junto a la posada, cruza la plaza y sube a la mina" se interpreto como **tres
  caminos radiales saliendo de la plaza**, no como uno continuo. Si se quiere
  un solo camino, hay que decir "un unico camino continuo, sin bifurcaciones".
- **Decir la direccion de las calles y como estan orientados los edificios**,
  si importa: "calles paralelas de arriba abajo", "las fachadas miran a la
  calle principal". Sin eso salen en abanico, que puede estar bien o no.
- **Lo que si se obedecio a la primera** y conviene repetir: la inclinacion
  ("vista cenital ligeramente inclinada"), la densidad del relleno ("tejados
  apiñados", "mas pequeño y mas oscuro"), el tamaño en pixeles y la lista de
  prohibiciones. Las cuatro imagenes salieron al primer intento y **las 14
  coordenadas cayeron bien a la primera**, frente a dos de seis mal en el
  palacio de La Mascarada, que se pidio con un prompt corto.
- **Paleta oscura y calida**, para que pegue con el tema de la mesa (fondo
  `#17120e`, dorado `#c9a35c`) y los puntos dorados se vean encima.

## Lo que hay que decir cuando un pack tiene VARIOS mapas

Es lo nuevo respecto al palacio, que era uno solo. Dos mapas del mismo pack se
ven seguidos, asi que:

- **Misma paleta, misma tecnica y mismo nivel de detalle en todos.** Si uno es
  acuarela y el otro es tinta, parecen de productos distintos.
- **Que se note que uno esta dentro o debajo del otro**, si lo esta. El mapa
  de la mina se lee mejor si su boca esta arriba, justo donde el camino la deja
  en el mapa del pueblo.
- **El lugar que une los dos mapas aparece en los dos** (en Valdoria, el camino
  a la mina arriba y la boca de la mina abajo), asi el jugador entiende que son
  el mismo sitio visto desde cada lado.

---

# Los cuatro prompts

**Copialos del bloque tal cual, entero.** Van en bloque de codigo y con cada
parrafo en una sola linea a proposito: escritos como cita de markdown, al
pegarlos se llevaban los `>` de cada linea y los cortes a media frase, y el
generador los leia como parte del prompt. Tampoco llevan negritas dentro, por
lo mismo: un generador de imagenes no entiende markdown, se come los asteriscos
como texto.

## 1. Valdoria, el pueblo (`pilot`, mapa `valdoria`)

```text
Mapa cenital ilustrado de Valdoria, un pueblo minero pequeño y pobre en un valle de montaña, de noche cerrada. Estilo mapa de fantasia pintado a mano con tinta y acuarela oscura, muy detallado, con textura de papel. Imagen apaisada de 1536x1024 pixeles (proporcion 3:2). Vista cenital ligeramente inclinada, como una maqueta vista desde arriba: se ven los tejados y tambien un poco las fachadas.

El pueblo vive de una mina que lleva nueve dias cerrada, y se nota: no hay carbon apilado, no hay carros cargados, no hay nadie fuera. Es un sitio que espera algo y no lo dice.

LOS CUATRO LUGARES QUE IMPORTAN, y tienen que verse claros, grandes y bien separados entre si, cada uno con un hueco de terreno vacio alrededor:

1. En el centro exacto de la imagen, una plaza de tierra apisonada, redonda y despejada, con un pozo de piedra circular en medio y un farol encendido junto al brocal. La plaza es la zona mas clara e iluminada del mapa.

2. Abajo a la izquierda del centro, la posada: el edificio mas grande del pueblo, dos pisos, tejado de pizarra en pendiente, chimenea con humo saliendo, ventanas amarillas de luz calida, un porche de madera y un establo pequeño al lado. Es el unico sitio con vida.

3. Arriba a la derecha, aislada sobre un afloramiento rocoso y separada del resto por arboles, una casa de piedra pequeña y maciza con todas las contraventanas cerradas. Por las rendijas de las contraventanas se escapan hilos de luz amarilla. Nada mas la ilumina: no tiene farol, ni porche, ni camino despejado.

4. Arriba a la izquierda, la boca de la mina: una estructura de madera apuntalada contra la ladera rocosa, con un arco de entrada oscuro, una torre de poleas de madera al lado y railes que salen del arco y se pierden. Delante, tablones cruzados clavados sobre la entrada. Vagonetas paradas y vacias.

EL CAMINO: un sendero de carro de tierra clara, con roderas marcadas, que entra por el borde inferior izquierdo de la imagen, pasa junto a la posada, cruza la plaza y sube en curva entre los pinos hasta la boca de la mina. Es el hilo que une los cuatro lugares y tiene que leerse de un vistazo. Faroles apagados de trecho en trecho.

EL RELLENO, que debe existir pero quedar claramente en segundo plano: seis u ocho casitas pequeñas de mineros, oscuras y con las ventanas apagadas, agrupadas en los bordes; cercas de madera rota; un par de cobertizos; huertos pequeños; un arroyo estrecho bajando por la derecha entre rocas. Todo mas pequeño, mas oscuro y con menos detalle que los cuatro lugares principales.

ALREDEDOR: laderas de roca gris y bosque denso de pinos oscuros cerrando el valle por los cuatro lados, con niebla baja entre los troncos.

LUZ Y PALETA: noche sin luna. Paleta oscura y calida: marron tierra, gris pizarra, verde pino muy apagado, y la luz amarilla y naranja de las ventanas y los faroles como unico color vivo. Contraste alto entre las zonas iluminadas y la oscuridad.

SIN: texto, letras, numeros, etiquetas, cartelas, rosa de los vientos, escalas, marcos decorativos, personas, animales, criaturas, carros en movimiento. Nada de humo de mas de una chimenea.
```

**Las cuatro zonas y donde deberian caer** (se miden despues sobre la imagen):
plaza en el centro, posada abajo a la izquierda del centro, casa de Osric
arriba a la derecha, camino abajo a la izquierda.

## 2. La mina (`pilot`, mapa `mina`)

```text
Corte vertical en seccion de una mina de montaña, como un plano de ingeniero antiguo dibujado a tinta sobre papel oscuro, con la roca pintada en acuarela y mucho detalle de estratos. Imagen vertical de 1024x1536 pixeles (proporcion 2:3), porque representa profundidad. Vista de perfil: la montaña esta cortada por la mitad y se ven las galerias una debajo de otra, como un hormiguero en seccion.

Es la misma mina de Valdoria, cerrada hace nueve dias. Herramienta en su sitio, nada roto, nada revuelto: la gente se fue de golpe y no volvio.

LOS NIVELES, de arriba abajo, centrados en el eje vertical de la imagen y bien separados entre si por roca maciza:

1. Arriba del todo, asomando en la ladera, la entrada vista de perfil: el arco de madera apuntalado, con la torre de poleas fuera y los tablones cruzados clavados encima. Ocupa poco: es solo el punto por donde se entra y se ve un poco del cielo nocturno y de los pinos. El peso de la imagen esta en lo que hay debajo.

2. Debajo, y este es el primer nivel importante: una galeria ancha y bien apuntalada con vigas de madera regulares, railes en el suelo, dos vagonetas paradas y llenas a medias, lamparas de aceite apagadas colgando de ganchos en las vigas, picos y palas apoyados en la pared. Ordenado.

3. Mas abajo, el segundo nivel: la galeria se estrecha, los puntales estan mas juntos y peor puestos, el agua corre por las paredes y hay charcos en el suelo. Una sola lampara colgada. Las vetas de la roca brillan humedas.

4. Mas abajo aun, el tercer nivel: el final de lo cartografiado. Aqui ya no hay railes ni vigas regulares: la roca esta cortada a mano, sin apuntalar, con marcas de pico visibles. Un tablon con papeles clavado en la pared, como un puesto de capataz abandonado.

5. En el fondo de la imagen, el pozo: un agujero vertical redondo abierto en el suelo de la ultima galeria, de bordes demasiado regulares y lisos para ser obra de picos. Oscuridad total dentro, sin fondo visible. Es el elemento mas inquietante del dibujo y debe notarse que no encaja con el resto de la mina.

LO QUE UNE LOS NIVELES: rampas cortas en zigzag y escaleras de madera entre galeria y galeria, dibujadas con lineas finas, de modo que se entienda el recorrido de arriba abajo de un vistazo.

LA ROCA: estratos horizontales de piedra dibujados con detalle alrededor de las galerias, mas claros arriba y mas oscuros y compactos hacia el fondo. Alguna raiz colgando en los niveles altos. Alguna veta mineral brillante.

LUZ Y PALETA: oscura. Negro, gris pizarra, marron de la madera, y el ocre calido de las pocas lamparas. La luz disminuye de arriba abajo: el primer nivel se ve, el pozo del fondo es negro. Misma tecnica, misma paleta y mismo nivel de detalle que el mapa del pueblo del mismo pack.

SIN: texto, letras, numeros, etiquetas, cartelas, flechas, cotas, escalas, personas, criaturas, esqueletos, tesoros, cristales magicos ni nada fantastico. Es una mina de trabajo, no una mazmorra.
```

**Nota de continuidad**: el marcador de la boca de la mina vive en el **mapa
del pueblo** (arriba a la izquierda, donde el generador la dibujo), no aqui.
Este mapa empieza en el primer nivel. Aun asi la entrada se dibuja arriba, sin
marcador, para que se entienda que es el mismo sitio visto desde dentro: es el
mismo arco de madera con los tablones cruzados que se ve en el pueblo.

## 3. El palacio interior (`private-botica`, mapa `palacio`)

```text
Mapa cenital de un recinto palaciego imperial chino clasico, el palacio interior donde viven las consortes del emperador, de noche. Ilustrado a tinta y acuarela oscura con mucho detalle arquitectonico. Imagen apaisada de 1536x1024 pixeles (proporcion 3:2). Vista cenital ligeramente inclinada: se ven los tejados curvos de teja vidriada y tambien algo de las fachadas y los patios.

Es una ciudad dentro de la ciudad: miles de personas viviendo de puntillas, con rutinas que no se rompen nunca. Hace poco se rompio una.

LOS CUATRO LUGARES QUE IMPORTAN, claros, grandes y bien separados, cada uno con patio o espacio abierto alrededor:

1. En el centro exacto, un patio ceremonial empedrado con un estanque rectangular de agua quieta, un puente de piedra curvo cruzandolo y faroles de papel encendidos en los bordes. Es el nudo por el que se pasa para ir a todas partes.

2. Arriba a la izquierda, el pabellon de jade: la residencia mas cuidada del recinto. Un pabellon elegante de tejado curvo de teja verde jade, con galeria cubierta de columnas rojas alrededor, escalinata de piedra, un jardin privado pequeño con arboles podados y un muro propio que lo separa del resto. Es el edificio mas bonito y mejor iluminado del mapa.

3. Arriba a la derecha, las cocinas imperiales: un edificio alargado y practico de tejado gris, con chimeneas humeando, un patio de servicio delante lleno de tinajas grandes, cestos apilados y dos pozos de agua, y un cobertizo con leña. Ventanas iluminadas: aqui se trabaja de noche.

4. Abajo en el centro, el almacen de hierbas de la farmacia de la corte: un edificio bajo, cerrado y sin ventanas al exterior, con una sola puerta abierta por la que se ven estanterias con frascos alineados, y un alero largo bajo el que cuelgan manojos de hierbas secandose en filas ordenadas. Apenas iluminado, con una lampara sola.

LO QUE LOS UNE: pasillos cubiertos de columnas rojas y tejadillo, que van del patio central a cada uno de los tres edificios, dibujados con claridad para que se entienda el recorrido. Losas de piedra entre ellos.

EL RELLENO, en segundo plano y mas oscuro: pabellones menores de otras consortes en los bordes, lavanderias con ropa tendida, un patio de servicio pequeño, arboles podados, algun ciruelo en flor, faroles rojos colgados a intervalos.

EL CIERRE: una muralla alta de ladrillo rojo oscuro rodea toda la imagen por los cuatro lados, con una unica puerta monumental de tejado curvo en el borde inferior. Se tiene que entender que aqui dentro no entra ni sale nadie sin pasar por ahi.

LUZ Y PALETA: noche. Paleta oscura y calida: rojo laca, verde jade apagado, gris teja, dorado viejo, y la luz calida de los faroles de papel. Contraste alto entre lo iluminado y las sombras de los patios.

SIN: texto, letras, numeros, etiquetas, cartelas, rosa de los vientos, escalas, personas, animales, dragones ni criaturas.
```

## 4. La ciudad exterior (`private-botica`, mapa `ciudad`)

```text
Mapa cenital de un barrio de placer de una ciudad imperial china, fuera de las murallas del palacio, de noche. Ilustrado con exactamente la misma tinta y acuarela oscura, la misma tecnica y el mismo nivel de detalle que el mapa del palacio del mismo pack. Imagen apaisada de 1536x1024 pixeles (proporcion 3:2). Vista cenital ligeramente inclinada.

Es un sitio vivo, apretado y ruidoso, lo contrario del palacio: aqui la gente si sale a la calle. Funciona con una economia de favores y rumores que llega mas lejos que la de la corte.

LO QUE IMPORTA, claro y en el centro:

1. En el centro de la imagen, la calle principal: ancha, empedrada, con hileras de farolillos rojos colgados de lado a lado cruzando por encima. A ambos lados, casas de placer de tres pisos con balcones corridos de madera labrada, cortinas, y ventanas iluminadas de rojo y naranja. Es la zona mas luminosa y detallada del mapa.

EL RELLENO, en segundo plano, mas oscuro y mas apretado: callejones estrechos y torcidos saliendo de la calle principal; tejados grises apiñados sin apenas huecos; patios traseros diminutos con ropa tendida y tinajas; un canal de agua estrecho con un puente de madera; puestos de comida cerrados con toldos recogidos; escaleras exteriores de madera. Densidad y desorden, frente al orden del palacio.

EL CIERRE: en el borde superior de la imagen, la muralla alta de ladrillo rojo oscuro del palacio, vista desde fuera, cerrando el barrio por arriba, con una puerta monumental cerrada y guardada. Es la misma muralla que rodea el mapa del palacio del mismo pack, y tiene que reconocerse. El contraste entre la muralla limpia y el amontonamiento del barrio a sus pies es el sentido de la imagen.

LUZ Y PALETA: noche. Paleta oscura y calida, con el rojo de los farolillos como unico color vivo y dominante, reflejado en el empedrado humedo. Mas saturada y mas caotica que el mapa del palacio, pero con la misma gama.

SIN: texto, letras, numeros, etiquetas, cartelas, rosa de los vientos, escalas, personas, animales ni criaturas.
```

**Nota de continuidad**: la muralla del borde superior es la misma que rodea el
mapa del palacio, vista desde fuera.

---

## Que hacer con la imagen cuando la tengas

1. **Convertirla a WebP** sin recortarla. El formato del pack es `.webp`; una
   captura de 3 MB en PNG se lleva mal con moviles y con el limite de subida.
   Referencia de lo que ya funciona: el palacio de La Mascarada es 1536x1024
   y pesa 418 KB.
2. **Guardarla** como `maps/<id>.webp` dentro del pack, con el nombre que
   declara el `image` del mapa (`valdoria.webp`, `mina.webp`,
   `palacio.webp`, `ciudad.webp`).
3. **Medir las coordenadas** sobre la imagen final, en porcentaje del ancho y
   del alto, y ponerlas en cada lugar (`map`, `x`, `y`).
4. **Comprobarlas pintando los marcadores encima** antes de dar el mapa por
   bueno. Es el paso que nadie quiere hacer y el que evita los dos errores de
   cada seis.

**Las coordenadas que ya estan puestas en los packs son una propuesta**, hechas
sobre la composicion pedida aqui. Al llegar la imagen real hay que medirlas de
verdad: si el generador puso la posada mas a la derecha, la coordenada se
mueve, no la imagen.

Relacionado: `docs/05` (formato de mapas en el pack), `docs/08` (como se guarda
donde esta cada personaje), `docs/13` 4.10 (lo que se ve en la mesa).

---

# Laminas de retratos de NPC

Dos laminas que faltan, una por pack. Se piden **en rejilla** porque
`tools/packs/crop-portraits.py` recorta de ahi los retratos sueltos al estandar
del pack (512x512, WebP, cara y hombros con la cara en el tercio superior).

**La receta que funciona, sacada de las laminas que Gabino ya genero**
(`img/ElTeQueNadieProbo/characters.png`, `img/LeBalMasque/npcs.png`): lo que
sale bonito **no es "un retrato en una celda", es una carta de personaje**. Esa
diferencia es la que hace que los retratos actuales tengan vida y los que yo
pedi al principio salieran planos.

- **Cada personaje en un panel vertical con marco**, como una carta
  coleccionable, con su **color propio** (granate, verde, indigo, rosa palo,
  ocre) que lo distingue de los demas.
- **Figura de medio cuerpo en pose expresiva**, no un busto quieto de frente:
  sosteniendo algo, gesticulando, mirando de lado. Cada uno hace algo que
  cuenta quien es.
- **Fondo desenfocado que situa la escena** detras de la figura (el salon con
  luz de araña, la ventana del pabellon, la botica), con profundidad de campo
  fuerte. No un fondo plano.
- **Cabeza y torso en la mitad superior del panel**, que es de donde sale el
  recorte de 512x512.
- **Rejilla regular**, todas las celdas iguales, con el margen del marco entre
  ellas.
- **Iluminacion calida y dramatica**, con la luz entrando desde un lado.
- **Sin texto, sin nombres, sin marcos decorados, sin numeros.**
- Mismo estilo, misma luz y mismo encuadre en toda la lamina.
- **El estilo lo manda el pack, no el gusto de quien escribe el prompt.** Cada
  pack tiene el suyo y un NPC nuevo tiene que parecerse a los jugables con los
  que va a compartir pantalla. **Hay que abrir un retrato existente del pack
  antes de escribir el prompt**, no suponerlo: aqui se pidieron los nueve en
  estilo realista cuando el piloto es pintura semirrealista de fantasia y la
  boticaria es anime, y no se habria notado hasta tener las laminas.

| Pack | Estilo de sus retratos |
|---|---|
| `pilot` (Valdoria) | Pintura digital semirrealista de fantasia, pincelada visible, luz fria azulada, fondo con algo de escenario desenfocado |
| `private-botica` | Anime / ilustracion japonesa, linea limpia, ojos grandes detallados, colores suaves, fondo desenfocado |
| `mascarada` | Anime tambien, pero mas oscuro y calido, con dorados y granates |

## 5. Los tres de Valdoria (`pilot`)

```text
Lamina de cartas de personaje, tres paneles verticales en una fila, como las cartas de un juego de rol ilustrado. Imagen de 3072x1024 pixeles. Cada panel tiene su propio marco fino y un color dominante distinto, separados por un margen oscuro.

Estilo: pintura digital semirrealista de fantasia, pincelada visible, mucho detalle en la cara y en las telas, iluminacion calida y dramatica con la luz entrando desde un lado. Como la ilustracion de personaje de un manual de rol de mesa. Nada de fotorrealismo y nada de anime: el punto medio, pintado.

Cada personaje aparece de medio cuerpo, en pose expresiva y haciendo algo que cuenta quien es, con la cabeza y el torso en la mitad superior de su panel. Detras de cada uno, el interior de la posada desenfocado con profundidad de campo fuerte: vigas bajas, el fuego del hogar, luz de farol.

Son gente de un pueblo minero pobre de montaña. Ropa de trabajo gastada, lana y cuero, nada de armaduras, nada de armas, nada de magia.

Panel 1, color dominante ocre apagado: un hombre joven de unos veinte años, delgado, pelo oscuro revuelto, ojeras marcadas de no dormir, camisa de lino sucia y delantal de mozo de posada. Sostiene una jarra a medio servir y mira de reojo hacia la puerta, como si vigilara. Miedo contenido que intenta disimular.

Panel 2, color dominante verde oscuro: una mujer de unos cuarenta y cinco años, robusta, pelo recogido con mechones grises, delantal sobre vestido de lana marron. Tiene una mano abierta sobre un libro de registro grueso, como protegiendolo, y mira al frente evaluando. Cortes pero sin calidez.

Panel 3, color dominante azul pizarra: un hombre de unos sesenta años, capataz de mina, barba gris descuidada de varios dias, cara curtida, abrigo pesado sobre camisa arrugada. Sostiene un farol bajo, que le ilumina la cara desde abajo. Agotado, sin dormir, con expresion de culpa y no de enfado.

Sin texto, sin nombres, sin letras, sin numeros.
```

Recorte: `python3 tools/packs/crop-portraits.py <lamina> content/packs/pilot/portraits tomas bren osric`

## 6. Los seis del palacio (`private-botica`)

```text
Lamina de cartas de personaje, seis paneles verticales en una rejilla de 3 columnas por 2 filas, como las cartas de un juego de rol ilustrado. Imagen de 3072x2048 pixeles. Cada panel tiene su propio marco fino y un color dominante distinto, separados por un margen claro.

Estilo: ilustracion anime japonesa de alta calidad, linea limpia, ojos grandes y detallados, sombreado suave y colorido rico, al estilo de una novela ligera de ambientacion china imperial clasica. Iluminacion calida de farol de papel. Tiene que parecerse a los retratos de los personajes jugables de este mismo pack, que son anime, no realistas.

Cada personaje aparece de medio cuerpo, en pose expresiva y haciendo algo que cuenta quien es, con la cabeza y el torso en la mitad superior de su panel. Detras de cada uno, un interior del palacio desenfocado con profundidad de campo fuerte: celosias de madera, ciruelos en flor, faroles de papel.

Todos visten hanfu o tunica china imperial, con la tela y los bordados detallados.

Panel 1, verde jade: una mujer joven de unos diecinueve años, boticaria, pelo negro recogido con un palillo sencillo, pecas, ropa de sirvienta sin adornos. Sostiene un frasco pequeño a contraluz y lo mira entrecerrando los ojos, analitica. Una venda fina en un antebrazo.

Panel 2, indigo profundo: un hombre joven de belleza llamativa e incomoda, pelo negro largo y perfecto, tunica de funcionario de alto rango en seda oscura con bordado discreto. Sonrie con la cabeza ligeramente ladeada, una sonrisa amable que no llega a los ojos.

Panel 3, rojo laca: una mujer de unos veinticinco años, consorte de rango alto, ojos verdes, pelo rojizo recogido con horquillas de jade y oro, tunica ricamente bordada. Sostiene una taza de te sin beberla, con porte sereno y frio.

Panel 4, gris piedra: un hombre de unos setenta años, medico de la corte, barba blanca rala, gorro de funcionario, tunica gris sencilla, gafas pequeñas. Escribe en un cuaderno con mano temblorosa, la mirada baja, cansado y prudente.

Panel 5, ocre viejo: un hombre de unos cuarenta años, estratega de la corte, gafas redondas de montura fina, pelo descuidado recogido a medias, tunica puesta sin cuidado. Sostiene una pieza de juego de mesa entre dos dedos, mirando a traves de quien tiene delante, ausente.

Panel 6, morado apagado: una mujer de unos veinticinco años, dama de servicio, rostro completamente inexpresivo, pelo negro liso y tirante, tunica lisa y oscura. Sostiene una bandeja con las dos manos, perfectamente quieta, casi sin presencia.

Sin texto, sin nombres, sin letras, sin numeros.
```

Recorte, por filas y de izquierda a derecha:
`python3 tools/packs/crop-portraits.py <lamina> <destino>/portraits maomao jinshi consorte-gyokuyou medico-anciano lakan suirei --rows 2`

**Ojo con el destino de la boticaria**: su pack vive en
`~/dev/rpg-packs/boticaria`, no en este repo (docs/07). El de Valdoria si va
en `content/packs/pilot/portraits`.
