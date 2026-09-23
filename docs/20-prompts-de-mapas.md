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

# Retratos de NPC

Faltan nueve retratos: tres de **Los Nueve Viajeros** (el piloto, carpeta
`content/packs/pilot`) y seis de **El te que nadie probo** (la boticaria,
carpeta `content/packs/private-botica`; el prefijo `private-` es solo porque
el pack no se versiona en este repo, docs/07).

## Como se usa, en cuatro pasos

1. **Copia el bloque entero del personaje** que quieras, del primer renglon al
   ultimo. Cada bloque ya lleva dentro el estilo del pack, la regla de
   consistencia y la descripcion del personaje: **no hay que juntar nada**.
2. Pegalo en el generador y pide **una imagen vertical, 1024x1536**.
3. Guarda la imagen como `<id>.png` en `img/` (por ejemplo `img/LosNueveViajeros/tomas.png`).
4. Avisame y la recorto al estandar del pack (512x512 WebP) con
   `crop-portraits.py` y la activo en la ficha.

**Por que los nueve bloques empiezan igual**: el estilo esta escrito una sola
vez por pack y se repite palabra por palabra en cada personaje, a proposito
(idea de GPT, 22-09). Es lo que hace que Maomao y Jinshi parezcan de la misma
serie. Si algun dia hay que cambiar el estilo, se cambia en los seis a la vez.

**Por que van sin marco ni tarjeta**: la ilustracion sola sirve para la ficha,
el dialogo, el selector y el mapa; el marco lo pone el cliente. Lo que da vida
(la pose, el fondo desenfocado, la luz lateral) esta dentro del prompt.

**Por que en ingles**: los generadores obedecen mejor los terminos de estilo en
ingles. Las descripciones de personaje podrian ir en español, pero mezclar
idiomas en un mismo prompt suele salir peor.

## El te que nadie probo (`private-botica`)

Destino de los recortes: `~/dev/rpg-packs/boticaria/portraits/`.

### Maomao (`maomao`)

```text
HIGH-QUALITY JAPANESE ANIME CHARACTER ILLUSTRATION, imperial Chinese court setting, light-novel character art.

Elegant Japanese anime illustration with clean and confident linework, highly detailed expressive eyes, refined facial features, delicate anime proportions, polished cel shading combined with soft painterly gradients, rich but controlled colors, subtle highlights on hair and silk, detailed traditional Chinese imperial clothing and embroidery.

The visual language must feel like a premium Japanese light novel illustration set in a classical imperial Chinese court: sophisticated, elegant, mysterious and slightly dramatic. NOT photorealistic. NOT western comic art. NOT realistic concept art. NOT chibi. NOT generic fantasy anime. It should feel like a professionally illustrated Japanese light novel character from the same fictional universe as the reference image.

Warm illumination from traditional Chinese paper lanterns, with soft amber highlights and gentle shadows. Color palette based on lacquer red, jade green, muted indigo, warm gold, ivory, dark brown and charcoal. Skin tones natural and softly shaded.

Character portrait from approximately the waist up. Character centered in the composition, occupying most of the vertical frame. Face positioned around the upper third. Three-quarter view or frontal pose. Clear silhouette. Elegant posture and expressive body language.

Background strongly out of focus with shallow depth of field. It should only suggest the interior of an imperial Chinese palace: blurred wooden lattice screens, red architectural columns, distant paper lanterns, soft flowering plum branches and warm architectural shapes. No recognizable objects competing with the character. The background exists only to establish atmosphere and depth.

Highly detailed hair with individual strands, traditional Chinese hairstyle appropriate to social status, subtle jewelry when appropriate, historically inspired hanfu or imperial Chinese robes, layered silk fabrics, embroidered patterns, realistic folds and delicate ornamental details.

The character must communicate their personality through facial expression, posture, hands and small gestures rather than through exaggerated action.

Premium character artwork, polished anime illustration, cinematic composition, sophisticated color grading, beautiful face, expressive eyes, intricate costume design, soft atmospheric depth, elegant imperial Chinese aesthetic.

NO TEXT, NO NAME, NO LETTERS, NO NUMBERS, NO LABELS, NO UI, NO LOGOS, NO WATERMARK, NO CHARACTER CARD, NO DECORATIVE FRAME.

CHARACTER DESIGN CONSISTENCY:
All characters belong to the same fictional universe. Maintain the same facial rendering, eye design, line quality, color grading, lighting model, anatomy, costume detailing and overall illustration quality across every character. Characters must look like they were illustrated by the same artist for the same series.

CHARACTER: Maomao, a nineteen-year-old apothecary from the pleasure district, brought into the inner palace by paths she did not choose. Black hair tied simply with a plain wooden hairpin, small freckles, sharp observant eyes, hands faintly stained by herb dyes. Plain palace servant's outfit with no ornament.
PERSONALITY AND EXPRESSION: Analytical and awake, never smiling. She looks like she is examining evidence and noticing what everyone else missed.
POSE / ACTION: Three-quarter view. She holds a small glass vial up toward the lantern light and studies it with narrowed eyes. A thin bandage is visible on one forearm.
CLOTHING: Simple layered servant's hanfu in muted jade green and gray, practical fabric, no decoration.
ACCESSORIES: Wooden hairpin, a small herb pouch at the waist, no jewelry.
```

