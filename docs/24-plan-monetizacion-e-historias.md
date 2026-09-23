# Plan de monetizacion, catalogo e historias

Sale del brief que GPT dejo con este numero (commit `b4b430a`, en el
historial) y de las decisiones de Gabino del 2026-09-23. El brief hacia
veintidos preguntas; aqui estan las respuestas, lo que queda abierto con
dueño, y lo que no se construye. Completa a [15](15-packs-de-la-comunidad.md)
(packs y catalogo) y a [09](09-saas-scope.md) (cobro); cuando se
contradigan, manda este.

## 1. Posicionamiento: historias, con dos puertas

Decision de Gabino: **"historias" es el paraguas**. "Una historia donde tu
decides que pasa" le habla a quien lee novela ligera, ve anime o juega
visual novels y nunca ha jugado rol; "RPG con director de juego por IA" le
habla a quien si. No son conceptos peleados: la portada y las tarjetas de
mundos hablan de historias, y los llamados a la accion nombran a los dos
publicos ("tu novela ligera", "tu campaña de rol"). La marca (docs/21 y 22)
no cambia.

Riesgo que se registra: el publico de novela ligera y otome es mas joven que
el 18+ que fijan los terminos (docs/19). No se baja la edad; se acepta que
parte de ese publico queda fuera hasta que un abogado diga que hace falta
para menores.

## 2. Modelo economico

Tres cosas se cobran, y cada una tiene un coste distinto:

| Que | Coste marginal | Como se cobra |
|---|---|---|
| Turnos (inferencia) | 0.019 USD por turno medido (docs/17) | Paquetes de creditos por Stripe, ya en produccion (2, 5, 10 y 15 USD) |
| Mundos oficiales | cero (JSON y WebP) | Se desbloquean jugando, con el pase de temporada, o por compra directa |
| Publicar al catalogo | tiempo de revision de Gabino | Cola gratis; con prioridad para quien tiene pase (docs/15) |

Margen de los turnos: cerca del 50% tras inferencia y comision de Stripe
(3.6% mas 3 MXN por cobro en Mexico); el paquete de 2 USD deja alrededor de
1 USD. El margen de los mundos es casi todo: solo la comision de Stripe. Por
eso el pase y la compra directa importan: **monetizan contenido, no
computo**, que era lo que faltaba. Los tres planes Plata, Oro y Diamante,
declarados vacios en `config/credits.php`, se sustituyen por el pase.

### 2.1 Capitulos: la unidad de progreso

Un **capitulo** es un turno resuelto en el que la persona respondio, sea
anfitriona o invitada, en cualquier mesa. Sale de `turn_responses` (ya
existe) y se anota en un ledger por usuario al resolver el turno, para poder
aplicar el multiplicador del pase sin recalcular. Los invitados no pagan
turnos pero **si acumulan capitulos**: ese es el embudo (juegan de invitados,
desbloquean un mundo, abren su mesa, compran turnos).

### 2.2 Camino de temporada

Mundos oficiales colocados en umbrales de capitulos (por ejemplo 20, 60 y
120; los numeros se fijan con datos, ver seccion 6). Reglas:

- Lo desbloqueado **no caduca**. La temporada (3 meses) rota que mundos estan
  en el camino, nunca quita lo ganado.
- **Sin azar**: nada de cofres ni tiradas. Fuera de cualquier regulacion de
  apuestas y coherente con 18+.
- Un mundo desbloqueado es una activacion permanente, igual que "añadir a
  mis mundos" del catalogo (docs/15); la tabla es la misma con un campo
  `source` (gratis, desbloqueo, pase, compra, creador).

### 2.3 Pase de temporada

Un solo nivel. **Compra unica por Stripe, no suscripcion**, valida la
temporada en curso. Da: capitulos x2, acceso inmediato a los mundos de la
temporada, mas mundos privados que los dos gratis, y revision con prioridad
al publicar. **Nunca regala turnos**: el pase es contenido, el combustible se
compra aparte. Precio de partida: 5 USD, a ajustar con la beta.

### 2.4 Compra directa

Un mundo se puede comprar suelto, tuyo para siempre, sin esperar el camino.
**Solo mundos originales o con licencia** (docs/07): la boticaria y cualquier
pack derivado de obra ajena no se vende ni entra al camino publico. Hoy eso
limita lo vendible al piloto y a La Mascarada; producir mundos originales
(mapas, retratos, sesiones) es un coste del plan, no un detalle.

### 2.5 Mundos de la comunidad

Gratis de activar, como dice docs/15. Revenue share para creadores se decide
despues de vender el primer mundo propio, con el porcentaje abierto.

### 2.6 BYOK

Se queda como opcion avanzada, sin limites nuevos. Quien pone su clave paga la
inferencia al proveedor y sigue consumiendo capitulos como cualquiera, asi
que el pase y los mundos le aplican igual. Es adopcion entre creadores, no
una fuga.

## 3. Catalogo como tienda

El catalogo de docs/15 (lista de packs con "añadir a mis mundos") se rediseña
como escaparate de mundos. Cada tarjeta tiene portada, titulo, genero,
etiquetas (tono, jugadores, duracion), autor y **un estado por usuario**:

