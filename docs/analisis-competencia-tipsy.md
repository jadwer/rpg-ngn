# Competencia: Tipsy Chat, que nos sirve y que no

Analisis del 2026-09-24 sobre 70 capturas de la app Android que Gabino
recorrio ese dia (Tipsy Chat: Live Your Story, v1.4.9, en español de
Latinoamerica). Las capturas viven en `img/competencia/`, fuera del repo
porque traen datos de su cuenta. No es un plan: es la lista de lo que vale
la pena copiar, adaptar o evitar, para decidir cuando toque (catalogo E9,
monetizacion de `docs/24`, historias publicas).

## 1. Que es, en un parrafo

Chat 1:1 con personajes creados por la comunidad (mas de 100,000, segun su
pantalla de suscripcion; 1M+ descargas en Google Play), con imagen y video
generados en vivo, voz, y una economia de gemas muy trabajada. El catalogo
esta dominado por romance y contenido sugerente ("tabu familiar", medidor de
"corrupcion"). Cobra por suscripcion en Google Play: de 99 MXN al mes (949 al
año) a 909 MXN al mes (6,049 al año), mas paquetes de gemas.

**No es nuestro producto.** Tipsy es compañia individual; Ad Astra Mentis es
una mesa de varias personas con un director que respeta reglas, dados y
estado (`docs/06`), con campañas por sesiones y mundos con procedencia
(`docs/07`). Lo que Tipsy demuestra es otra cosa: **hay gente pagando entre
100 y 900 pesos al mes por historias con IA**, y ese es el mejor dato de
mercado que tenemos hasta ahora.

## 2. Imagenes de la historia: la pieza que mas vale

### Lo que hace

Mientras el texto del personaje ya se lee, la escena se genera aparte y
aparece de fondo ("Generando.." sobre la ilustracion anterior). Cada momento
importante cambia la imagen: la mujer en el sofa, sirviendo vino, con la
copa. Hay un interruptor de video por sesion y la imagen y el video se
cobran a tarifa fija por generacion, separada del texto.

### Si es viable para nosotros

Si, y la arquitectura ya lo permite sin tocar el contrato del motor:

- La narracion llega por bloques (`turn_blocks`) y la mesa los sondea. Una
  imagen es **un bloque mas** (`type: image`) que se añade al turno cuando
  termina de generarse, igual que la Fortuna de hoy se añade desde la API.
  El texto nunca espera a la imagen.
- El DM ya marca cambios de lugar y momentos (`world_event`, ubicacion en el
  estado). El disparador natural es **cambio de escena o momento clave, no
  cada turno**.
- La consistencia visual sale del propio pack: retratos de 512 como
  referencia de cada personaje, el mapa, y una linea de estilo en el
  manifiesto (`art_style`). Los modelos con imagen de referencia (Gemini
  Flash Image, FLUX Kontext, GPT Image) mantienen caras y ropa.
- Se genera en un job de la cola (`rpg-worker`), se guarda en WebP como
  los retratos y se sirve por la misma ruta que los packs.

### Cuanto cuesta

Precios publicados en septiembre de 2026, por imagen:

| Modelo | USD por imagen |
|---|---|
| GPT Image 1 Mini | 0.005 |
| Imagen 4 Fast | 0.02 |
| Gemini 2.5 Flash Image | 0.039 |
| GPT Image 1.5 | 0.04 |
| FLUX 2 Pro | 0.055 |
| Gemini 3.1 Flash Image (1K) | 0.067 |

Contra lo que ya medimos (`docs/17`): 0.019 USD por turno, 1.26 USD una
sesion de 20 turnos con cuatro jugadores en Sonnet y 0.42 en Haiku.

- **Una imagen por turno** con un modelo de 0.04: 0.80 USD por sesion.
  Duplica o triplica el coste. No.
- **Una por escena**, unas 5 por sesion, con un modelo de 0.04: 0.20 USD.
  Es 16% de una sesion en Sonnet y 48% en Haiku. Aceptable si se cobra.