### Jinshi (`jinshi`)

```text
HIGH-QUALITY JAPANESE ANIME CHARACTER ILLUSTRATION, imperial Chinese court setting, light-novel character art.

Elegant Japanese anime illustration with clean and confident linework, highly detailed expressive eyes, refined facial features, delicate anime proportions, polished cel shading combined with soft painterly gradients, rich but controlled colors, subtle highlights on hair and silk, detailed traditional Chinese imperial clothing and embroidery.

The visual language must feel like a premium Japanese light novel illustration set in a classical imperial Chinese court: sophisticated, elegant, mysterious and slightly dramatic. NOT photorealistic. NOT western comic art. NOT realistic concept art. NOT chibi. NOT generic fantasy anime. It should feel like a professionally illustrated Japanese light novel character from the same fictional universe as the reference image.

Warm illumination from traditional Chinese paper lanterns, with soft amber highlights and gentle shadows. Color palette based on lacquer red, jade green, muted indigo, warm gold, ivory, dark brown and charcoal. Skin tones natural and softly shaded.

Character portrait from approximately the waist up. Character centered in the composition, occupying most of the vertical frame. Face positioned around the upper third. Three-quarter view or frontal pose. Clear silhouette. Elegant posture and expressive body language.

Background strongly out of focus with shallow depth of field. It should only suggest the interior of an imperial Chinese palace: blurred wooden lattice screens, red architectural columns, distant paper lanterns, soft flowering plum branches and warm architectural shapes. No recognizable objects competing with the character. The background exists only to establish atmosphere and depth.

Highly detailed hair with individual strands, traditional Chinese hairstyle appropriate to social status, subtle jewelry when appropriate, historically inspired hanfu or imperial Chinese robes, layered silk fabrics, embroidered patterns, realistic folds and delicate ornamental details.

The character must communicate their personality through facial expression, posture, hands and small gestures rather than through exaggerated action.

Premium character artwork, polished anime illustration, cinematic composition, sophisticated color grading, beautiful face, expressive eyes, intricate costume design, soft atmospheric depth, elegant imperial Chinese aesthetic.

NO TEXT, NO NAME, NO LETTERS, NO NUMBERS, NO LABELS, NO UI, NO LOGOS, NO WATERMARK, NO CHARACTER CARD, NO DECORATIVE FRAME.

CHARACTER DESIGN CONSISTENCY:
All characters belong to the same fictional universe. Maintain the same facial rendering, eye design, line quality, color grading, lighting model, anatomy, costume detailing and overall illustration quality across every character. Characters must look like they were illustrated by the same artist for the same series.

CHARACTER: Jinshi, a high-ranking official of the inner palace, young, of a beauty so striking it makes people uncomfortable to look at him directly. Long perfectly kept black hair, pale refined features, elegant posture.
PERSONALITY AND EXPRESSION: A gentle, polite smile that never reaches his eyes. He already knows more than he says. Calm, observant, impossible to read.
POSE / ACTION: Three-quarter view, head slightly tilted toward the viewer. One hand lightly touches the edge of his sleeve, the other rests near his waist. Courtesy with hidden calculation.
CLOTHING: Dark indigo-black layered court robes of extremely fine silk with subtle gold embroidery. Elegant but restrained.
ACCESSORIES: A minimal refined hair ornament, a discreet jade detail. No weapons.
```