| Estado | Que enseña la tarjeta |
|---|---|
| Gratis | Jugar |
| Tuyo | Jugar (desbloqueado, comprado o de tu pase) |
| En el camino | "Se desbloquea en N capitulos", con la barra de progreso |
| Del pase | "Incluido en tu pase" o "Con el pase de temporada" |
| En venta | Precio y comprar |
| De la comunidad | Añadir a mis mundos |

"Jugar" crea la mesa con ese mundo. El diseño visual lo trae Gabino
(bosquejo de GPT, como la portada); la construccion es la entrega 9 del
ROADMAP, con lo que se copia de `webapp-base` y `api-base` listado alli.

## 4. Historias publicas: la unica pieza del flywheel que se construye pronto

Una partida produce narracion. Con consentimiento, una narracion se puede
publicar. De todo lo que el brief proponia (canal de YouTube, Shorts,
episodios, ilustraciones), lo unico que necesita codigo es la **cronica
compartible**, que ademas ya estaba pendiente para streamers (ROADMAP, "cronica
publica"):

- Exportacion privada de una sesion o campaña, presentable (no el event store
  ni una proyeccion cruda).
- Enlace publico de solo lectura, con **consentimiento de todos los miembros**
  de la mesa (cada quien acepta desde su cuenta), anonimizacion opcional de
  nombres de jugadores, y retirada en cualquier momento por cualquiera de
  ellos.
- Bloques `system` y de capa `dm` fuera siempre (docs/08).

Producir video a partir de eso es trabajo editorial de Gabino con
herramientas externas, no una dependencia del producto.

## 5. Metricas antes de comprar trafico

Todo esto ya esta en la base de datos; lo que falta es un reporte semanal en
SQL (`php artisan` o una vista), sin plataforma de analitica:

1. Registros por semana.
2. Registro a primera mesa (creada o entrada por enlace).
3. Primera mesa a primer turno respondido.
4. Primera sesion a segunda sesion (la retencion que importa).
5. Invitados por anfitrion.
6. Capitulos por usuario (cuando exista el ledger).
7. Compras: cuantas, de que paquete, y capitulos previos a la primera compra.

Sin estos siete numeros no se fija precio del pase, ni umbral del camino, ni
se gasta un peso en publicidad.

## 6. Mercados

Hipotesis, no hechos: Mexico como mercado de validacion (cercano, en
español, amigos creadores); Estados Unidos como el que puede pagar. Nada se
decide hasta tener las metricas de la seccion 5. La web ya esta en español;
el ingles es la primera localizacion si el embudo de amigos funciona.

## 7. Fases, mapeadas al ROADMAP

| Fase del brief | Que es aqui | Donde |
|---|---|---|
| A. Validar la fantasia | Textos de historias en portada y tarjetas; beta cerrada con creadores | B1b, rumbo final |
| B. Retencion y pago | Stripe en real, embudo en SQL, capitulos y pase | Compuerta de Stripe, entrega 9 |
| C. Contenido comunitario | Catalogo de docs/15 (hecho), cronica compartible | Entrega 8, entrega 9d |
| D. Escalar adquisicion | Solo con señales; Steam y Epic diferidos (docs/23) | Sin fecha |

## 8. Lo que no se construye

Red social, chat general, feed, seguidores, lista de deseos, favoritos,
reseñas, recomendador, marketplace con reparto financiero, produccion de
video como infraestructura, integracion con tiendas, publicidad propia,
programa de creadores. Cada uno vuelve a la mesa solo con una metrica de la
seccion 5 que lo pida.

## 9. Respuestas cortas al brief

| Pregunta | Respuesta |
|---|---|
| Creditos compatibles con mundos premium | Si: los turnos son combustible, los mundos son contenido; no se mezclan |
| World/Product frente a Pack Version | Una fila de catalogo por mundo, con metadatos de producto; cada version de pack es inmutable y la mesa fija la suya (ya es asi) |
| Ownership | Una activacion permanente con `source`; no hay archivo que descargar |
| Coleccion | "Mis mundos", que ya existe |
| Wishlist y favoritos | No se construyen |
| Compartir un mundo | El enlace de la tarjeta; la invitacion a la mesa ya existe |
| Gratis, premium o comunidad | Estados de la tarjeta, seccion 3 |
| Revenue share | Despues del primer mundo propio vendido |
| BYOK | Se queda, seccion 2.6 |
| Cronica sin exponer el event store | Seccion 4 |
| Consentimiento y retirada | Todos los miembros, cualquiera retira |
| Anonimizacion | Nombres de jugadores; los personajes se quedan |
| YouTube | Trabajo editorial, sin dependencia tecnica |
| Cambios en API, web, engine, datos | Entrega 9 del ROADMAP; el engine no cambia |
| Que se valida con lo actual | Fase A entera |
| Que espera al PMF | Fase D y todo lo de la seccion 8 |
| Mercados | Seccion 6 |
| Metricas | Seccion 5 |
| Modelo que paga infraestructura, IA, legal y a Gabino | Turnos con 50% de margen mas pase y mundos con margen casi total; el volumen que hace falta se calcula con el embudo, no antes |
| Supuestos que necesitan medicion | Precio del pase, umbrales, tasa de conversion de invitado a anfitrion |

## Abierto, con dueño

- Precio del pase y umbrales del camino: Gabino, con las metricas de la beta.
- Contenido para menores: abogado (docs/19).
- Revenue share de creadores: Gabino, tras la primera venta.
- Ritmo de mundos originales por temporada: Gabino; minimo dos.