- **Una por escena con un modelo barato** (0.005 a 0.02): 0.03 a 0.10 USD
  por sesion. Casi invisible.

### Si aporta valor

Mucho, por tres lados:

1. **En la mesa**: le da a quien viene de novela ligera y visual novel lo
   que espera ver (`docs/24`, seccion 1). Es el cambio de "chat con dados" a
   "historia ilustrada".
2. **En la cronica compartida** (`/cronica/<token>`): una cronica con
   imagenes por escena se comparte mucho mas que texto solo.
3. **El video de la campaña**: cronica + imagenes de cada escena + la voz
   del narrador (TTS) + ffmpeg = un video de YouTube por sesion, generado
   sin editar a mano. Es el flywheel de `docs/24` seccion 4 con coste
   marginal de centavos. Gabino tiene razon en que esta es la pieza.

### Riesgos

- **Moderacion**: generar imagenes de lo que escribe la gente abre la puerta
  a contenido que no queremos (Tipsy vive de eso). El prompt de imagen lo
  arma el motor desde el estado y el pack, **no desde el texto libre del
  jugador**, y pasa por la moderacion del proveedor.
- **Procedencia**: una imagen generada de un pack derivado de obra ajena
  hereda el problema de `docs/07`. Solo en packs originales o con licencia,
  igual que la venta.
- **Coste sin techo**: se cobra aparte (creditos por imagen, o incluido en
  el pase de temporada con un tope por sesion) y nunca sale del cupo gratis
  de texto.

### Propuesta

Una entrega corta despues de Stripe en real: imagen por escena, opcional
por mesa, modelo barato por defecto y uno bueno para la portada de la
cronica. Despues, el video de sesion como exportacion de la cronica.

## 3. Lo que vale la pena adoptar (ordenado por valor para nosotros)