### Consorte Gyokuyou (`consorte-gyokuyou`)

```text
HIGH-QUALITY JAPANESE ANIME CHARACTER ILLUSTRATION, imperial Chinese court setting, light-novel character art.

Elegant Japanese anime illustration with clean and confident linework, highly detailed expressive eyes, refined facial features, delicate anime proportions, polished cel shading combined with soft painterly gradients, rich but controlled colors, subtle highlights on hair and silk, detailed traditional Chinese imperial clothing and embroidery.

The visual language must feel like a premium Japanese light novel illustration set in a classical imperial Chinese court: sophisticated, elegant, mysterious and slightly dramatic. NOT photorealistic. NOT western comic art. NOT realistic concept art. NOT chibi. NOT generic fantasy anime. It should feel like a professionally illustrated Japanese light novel character from the same fictional universe as the reference image.

Warm illumination from traditional Chinese paper lanterns, with soft amber highlights and gentle shadows. Color palette based on lacquer red, jade green, muted indigo, warm gold, ivory, dark brown and charcoal. Skin tones natural and softly shaded.

Character portrait from approximately the waist up. Character centered in the composition, occupying most of the vertical frame. Face positioned around the upper third. Three-quarter view or frontal pose. Clear silhouette. Elegant posture and expressive body language.

Background strongly out of focus with shallow depth of field. It should only suggest the interior of an imperial Chinese palace: blurred wooden lattice screens, red architectural columns, distant paper lanterns, soft flowering plum branches and warm architectural shapes. No recognizable objects competing with the character. The background exists only to establish atmosphere and depth.

Highly detailed hair with individual strands, traditional Chinese hairstyle appropriate to social status, subtle jewelry when appropriate, historically inspired hanfu or imperial Chinese robes, layered silk fabrics, embroidered patterns, realistic folds and delicate ornamental details.

The character must communicate their personality through facial expression, posture, hands and small gestures rather than through exaggerated action.

Premium character artwork, polished anime illustration, cinematic composition, sophisticated color grading, beautiful face, expressive eyes, intricate costume design, soft atmospheric depth, elegant imperial Chinese aesthetic.

NO TEXT, NO NAME, NO LETTERS, NO NUMBERS, NO LABELS, NO UI, NO LOGOS, NO WATERMARK, NO CHARACTER CARD, NO DECORATIVE FRAME.

CHARACTER DESIGN CONSISTENCY:
All characters belong to the same fictional universe. Maintain the same facial rendering, eye design, line quality, color grading, lighting model, anatomy, costume detailing and overall illustration quality across every character. Characters must look like they were illustrated by the same artist for the same series.

CHARACTER: Consort Gyokuyou, one of the highest-ranking consorts, around twenty-five. Green eyes, reddish hair pinned with jade and gold hairpins, a face that gives nothing away.
PERSONALITY AND EXPRESSION: Serene, cold and very aware of being watched. A cool head that has just seen its unbreakable routine broken.
POSE / ACTION: Frontal pose, seated upright. She holds a cup of tea in both hands without drinking, looking straight at the viewer.
CLOTHING: Richly embroidered silk hanfu in lacquer red and gold, layered, immaculate.
ACCESSORIES: Jade and gold hairpins, a pair of earrings, a fan folded in her lap.
```

### El medico anciano (`medico-anciano`)

