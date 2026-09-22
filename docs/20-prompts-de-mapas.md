# 20. Prompts para generar los mapas de un pack

Fecha: 2026-09-22.

Los cuatro prompts que faltan para que los tres packs tengan mapa, y la receta
para escribir el siguiente. Salen de lo aprendido generando el palacio de La
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
- **Cuadrada (1:1).** El lienzo de la aplicacion es cuadrado; una imagen
  apaisada sale recortada o con franjas.
- **Zonas bien separadas y distinguibles**, con espacio vacio entre ellas: ahi
  es donde caen los marcadores.
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

## 1. Valdoria, el pueblo (`pilot`, mapa `valdoria`)

> Mapa cenital ilustrado de un pueblo minero pequeño de montaña, estilo mapa de
> fantasia dibujado a mano con tinta y acuarela oscura. Imagen cuadrada.
>
> Composicion, en rejilla de tres por tres: en el centro una plaza de tierra
> con un pozo de piedra; abajo a la izquierda del centro, una posada de dos
> pisos con tejado de pizarra y humo en la chimenea; arriba a la derecha, una
> casa de piedra aislada con las contraventanas cerradas y luz en las rendijas;
> desde la esquina inferior izquierda, un camino de carro que sube entre pinos
> y sale por el borde inferior de la imagen.
>
> Entre los cuatro puntos, espacio vacio: tierra, hierba seca y pinos sueltos.
> Noche cerrada con niebla baja. Paleta oscura y calida: marron tierra, verde
> pino apagado, y la luz amarilla de las ventanas como unico color vivo.
>
> Sin texto, sin etiquetas, sin numeros, sin rosa de los vientos, sin personas
> ni animales.

**Las cuatro zonas y donde deberian caer** (se miden despues sobre la imagen):
plaza en el centro, posada abajo a la izquierda del centro, casa de Osric
arriba a la derecha, camino abajo a la izquierda.

## 2. La mina (`pilot`, mapa `mina`)

> Corte vertical en seccion de una mina de montaña, estilo plano de ingeniero
> antiguo dibujado a tinta sobre papel oscuro, con la roca en acuarela. Imagen
> cuadrada. **Vista de perfil**: se ve la montaña cortada por la mitad y las
> galerias una debajo de otra.
>
> Composicion, de arriba abajo por el centro de la imagen: arriba del todo, la
> boca de la mina, un arco de madera apuntalado en la ladera; debajo, una
> galeria ancha con railes y vagonetas; mas abajo, una galeria mas estrecha con
> agua en las paredes; mas abajo aun, una galeria sin apuntalar cortada a mano;
> y en el fondo, un pozo vertical redondo, demasiado regular, del que no se ve
> el final.
>
> Las cuatro galerias unidas por rampas cortas, bien separadas entre si, con
> roca maciza alrededor. Paleta oscura: negro, gris pizarra, ocre de las
> lamparas. La misma tecnica y la misma paleta que el mapa del pueblo del mismo
> pack.
>
> Sin texto, sin etiquetas, sin numeros, sin personas.

**Nota de continuidad**: la boca de la mina es el mismo sitio donde muere el
camino del mapa del pueblo. Conviene que se parezca.

## 3. El palacio interior (`private-botica`, mapa `palacio`)

> Mapa cenital de un recinto palaciego imperial de estilo chino clasico, dentro
> de una muralla, ilustrado a tinta y acuarela. Imagen cuadrada.
>
> Composicion, en rejilla de tres por tres: en el centro, un patio empedrado
> con un estanque; arriba a la izquierda, un pabellon elegante de tejado curvo
> verde jade rodeado de un jardin pequeño; arriba a la derecha, un edificio
> alargado de cocinas con patio de servicio y pozos de agua; abajo en el
> centro, un almacen bajo y cerrado, con estantes visibles por una puerta
> abierta y hierbas secandose bajo el alero.
>
> Todo dentro de una muralla de ladrillo rojo oscuro que rodea la imagen. Entre
> los edificios, espacio abierto: losas, arboles podados y pasillos cubiertos.
> Noche. Paleta oscura y calida: rojo laca, verde jade apagado, dorado viejo.
>
> Sin texto, sin etiquetas, sin numeros, sin personas.

## 4. La ciudad exterior (`private-botica`, mapa `ciudad`)

> Mapa cenital de un barrio de placer de una ciudad imperial china, fuera de
> las murallas del palacio, ilustrado con la misma tinta y acuarela oscura que
> el mapa del palacio del mismo pack.
>
> Composicion: en el centro, una calle ancha de faroles rojos con casas de tres
> pisos con balcones corridos a ambos lados; alrededor, callejones estrechos y
> tejados apretados; en el borde superior de la imagen, la muralla del palacio
> cerrando el barrio por arriba, con una puerta.
>
> Noche. Paleta oscura y calida, con el rojo de los faroles como unico color
> vivo. **Mismo estilo y misma paleta que el mapa del palacio.**
>
> Sin texto, sin etiquetas, sin numeros, sin personas.

**Nota de continuidad**: la muralla del borde superior es la misma que rodea el
mapa del palacio, vista desde fuera.

---

## Que hacer con la imagen cuando la tengas

1. **Cuadrarla y convertirla a WebP.** El formato del pack es `.webp`; una
   captura de 3 MB en PNG se lleva mal con moviles y con el limite de subida.
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