1. **Sugerencias de respuesta**. Bajo el cuadro de escribir, dos
   acciones posibles generadas para ese momento ("Toma el telefono y dile a
   Tim que deje de molestarla") y un boton "Revisar" para pedir otras. Quita
   el miedo a la hoja en blanco, que es justo el problema del publico de
   novela ligera. Barato: el DM las devuelve en la misma llamada, por
   personaje.
2. **"Anteriormente..."** al volver: pantalla de resumen antes de retomar,
   con boton Continuar. Ya tenemos el recap y el cliffhanger de la sesion
   anterior (`docs/05`); falta enseñarlo asi al abrir la mesa.
3. **Elegir el narrador con precio visible**. Tipsy enseña cada modelo con
   su coste por mensaje (de 1 a 82 gemas) y una tabla que explica la
   formula. Para nosotros: "narrador estandar" y "narrador premium" (Haiku y
   Sonnet), con su coste en turnos a la vista. Es una palanca de
   monetizacion limpia: quien quiere mejor narracion paga mas por turno, y
   el que se lo explicamos es honesto.
4. **Etiquetas y pestañas de descubrimiento**: unas 60 etiquetas
   (Horror, Mystery, Historical, Villain, Scenario...), filtros y pestañas
   "Para ti", "Selecciones semanales", "Nuevos", "Favoritos de siempre",
   "Siguiendo". Encaja con el catalogo de E9 y con `atomo-taxonomy`.
5. **Onboarding con preferencias**: nombre, genero, rango de edad con
   confirmacion y codigo de invitacion en la primera pantalla. Alimenta el
   "Para ti" del catalogo. Nuestra casilla de 18+ ya va en esa linea.
6. **Invitacion con recompensa para los dos**: codigo de 6 u 8 digitos, 100
   gemas a quien invita y a quien entra, con abuso castigado. Nuestro enlace
   de mesa ya trae gente; darle capitulos a quien invita cierra el lazo de
   `docs/24`.
7. **Herramientas de creador**: subir TXT o JSON, dialogos de ejemplo,
   "nota del creador", saludo inicial, video de presentacion, sonido,
   etiquetas (hasta 10), visibilidad publica o privada, marca de agua,
   **borrador que se recupera** ("¿Restaurar progreso anterior?"). Para E8 y
   la beta con creadores: un editor web de mundos antes que pedirles un
   `.rpgpack`.
8. **Relacion con los personajes**: niveles por NPC con recompensas
   (cartas del personaje, "pensamiento interior", episodios especiales).
   Para nosotros tendria forma de **afinidad con NPC** dentro del estado del
   mundo y desbloqueos de lore. Ojo: el "pensamiento interior" choca con
   `docs/06` si revela secretos; solo con contenido que el pack marque como
   desbloqueable.
9. **Centro de ayuda y comentarios dentro de la app**: temas, preguntas
   frecuentes y un boton de comentarios. Nuestra guia del anfitrion es el
   primer paso; falta la del jugador y un "enviar comentario" en la mesa.
10. **Idiomas**: 15 idiomas. Nuestro mercado inicial es español, pero la
    interfaz deberia estar lista para traducirse antes de salir de Mexico.
11. **Detalles de pulido**: velocidad de reproduccion de la voz (1x, 2x),
    widget de la app, usuarios bloqueados, "eliminar cuenta" en ajustes (ya
    lo tenemos).

## 4. Lo que no hay que copiar

- **Presion de racha**: "Bonus de racha de 7 dias", "No rompas tu racha",
  recordatorios para no perder un dia. Funciona, pero es el patron que
  `docs/24` descarto (sin urgencia falsa, sin azar pagado), y con 18+ y
  dinero de por medio no vale el riesgo reputacional.
- **Ofertas con cuenta atras** ("2d 23h 46m") y "solo para nuevos usuarios"
  en cada pantalla.
- **Gemas por seguir redes y por compartir imagenes a diario**: infla
  metricas y llena las redes de spam de marca.
- **Contenido sugerente como motor**: medidores de "corrupcion" y
  catalogo de fantasias de relacion. Nos saca del publico de rol y de los
  creadores que queremos, y complica Google Play.
- **Dos monedas (gemas rojas y azules)**: su propia ayuda tiene que
  explicar la diferencia. Nuestros creditos en turnos son mas claros.

## 5. Lo que nos pone por delante

Para leer esto sin nervios: Tipsy compite en compañia 1:1 y ahi no vamos a
entrar. Lo que ellos no tienen, y es dificil de copiar:

- **Mesa de varias personas** con turnos, cuenta atras, presencia y un
  anfitrion que paga por todos: un grupo de amigos, no una persona sola.
- **Reglas de verdad**: el modelo propone, el motor valida y el estado
  persiste. Dados que tira el servidor, Fortuna del jugador, fichas y
  secretos que el DM no puede filtrar.
- **Campañas por sesiones** con cronica, cliffhanger y memoria del mundo,
  no una conversacion infinita que "confunde" al personaje (su propia ayuda
  tiene una pregunta sobre eso).
- **Mundos con procedencia** que se pueden vender sin miedo, y una
  cronica publica que sirve a streamers.

Lo que si nos marca Tipsy es **el piso visual y de pulido**: imagen de
escena, sugerencias, "anteriormente", descubrimiento por etiquetas y un
creador comodo. Con eso y la mesa compartida, el producto se defiende.

## Fuentes

- Capturas de la app, 2026-09-24 (`img/competencia/`, fuera del repo).
- Tipsy Chat en Google Play: https://play.google.com/store/apps/details?id=com.tipsyturbo.app
- Precios de imagen: https://www.buildmvpfast.com/api-costs/ai-image,
  https://ai.google.dev/gemini-api/docs/pricing,
  https://developer.puter.com/blog/best-image-generation-apis/
- Coste medido de nuestros turnos: `docs/17`, seccion Negocio.