```text
HIGH-QUALITY JAPANESE ANIME CHARACTER ILLUSTRATION, imperial Chinese court setting, light-novel character art.

Elegant Japanese anime illustration with clean and confident linework, highly detailed expressive eyes, refined facial features, delicate anime proportions, polished cel shading combined with soft painterly gradients, rich but controlled colors, subtle highlights on hair and silk, detailed traditional Chinese imperial clothing and embroidery.

The visual language must feel like a premium Japanese light novel illustration set in a classical imperial Chinese court: sophisticated, elegant, mysterious and slightly dramatic. NOT photorealistic. NOT western comic art. NOT realistic concept art. NOT chibi. NOT generic fantasy anime. It should feel like a professionally illustrated Japanese light novel character from the same fictional universe as the reference image.

Warm illumination from traditional Chinese paper lanterns, with soft amber highlights and gentle shadows. Color palette based on lacquer red, jade green, muted indigo, warm gold, ivory, dark brown and charcoal. Skin tones natural and softly shaded.

Character portrait from approximately the waist up. Character centered in the composition, occupying most of the vertical frame. Face positioned around the upper third. Three-quarter view or frontal pose. Clear silhouette. Elegant posture and expressive body language.

Background strongly out of focus with shallow depth of field. It should only suggest the interior of an imperial Chinese palace: blurred wooden lattice screens, red architectural columns, distant paper lanterns, soft flowering plum branches and warm architectural shapes. No recognizable objects competing with the character. The background exists only to establish atmosphere and depth.

Highly detailed hair with individual strands, traditional Chinese hairstyle appropriate to social status, subtle jewelry when appropriate, historically inspired hanfu or imperial Chinese robes, layered silk fabrics, embroidered patterns, realistic folds and delicate ornamental details.

The character must communicate their personality through facial expression, posture, hands and small gestures rather than through exaggerated action.

Premium character artwork, polished anime illustration, cinematic composition, sophisticated color grading, beautiful face, expressive eyes, intricate costume design, soft atmospheric depth, elegant imperial Chinese aesthetic.

NO TEXT, NO NAME, NO LETTERS, NO NUMBERS, NO LABELS, NO UI, NO LOGOS, NO WATERMARK, NO CHARACTER CARD, NO DECORATIVE FRAME.

CHARACTER DESIGN CONSISTENCY:
All characters belong to the same fictional universe. Maintain the same facial rendering, eye design, line quality, color grading, lighting model, anatomy, costume detailing and overall illustration quality across every character. Characters must look like they were illustrated by the same artist for the same series.

CHARACTER: The old court physician, about seventy. Sparse white beard, an official's cap, small round spectacles, a face that has spent forty years learning what really kills in a court.
PERSONALITY AND EXPRESSION: Tired, prudent, watchful. He counts what goes missing and does not report it.
POSE / ACTION: Three-quarter view. He writes in a ledger with a visibly trembling hand while his eyes stay steady on the page.
CLOTHING: Plain gray official's robe, worn but clean.
ACCESSORIES: Spectacles, a brush, a numbered medicine jar beside him.
```

### Lakan (`lakan`)

```text
HIGH-QUALITY JAPANESE ANIME CHARACTER ILLUSTRATION, imperial Chinese court setting, light-novel character art.

Elegant Japanese anime illustration with clean and confident linework, highly detailed expressive eyes, refined facial features, delicate anime proportions, polished cel shading combined with soft painterly gradients, rich but controlled colors, subtle highlights on hair and silk, detailed traditional Chinese imperial clothing and embroidery.

The visual language must feel like a premium Japanese light novel illustration set in a classical imperial Chinese court: sophisticated, elegant, mysterious and slightly dramatic. NOT photorealistic. NOT western comic art. NOT realistic concept art. NOT chibi. NOT generic fantasy anime. It should feel like a professionally illustrated Japanese light novel character from the same fictional universe as the reference image.

Warm illumination from traditional Chinese paper lanterns, with soft amber highlights and gentle shadows. Color palette based on lacquer red, jade green, muted indigo, warm gold, ivory, dark brown and charcoal. Skin tones natural and softly shaded.

Character portrait from approximately the waist up. Character centered in the composition, occupying most of the vertical frame. Face positioned around the upper third. Three-quarter view or frontal pose. Clear silhouette. Elegant posture and expressive body language.

Background strongly out of focus with shallow depth of field. It should only suggest the interior of an imperial Chinese palace: blurred wooden lattice screens, red architectural columns, distant paper lanterns, soft flowering plum branches and warm architectural shapes. No recognizable objects competing with the character. The background exists only to establish atmosphere and depth.

Highly detailed hair with individual strands, traditional Chinese hairstyle appropriate to social status, subtle jewelry when appropriate, historically inspired hanfu or imperial Chinese robes, layered silk fabrics, embroidered patterns, realistic folds and delicate ornamental details.

The character must communicate their personality through facial expression, posture, hands and small gestures rather than through exaggerated action.

Premium character artwork, polished anime illustration, cinematic composition, sophisticated color grading, beautiful face, expressive eyes, intricate costume design, soft atmospheric depth, elegant imperial Chinese aesthetic.

NO TEXT, NO NAME, NO LETTERS, NO NUMBERS, NO LABELS, NO UI, NO LOGOS, NO WATERMARK, NO CHARACTER CARD, NO DECORATIVE FRAME.

CHARACTER DESIGN CONSISTENCY:
All characters belong to the same fictional universe. Maintain the same facial rendering, eye design, line quality, color grading, lighting model, anatomy, costume detailing and overall illustration quality across every character. Characters must look like they were illustrated by the same artist for the same series.

CHARACTER: Lakan, chief strategist of the outer court, about forty. Round thin-rimmed spectacles, hair carelessly half tied, a court robe put on without care.
PERSONALITY AND EXPRESSION: Absent, looking through whoever stands in front of him. He sees people as pieces on a board.
POSE / ACTION: Three-quarter view. He holds a single game piece between two fingers, examining it, not the viewer.
CLOTHING: Official's robe in muted ochre and brown, slightly disheveled, sash loosely tied.
ACCESSORIES: Spectacles, a xiangqi game piece, no jewelry.
```

### Suirei (`suirei`)

```text
HIGH-QUALITY JAPANESE ANIME CHARACTER ILLUSTRATION, imperial Chinese court setting, light-novel character art.

Elegant Japanese anime illustration with clean and confident linework, highly detailed expressive eyes, refined facial features, delicate anime proportions, polished cel shading combined with soft painterly gradients, rich but controlled colors, subtle highlights on hair and silk, detailed traditional Chinese imperial clothing and embroidery.

The visual language must feel like a premium Japanese light novel illustration set in a classical imperial Chinese court: sophisticated, elegant, mysterious and slightly dramatic. NOT photorealistic. NOT western comic art. NOT realistic concept art. NOT chibi. NOT generic fantasy anime. It should feel like a professionally illustrated Japanese light novel character from the same fictional universe as the reference image.

Warm illumination from traditional Chinese paper lanterns, with soft amber highlights and gentle shadows. Color palette based on lacquer red, jade green, muted indigo, warm gold, ivory, dark brown and charcoal. Skin tones natural and softly shaded.

Character portrait from approximately the waist up. Character centered in the composition, occupying most of the vertical frame. Face positioned around the upper third. Three-quarter view or frontal pose. Clear silhouette. Elegant posture and expressive body language.

Background strongly out of focus with shallow depth of field. It should only suggest the interior of an imperial Chinese palace: blurred wooden lattice screens, red architectural columns, distant paper lanterns, soft flowering plum branches and warm architectural shapes. No recognizable objects competing with the character. The background exists only to establish atmosphere and depth.

Highly detailed hair with individual strands, traditional Chinese hairstyle appropriate to social status, subtle jewelry when appropriate, historically inspired hanfu or imperial Chinese robes, layered silk fabrics, embroidered patterns, realistic folds and delicate ornamental details.

The character must communicate their personality through facial expression, posture, hands and small gestures rather than through exaggerated action.

Premium character artwork, polished anime illustration, cinematic composition, sophisticated color grading, beautiful face, expressive eyes, intricate costume design, soft atmospheric depth, elegant imperial Chinese aesthetic.

NO TEXT, NO NAME, NO LETTERS, NO NUMBERS, NO LABELS, NO UI, NO LOGOS, NO WATERMARK, NO CHARACTER CARD, NO DECORATIVE FRAME.

CHARACTER DESIGN CONSISTENCY:
All characters belong to the same fictional universe. Maintain the same facial rendering, eye design, line quality, color grading, lighting model, anatomy, costume detailing and overall illustration quality across every character. Characters must look like they were illustrated by the same artist for the same series.

CHARACTER: Suirei, a lady-in-waiting of about twenty-five with a completely expressionless face, black hair pulled straight and tight, the careful hands of someone who works with herbs.
PERSONALITY AND EXPRESSION: Still, silent, almost without presence. She knows more about herbs than her position explains.
POSE / ACTION: Frontal pose. She holds a lacquered tray with both hands, perfectly still, eyes lowered but not submissive.
CLOTHING: Plain dark servant's hanfu, no ornament, in muted purple-gray.
ACCESSORIES: None visible. Clean, cared-for hands.
```

## Los Nueve Viajeros (`pilot`)

Destino de los recortes: `content/packs/pilot/portraits/`.

### Tomas (`tomas`)

```text
HIGH-QUALITY PAINTED FANTASY CHARACTER ILLUSTRATION, low-fantasy mountain village setting, tabletop roleplaying manual character art.

Semi-realistic digital painting with visible confident brushwork, high detail in the face and in worn fabrics, natural proportions, soft painterly shading with strong value contrast. NOT photorealistic. NOT anime. NOT cartoon. NOT comic book. NOT chibi. The point between realism and illustration, clearly painted, like a character portrait in a premium tabletop roleplaying sourcebook. It should feel like it belongs to the same fictional universe as the reference image.

Cool night illumination in muted blue and slate gray, with a single warm source of lantern or hearth light striking the face from one side. Color palette based on earth brown, slate gray, muted pine green, iron, dirty linen and the amber of firelight. Skin weathered and naturally shaded.

Character portrait from approximately the waist up. Character centered, occupying most of the vertical frame. Face positioned around the upper third. Three-quarter view or frontal pose. Clear silhouette. Posture and hands that say who this person is.

Background strongly out of focus with shallow depth of field: only the suggestion of a low-beamed inn interior, firelight, rough stone, wet night air. No recognizable objects competing with the character.

Clothing of a poor mining village: worn wool, leather, linen, patched and practical. No armor, no weapons, no magic, no fantasy races.

The character must communicate their personality through facial expression, posture, hands and small gestures rather than through exaggerated action.

Premium character artwork, painterly illustration, cinematic composition, sober color grading, expressive weathered face, atmospheric depth.

NO TEXT, NO NAME, NO LETTERS, NO NUMBERS, NO LABELS, NO UI, NO LOGOS, NO WATERMARK, NO CHARACTER CARD, NO DECORATIVE FRAME.

CHARACTER DESIGN CONSISTENCY:
All characters belong to the same fictional universe. Maintain the same facial rendering, eye design, line quality, color grading, lighting model, anatomy, costume detailing and overall illustration quality across every character. Characters must look like they were illustrated by the same artist for the same series.

CHARACTER: Tomas, the inn's serving boy, about twenty, thin, with unkempt dark hair and deep shadows under his eyes from not sleeping. He recognizes the Nine Travelers even though the village has forgotten them.
PERSONALITY AND EXPRESSION: Contained fear he is trying to hide. He watches the door more than the tables.
POSE / ACTION: Three-quarter view. He holds a half-poured jug and glances sideways toward the door, as if keeping watch.
CLOTHING: Dirty linen shirt, a serving apron, worn wool trousers.
ACCESSORIES: The jug, a rag tucked in the apron. No jewelry.
```

### Bren (`bren`)

```text
HIGH-QUALITY PAINTED FANTASY CHARACTER ILLUSTRATION, low-fantasy mountain village setting, tabletop roleplaying manual character art.

Semi-realistic digital painting with visible confident brushwork, high detail in the face and in worn fabrics, natural proportions, soft painterly shading with strong value contrast. NOT photorealistic. NOT anime. NOT cartoon. NOT comic book. NOT chibi. The point between realism and illustration, clearly painted, like a character portrait in a premium tabletop roleplaying sourcebook. It should feel like it belongs to the same fictional universe as the reference image.

Cool night illumination in muted blue and slate gray, with a single warm source of lantern or hearth light striking the face from one side. Color palette based on earth brown, slate gray, muted pine green, iron, dirty linen and the amber of firelight. Skin weathered and naturally shaded.

Character portrait from approximately the waist up. Character centered, occupying most of the vertical frame. Face positioned around the upper third. Three-quarter view or frontal pose. Clear silhouette. Posture and hands that say who this person is.

Background strongly out of focus with shallow depth of field: only the suggestion of a low-beamed inn interior, firelight, rough stone, wet night air. No recognizable objects competing with the character.

Clothing of a poor mining village: worn wool, leather, linen, patched and practical. No armor, no weapons, no magic, no fantasy races.

The character must communicate their personality through facial expression, posture, hands and small gestures rather than through exaggerated action.

Premium character artwork, painterly illustration, cinematic composition, sober color grading, expressive weathered face, atmospheric depth.

NO TEXT, NO NAME, NO LETTERS, NO NUMBERS, NO LABELS, NO UI, NO LOGOS, NO WATERMARK, NO CHARACTER CARD, NO DECORATIVE FRAME.

CHARACTER DESIGN CONSISTENCY:
All characters belong to the same fictional universe. Maintain the same facial rendering, eye design, line quality, color grading, lighting model, anatomy, costume detailing and overall illustration quality across every character. Characters must look like they were illustrated by the same artist for the same series.

CHARACTER: Bren, who runs the inn and keeps the guest register, about forty-five, sturdy, hair pinned up with gray strands loose.
PERSONALITY AND EXPRESSION: Direct, evaluating, mouth closed. Courteous until she stops being courteous. She writes everything down and shows nothing.
POSE / ACTION: Frontal pose. One open hand rests flat on a thick leather-bound register as if guarding it; she looks straight at the viewer.
CLOTHING: Brown wool dress with a work apron, sleeves rolled.
ACCESSORIES: The register, a ring of keys at the waist.
```

### Osric (`osric`)

```text
HIGH-QUALITY PAINTED FANTASY CHARACTER ILLUSTRATION, low-fantasy mountain village setting, tabletop roleplaying manual character art.

Semi-realistic digital painting with visible confident brushwork, high detail in the face and in worn fabrics, natural proportions, soft painterly shading with strong value contrast. NOT photorealistic. NOT anime. NOT cartoon. NOT comic book. NOT chibi. The point between realism and illustration, clearly painted, like a character portrait in a premium tabletop roleplaying sourcebook. It should feel like it belongs to the same fictional universe as the reference image.

Cool night illumination in muted blue and slate gray, with a single warm source of lantern or hearth light striking the face from one side. Color palette based on earth brown, slate gray, muted pine green, iron, dirty linen and the amber of firelight. Skin weathered and naturally shaded.

Character portrait from approximately the waist up. Character centered, occupying most of the vertical frame. Face positioned around the upper third. Three-quarter view or frontal pose. Clear silhouette. Posture and hands that say who this person is.

Background strongly out of focus with shallow depth of field: only the suggestion of a low-beamed inn interior, firelight, rough stone, wet night air. No recognizable objects competing with the character.

Clothing of a poor mining village: worn wool, leather, linen, patched and practical. No armor, no weapons, no magic, no fantasy races.

The character must communicate their personality through facial expression, posture, hands and small gestures rather than through exaggerated action.

Premium character artwork, painterly illustration, cinematic composition, sober color grading, expressive weathered face, atmospheric depth.

NO TEXT, NO NAME, NO LETTERS, NO NUMBERS, NO LABELS, NO UI, NO LOGOS, NO WATERMARK, NO CHARACTER CARD, NO DECORATIVE FRAME.

CHARACTER DESIGN CONSISTENCY:
All characters belong to the same fictional universe. Maintain the same facial rendering, eye design, line quality, color grading, lighting model, anatomy, costume detailing and overall illustration quality across every character. Characters must look like they were illustrated by the same artist for the same series.

CHARACTER: Osric, the mine foreman, about sixty, weathered face, several days of unkempt gray beard, a man who has been shut in his house for eight days with the light on. Thirty years ago he went down the shaft with a bronze bell and came up alone.
PERSONALITY AND EXPRESSION: Exhausted and sleepless, with the eyes of someone who has not opened the door to anyone. Guilt, not anger.
POSE / ACTION: Three-quarter view. He holds a lantern low, so it lights his face from below, and looks slightly past the viewer.
CLOTHING: Heavy wool coat over a wrinkled shirt, a foreman's leather belt.
ACCESSORIES: The lantern. No bell in frame.
```

## Lo que se aprendio antes de llegar aqui, para no repetirlo

- **Abrir un retrato existente del pack antes de escribir el prompt.** Los
  nueve se pidieron primero en estilo realista sin mirar ninguno, y el piloto
  es pintura semirrealista y la boticaria es anime. Un NPC realista al lado de
  jugables anime canta.
- **Las laminas originales siguen en `img/`** (`ElTeQueNadieProbo/characters.png`,
  `LeBalMasque/npcs.png`, `LeBalMasque/characters.png`). Cuando se crea que se
  perdio una receta, mirar ahi primero.
- **"Anime" a secas deja demasiado margen.** Lo que lleva al estilo concreto
  es la combinacion: light-novel illustration, clean linework, refined
  proportions, soft painterly shading, y el escenario. Lo mismo vale para el
  piloto con "painted, tabletop sourcebook, not anime, not photo".
