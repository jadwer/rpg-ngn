# 26. Plan del 04-10: historias que enganchan, avanzan y cierran

Aprobado por Gabino el 04-10. El resumen con casillas vive en el ROADMAP.
Lo escribe Fable para que Opus lo implemente bloque por bloque. Cada bloque
trae su porque, su diseño, los archivos y su criterio de hecho; no hace falta
releer la conversacion.

## Contexto

El 03-10 Gabino jugo dos mesas con amigos (42 y 43, mundo de la boticaria).
Resultado: casi dos horas, cansancio, y un jugador diciendo "ya solo quiero
saber quien es el asesino". Medido en produccion sobre la mesa 43:

| Dato | Valor |
|---|---|
| Turnos jugados | 12 en 1 h 50 min |
| Narracion por turno | 300 a 500 palabras (el prompt pide 250) |
| Dialogos de NPC por turno | 5 bloques |
| Tiempo del director por turno | 25 a 50 s |
| Tiempo de los jugadores por turno | 4 a 6 min |
| Cierres de algo (escena, mision, sesion) | 0 |
| Ilustraciones | 1 (al final) |
| Mensajes privados a un jugador | 0 |

Causas, verificadas en el codigo:

1. **Sin gancho.** La apertura (`packages/narrative/src/context.ts:394-407`)
   pide "situa a CADA personaje con un detalle propio" y prohibe eventos y
   tiradas. Entrega una presentacion tranquila porque eso se le pide. No es
   culpa del modelo.
2. **Sin cierre.** El prompt prohibe cerrar (`prompt.ts:56`: "Nunca cierres la
   escena por tu cuenta") y el motor no tiene nocion de acto, presupuesto de
   turnos ni final. La sesion solo termina si el anfitrion la cierra a mano, y
   los demas jugadores no ven nada cuando eso pasa.
3. **Sin recompensa intermedia.** Nada marca un logro cada pocos turnos.
4. **Lo privado no existe.** Los eventos tienen `witnesses`, pero
   `model-gm.ts` fuerza la party completa en todo, los bloques de narracion no
   tienen destinatario y la API (`TurnService::blocksPage`) no filtra por
   jugador.
5. **Pocas imagenes.** Una cada 5 turnos (`config/images.php`), y los mundos
   derivados no ilustraban (corregido el 03-10).
6. **El mundo no declara su forma.** No hay capitulos, final fijo, objetivo de
   sesion ni formato que el motor use (`catalog.format` existe pero solo
   adorna la ficha).

Correccion a lo dicho el 03-10: "1,900 palabras por turno" era falso (salio de
los tokens de salida, que incluyen razonamiento). El problema es de
estructura, no de volumen.

Resultado buscado: una sesion corta de unos 40 minutos que abre con un
incidente, entrega un logro cada dos o tres turnos y termina sola con una
pantalla de fin; mundos que declaran su formato; un one-shot de un jugador que
lo demuestra.

## Decisiones de Gabino (04-10)

- **Cierre**: la sesion se cierra sola al llegar al final. La pantalla de fin
  lleva siempre: "¿Te gustó esta aventura? Si quieres que continúe o tener
  una parte 2, dale 5 estrellas y no olvides dejar tu reseña". Esto destapa
  votos y reseñas (bloque H6).
- **Taxonomias**: las endurece el agente de AtomoPlatform en paralelo, y avisa
  a esta sesion cuando este. El pedido va primero (H0).
- **One-shot**: universidades reales (UNAM, IPN, UAM); la farmacia, parodiada.
  Titulo: "Ya descubrí mi pasión: ¡QUIERO SER MÉDICO!".
- **Probar con ChatGPT**: se mide con una prueba A/B de la apertura (H2), no
  se cambia de proveedor a ciegas.
- Formatos pedidos: historias de un jugador (contadas desde "el
  protagonista", no siempre mision), historias de grupo con el porque de cada
  jugador, one-shots cortos, y campañas de sesiones cortas, medias o largas
  configurables por mesa.

## Orden y dependencias

```
H0  Preparacion (pedido a Atomo, validacion pendiente, ROADMAP)
H1  Reloj de la historia, logros y cierre automatico     <- la base de todo
H2  Gancho de apertura y prueba A/B Claude contra GPT    depende de H1
H3  Imagenes por formato                                  depende de H1
H4  Arcos de autor: capitulos, finales fijos y ramas      depende de H1
H5  One-shot "¡Quiero ser médico!"                        depende de H2 y H4
H6  Estrellas y reseñas                                   depende de H1
H7  Lo privado: susurros y objetivo personal              independiente
H8  Formatos en la mesa y en Explorar                     depende de H4
H9  Catalogo sobre atomo/taxonomy                         depende de Atomo y H8
```

Reglas para todos los bloques:

- Web primero y app a la par (directriz primaria). Lo de la app sale en el
  AAB v25 al cerrar H7, antes del 14-10 (la prueba cerrada de Google arranca
  a mas tardar el 15-10).
- Sin CI: antes de cada push, `pnpm check` en el monorepo y
  `vendor/bin/phpunit` completo en la API, mas Pint y Larastan en lo tocado.
- Despliegue al cerrar cada bloque, con la guardia de turnos y respaldo si
  hay migraciones. Nunca mientras Gabino juega (preguntar si hay duda).
- Texto para jugadores con tildes; docs y commits sin tildes, sin guiones
  largos, sin emojis, sin Co-Authored-By.
- Lo visual (pantalla de fin, logros, susurros) se hace con las piezas y
  colores que ya existen y se le enseña a Gabino antes de pulir. Sin arte
  nuevo por iniciativa propia.
- Mesas existentes no cambian de comportamiento: sin `pacing` en sus ajustes
  siguen en modo libre (Valdoria incluida).

## H0. Preparacion

1. **Pedido a Atomo.** Hecho el 04-10: lo tomo la sesion `atomoplatform-d4`
   (texto en el anexo A). Avisara con la etiqueta, las firmas de `HasTerms` y
   `TaxonomyReader`, el nombre de la config y los pasos de actualizacion
   desde v0.2.0. Hasta entonces H9 espera; nada mas depende de ello.
2. **Validacion pendiente del 03-10.** Hubo cuatro despliegues con validacion
   parcial. Correr `pnpm check` y la suite completa de la API; arreglar lo que
   salga.
3. **Desplegar** el modal de consentimiento de compartir (`37fdacb`, solo web)
   y hacer su par en la app (`apps/mobile/src/components/`, mismo texto
   `shareConsent.*`).
4. **Portar el corte de subtitulos** nuevo al video del servidor (pendiente del
   02-10, `SessionVideoService.php`).
5. **ROADMAP.md**: seccion "Plan del 04-10" al principio, bajo el calendario
   de lanzamiento, con estos bloques. El calendario tiene holgura: Comunidad,
   voz y video (semanas 1 a 3) se cerraron el 02-10. Actualizar docs/17 y la
   memoria (`estado-proyecto.md`, y una memoria nueva de feedback: "medir
   antes de diagnosticar: los tokens de salida incluyen razonamiento").

## H1. Reloj de la historia, logros y cierre automatico

### Que es

Un reloj determinista que el motor calcula cada turno y le dice al director
en que tramo va y que debe entregar. El modelo propone el contenido; el motor
decide el tramo y valida el cierre.

### Largo de sesion

Ajuste nuevo de mesa `settings.pacing.length`:

| Valor | Turnos (con la apertura) | Tiempo aprox. |
|---|---|---|
| `corta` | 8 | 30 a 40 min |
| `media` | 14 | 60 a 75 min |
| `larga` | 22 | 100 a 120 min |
| `libre` | sin reloj (lo de hoy) | lo que dure |

Mesa nueva: toma `catalog.sessionLength` del mundo, o `corta`. Mesa
existente sin la clave: `libre`. Si la sesion del mundo trae `arc.turns`
(H4), manda eso.

### Tramos

Funcion pura `storyClock({ turn, total, extra, wrap })` en
`packages/narrative/src/pacing.ts` (nuevo, con tests). Para `total = 8`:

| Turno | Tramo | Lo que exige al director |
|---|---|---|
| 1 | `gancho` | apertura (H2) |
| 2 y 3 | `complicacion` | el problema se enreda; primer logro al cerrar el 3 |
| 4 y 5 | `escalada` | sube lo que esta en juego; segundo logro |
| 6 y 7 | `climax` | confrontacion o revelacion mayor; el 7 termina en el punto de decision final |
| 8 | `cierre` | resuelve la pregunta de la sesion y emite `close` |

Para otros totales, por fraccion: gancho (turno 1), complicacion (hasta 35%),
escalada (hasta 65%), climax (hasta el penultimo), cierre (ultimo). El
penultimo turno siempre avisa: "el siguiente es el ultimo".

Directivas que entran en `turnLayer` (`context.ts`), ademas del tramo:

- "Cada turno cambia algo: una pista, una consecuencia o un peligro nuevo.
  Cierra una pregunta chica y abre otra."
- Limite de texto: mesa de varios, 180 palabras y 2 dialogos de NPC de hasta
  dos frases; un jugador, 220 palabras. Sustituye al "250 palabras" de
  `prompt.ts:53` cuando hay reloj.
- En cada cambio de tramo: recordar el objetivo de la sesion en una frase
  dentro de la ficcion, y emitir un logro.
- Quitar para sesiones con reloj la prohibicion de `prompt.ts:56`: el cierre
  lo ordena el reloj.

### Logros (la recompensa cada pocos turnos)

Linea nueva del modelo: `{"kind":"milestone","title":"Descubrieron la página cortada"}`.
Una por turno como maximo, hasta 80 caracteres. El motor la valida
(`ModelLine` en `model-gm.ts:250`) y emite un bloque nuevo
`{type:'milestone', title}` (contrato en
`packages/engine-contract/src/index.ts:241`). Los clientes lo pintan como
banda dorada ("Logro: ..."). Es el "subio de nivel" del ejemplo de Gabino.

### Cierre

- Linea nueva del modelo: `{"kind":"close","cliffhanger":"...","ending":"<id>"}`
  (`ending` solo con H4). El motor la acepta solo si el reloj esta en `cierre`
  o si un final del arco lo permite (H4); fuera de eso se ignora y se cuenta
  como linea no aplicada.
- Si el modelo no emite `close` en el turno de cierre, el motor lo sintetiza
  (sin cliffhanger): la sesion termina igual.
- Salida nueva del motor en el resultado de `resolve`
  (`apps/engine/src/resolve.ts`, junto a `addressed` e `illustrations`):
  `close: { scope: 'session'|'chapter'|'story', cliffhanger?, endingId?, card: { title, text? } }`.
  `scope` sin H4 es siempre `session`.
- API, `TurnService::commitResult` (hacia la linea 514): si el resultado trae
  `close`, **no abre el turno siguiente**; cierra la sesion con el mismo
  camino de `closeSession` (extraer la parte comun a un metodo interno que no
  exija "sin turnos resolviendo", porque estamos dentro del commit) y añade
  al final del turno un bloque nuevo `ending`:
  `{type:'ending', scope, title, text?, achievements: string[], cliffhanger?, closedBy: 'director'|'host'}`.
  `achievements` son los `milestone` de los turnos de esa sesion (consulta a
  `turn_blocks`), no texto libre del modelo.
- El cierre manual del anfitrion (`TurnActionController::closeSession`)
  tambien escribe el bloque `ending` con `closedBy: 'host'`. Hoy los demas no
  ven nada.
- `ending` y `milestone` entran a `PUBLIC_BLOCKS` de `ChronicleController`
  (linea 43) y a `buildSlides` de `packages/ui-logic/src/presentation.ts`
  (una diapositiva de cierre con el titulo).

### Controles del anfitrion

- **Un turno mas**: `POST /api/v1/sessions/{session}/extend` (anfitrion; suma
  2 turnos, hasta 3 veces). Columna nueva `game_sessions.extra_turns`.
- **Pedir el final**: `POST /api/v1/sessions/{session}/wrap`. Columna
  `game_sessions.wrap_requested_at`. El siguiente turno entra como `cierre`.
  Es la salida para "ya solo quiero saber quien es el asesino": el director
  resuelve y cierra en un turno.
- La API manda al motor `context.pacing = { length, extra, wrap }`
  (`TurnService::buildRequest`, lineas 376-446; `TurnContext` es
  `strictObject` en engine-contract, hay que añadir el campo opcional).
- El estado de la mesa (`TurnActionController::state`) expone
  `pacing: { turn, total, phase }` para que el cliente pinte "Turno 5 de 8".

### Pantalla de fin

Componente nuevo `EndingOverlay` en web (`apps/web/src/components/`, junto a
`RecapOverlay.tsx`, misma base `.recap-overlay`) y `EndingModal` en la app
(junto a `RecapModal.tsx`). Pantalla completa, con entrada animada (fundido y
titulo que se abre; CSS, sin librerias):

- Titulo segun `scope`: "Fin de la sesión 2", "Fin del capítulo 1: El
  drama", "FIN", y para campaña terminada "Campaña terminada. ¡Felicidades!".
- Texto de la tarjeta si el mundo lo trae (H4).
- "Lo que lograron": los logros.
- "Continuará…" con el cliffhanger, si hay.
- El mensaje fijo de valoracion con cinco estrellas y reseña (H6; hasta
  entonces, solo el texto).
- Botones: "Seguir jugando" (anfitrion: abre la sesion siguiente; los demas
  ven "Esperando al anfitrión"), "Leer la historia", "Salir".

Sale cuando llega un bloque `ending` en vivo, o al entrar a una mesa cuyo
ultimo bloque es un `ending` no visto (clave en `localStorage`, como el
recap). Tambien sale en modo pantalla: es el momento de la mesa presencial.

### Archivos

- Monorepo: `packages/narrative/src/pacing.ts` (nuevo), `context.ts`,
  `prompt.ts`, `model-gm.ts`; `packages/engine-contract/src/index.ts`
  (`TurnContext.pacing`, bloques `milestone` y `ending`, `close` en el
  resultado); `apps/engine/src/resolve.ts`; `packages/ui-logic/src/blocks.ts`,
  `views.ts`, `presentation.ts`, y un `pacing.ts` de presentacion ("Turno 5
  de 8", etiqueta del tramo); `packages/api-client` (`extendSession`,
  `wrapSession`, tipos); `packages/i18n` (namespace `ending`, claves de
  `tableRules`); web y app: overlay, banda de logro en `Blocks.tsx` y
  `BlockGroups.tsx`, selector de largo en `TableRulesPanel.tsx` y
  `DiceModePanel.tsx`, botones en `HostPanel`.
- API: migracion (`extra_turns`, `wrap_requested_at` en `game_sessions`),
  `TurnService`, `TurnActionController`, `TableRequest.php` (validar
  `pacing.length`), `TableSchema`.

### Hecho cuando

- Test de motor: con `total = 8` el contexto de cada turno lleva el tramo
  correcto; `close` fuera del cierre se ignora; en el turno 8 sin `close` del
  modelo se sintetiza.
- Test de API: un turno resuelto con `close` deja la sesion cerrada, no abre
  turno nuevo, escribe el bloque `ending` con los logros; `extend` y `wrap`
  cambian el reloj; el cierre manual tambien escribe `ending`.
- Partida local de 8 turnos con el modelo real en el piloto: termina sola,
  con al menos dos logros y la pantalla de fin en web y app.

## H2. Gancho de apertura y prueba A/B

1. Reescribir la apertura en `turnLayer` (`context.ts:394-407`):
   - El primer bloque es un incidente que ocurre ahora y exige decidir, no una
     descripcion del lugar.
   - Cada personaje entra en una linea, atado al incidente (lo que le toca a
     el), no con un retrato.
   - Lo que esta en juego se dice explicito dentro de la ficcion.
   - Se permite un `world_event`; siguen sin tiradas en la apertura.
   - Cierra con un dilema con prisa ("el cuerpo sale al crematorio al
     amanecer: ¿que hacen?"), no con "¿que hacen?" a secas.
   - Si la sesion del mundo trae `arc.hook` u `arc.objective` (H4), son el
     punto de partida obligado.
   - Se conservan el recap de sesion previa y la adaptacion a un jugador.
2. Herramienta `tools/ab-opening/` (script Node del monorepo, usa
   `packages/narrative` con los fixtures y `FileSource`): corre la apertura de
   un mundo y sesion dados con cada proveedor (`anthropic` claude-sonnet-5,
   `openai` gpt-5) y con el prompt viejo y el nuevo, y escribe un Markdown
   lado a lado en `gm/ab/` (gitignored). Costo: centavos.
3. Gabino lee el resultado (piloto, mascarada y boticaria) y decide si el
   preset por omision cambia. El plan no cambia de proveedor por su cuenta.

Hecho cuando: test que fija las piezas de la apertura nueva en el contexto;
el Markdown del A/B entregado a Gabino.

## H3. Imagenes por formato

- `Illustration.reason` (`engine-contract/src/index.ts:305`) gana `climax` y
  `ending`. El motor los marca desde el reloj: primer turno del tramo
  `climax` y el turno de cierre.
- `SceneIllustrator::plan` (`rpg-ngn-api/app/Services/Images/SceneIllustrator.php:36-71`):
  `opening`, `climax` y `ending` se saltan `tooSoon` (no el tope por sesion).
  Corregir de paso el `return` dentro del `foreach` que descarta el resto de
  ilustraciones del turno: debe ser `continue`.
- `config/images.php`: `min_turn_gap` por largo de sesion: corta 2, media 3,
  larga y libre 5. La API ya conoce el largo por los ajustes de la mesa.
- Resultado en sesion corta: apertura, climax, final y dos o tres mas, unas 5
  o 6 imagenes (alrededor de 0.20 USD con Gemini). El tope de 12 no cambia.
  El plan gratuito sigue en 1 por sesion (decision de precios aparte).

Hecho cuando: `SceneImageTest` cubre los tres motivos que saltan el hueco, el
hueco por largo y el `continue`; una sesion corta local produce al menos 4
imagenes y la presentacion vertical ya no es de una sola.

## H4. Arcos de autor: capitulos, finales fijos y ramas

El mundo declara la forma de cada sesion. Campo opcional `arc` en la sesion
del pack (`packages/content/src/session.ts`, `strictObject`):

```
arc: {
  chapter?:  { number, title }        // "Capítulo 1: El drama"
  turns:     { target, min? }         // presupuesto; manda sobre el ajuste de la mesa
  hook?:     string                   // incidente de apertura, escrito por el autor
  objective?: string                  // objetivo visible para los jugadores
  beats?:    string[]                 // puntos de trama obligados, en orden (capa del GM)
  fixedOutcome?: string               // desenlace inevitable (capa del GM)
  endings?:  [{ id, when, title, text, final?, default?, next? }]
  endCard?:  { title?, text? }        // tarjeta de cierre si no hay endings
}
```

Y en el manifiesto (`packages/content/src/pack.ts`): `finale?: { title, text }`,
el texto de fin de historia ("Y así termina la historia de los Nueve
Viajeros… ¿Nos encontraremos alguna otra vez? Quizá. Solo el tiempo lo
dirá.").

Reglas:

- `beats` y `fixedOutcome` van al director en `worldLayer` (`context.ts:103`)
  con esta instruccion: "Desenlace inevitable: lo que decida el jugador cambia
  el como, nunca el que. No lo anuncies. Haz que cada camino desemboque ahi
  con causas creibles, sin castigar al jugador por intentarlo."
- `endings`: el director recibe cada `when` (condicion en prosa) y elige uno
  en la linea `close` (`ending`). El motor valida que el id exista; si falta
  o no existe en el turno de cierre, usa el `default`. Un final con `when`
  puede dispararse antes del presupuesto, desde `turns.min` (por omision 2).
  El titulo y el texto de la tarjeta salen del mundo, no del modelo.
- `scope` del cierre: `chapter` si la sesion tiene `arc.chapter` y no es la
  ultima; `story` si el final elegido es `final`, o si es la ultima sesion
  del mundo y hay `finale`; si no, `session`.
- Cierre `story`: columna nueva `game_tables.finished_at`. La mesa queda
  "Terminada" en la lista (`packages/ui-logic/src/table-list.ts`) y no abre
  mas sesiones.
- "Seguir jugando" tras un capitulo abre `ending.next` o la sesion siguiente
  del manifiesto.
- El objetivo visible: el motor devuelve `objective` junto al titulo de la
  sesion en el resultado; la API lo guarda con la sesion y lo expone en
  `state`. Los clientes lo fijan a la vista ("Objetivo: ...") en la cabecera
  de la escena (web `scene-hero`, app cabecera de la mesa). Con el recordatorio
  del reloj en cada cambio de tramo, el objetivo aparece tres veces o mas.
- `pnpm validate` comprueba: ids de finales unicos, un solo `default`, `next`
  existente, `turns.target` entre 3 y 40.

Archivos: `packages/content/src/session.ts`, `pack.ts` y sus tests;
`packages/narrative/src/context.ts`, `model-gm.ts`, `pacing.ts`;
`apps/engine/src/resolve.ts`; API: migracion (`finished_at`, `objective` en
`game_sessions`), `TurnService`, `state`; clientes: objetivo a la vista y
estado "Terminada".

Hecho cuando: tests de contenido del schema; test de motor con un pack de
fixture de dos capitulos (final fijo en el 1, dos ramas en el 2) que recorre
ambas ramas; test de API de `finished_at`.

## H5. One-shot "Ya descubrí mi pasión: ¡QUIERO SER MÉDICO!"

Mundo original de Gabino, en el repo publico: `content/packs/quiero-ser-medico/`
(`provenance.class: original`). Un jugador. Tres capitulos cortos, uno por
sesion. Es la demostracion de H1, H2 y H4, y la prueba de aceptacion del plan.

Ficha (`catalog`): formato `one-shot`, jugadores 1 a 1, sesion `corta`,
estilo `historia`, generos drama, venganza y comedia, avisos de contenido
(alcohol, violencia, muerte, carcel). **La sinopsis no revela el regreso en
el tiempo.**

Sistema: `court-intrigue` no aplica y `fantasy-d20-lite` trae vida y ataques
que sobran. Revisar `packages/rules/src/ruleset.ts`; si ningun ruleset sirve
sin ruido, crear `drama-lite` (solo tiradas d20 de habilidad, sin combate) en
`packages/rules/src/` y registrarlo en `registry.ts`.

Nombres (propuestos; Gabino los cambia si quiere): protagonista Emiliano,
mama Lucia, papa Rogelio, la chica Mariana, la casera doña Chelo. Farmacia
parodiada: "Farmacias Parecidas" (solo nombre, sin mascota ni logo).
Universidades y escuelas con su nombre real.

| Capitulo | Turnos | Gancho | Objetivo visible | Desenlace |
|---|---|---|---|---|
| 1. El drama | 6 | Vispera del examen de la UNAM: llaman, tu padre choco borracho | "Llegar mañana a tu examen de la UNAM" | Fijo: por salvarlo acabas detenido, pierdes el examen de la UNAM, sales justo para el del IPN y entras a Comunicaciones y Electronica en ESIME Zacatenco (piden 50 de 140) |
| 2. La revelacion | 7 | Tu cumpleaños 33 se acerca y nada salio bien | "Que este año sea distinto" | Fijo: tu padre confiesa que provoco el accidente y te culpo a proposito; explotas, caes del octavo piso, todo se pone blanco y despiertas el dia del accidente |
| 3. La venganza | 8 | Suena el telefono: es la misma llamada | "No repetir tu vida" | Dos ramas (abajo) |

Notas de autor para `beats` (capa del GM):

- Cap. 1: si el jugador se niega a ir, el mundo lo arrastra con causas
  creibles (la mama suplica, el coche esta a su nombre, la patrulla llega a
  la casa). El examen de la UAM fue en marzo y no quedo; el de la UNAM es al
  dia siguiente; el del IPN, despues. Fechas como las dio Gabino.
- Cap. 2: escenas rapidas de una vida mediocre (trabajo que odia, Mariana se
  casa con un medico, metro y camion, la casera que no deja hacer ruido).
  Cualquier intento de mejorar (empleo, pareja, seducir a la casera) fracasa
  con gracia, sin crueldad gratuita. La caida se narra como la conto Gabino:
  vidrios, el cuello, las manos en la cara, la sangre en los pulmones, blanco.
- Cap. 3, finales:
  - `se-repite` (`when`: decide ir a salvar a su padre, de la forma que sea;
    aunque esquive las trampas de antes hay trampas nuevas). Se dispara desde
    el turno 2 y cierra rapido. Tarjeta: "La historia se repite… pero esta
    vez no hay otra oportunidad. FIN." `final`.
  - `medico` (`when`: sostiene el no hasta el final; todo lo presiona tres
    veces, cada vez mas fuerte, y nadie puede obligarlo; necesita dar excusas
    que convenzan). `default`. Epilogo corto: lo mal que la paso en Medicina,
    casi lo expulsan, se titula, lo contrata Farmacias Parecidas (no es el
    director, atiende el consultorio) y se queda con Mariana. Tarjeta: "FIN".
    `final`.

Arte: portada y retrato del protagonista los decide Gabino; mientras, sin
portada propia. `artStyle` propuesto para las ilustraciones: Ciudad de Mexico
contemporanea, semirrealista; a confirmar con el.

Hecho cuando: `pnpm validate` en verde; partida completa en local por las dos
ramas con el modelo real (tres pantallas de fin, cada capitulo dentro de su
presupuesto); Gabino la juega antes de publicarla en el catalogo.

## H6. Estrellas y reseñas

- Tabla nueva `story_ratings` (API): `user_id`, `pack_id`, `pack_version`,
  `table_id`, `session_code`, `stars` (1 a 5), `review` (texto opcional, hasta
  1000), fechas. Una valoracion por usuario y mundo, editable.
- `POST /api/v1/tables/{table}/rating {stars, review?}` (miembro de la mesa).
- La pantalla de fin (H1) muestra siempre el mensaje de Gabino con las cinco
  estrellas y el cuadro de reseña; guarda al tocar.
- Catalogo: promedio bayesiano (decidido antes) y numero de valoraciones en
  `CatalogService` y en la tarjeta y el detalle del mundo. Solo mundos
  publicados; las de mundos privados se guardan y no se muestran.
- v1: las estrellas son publicas en agregado; el texto de las reseñas lo ven
  el autor del mundo y el panel de administracion. Publicarlas pide
  moderacion y denuncia (regla de contenido de usuarios de Google Play):
  queda para despues del lanzamiento.

Hecho cuando: test de API (crear, editar, promedio, privado no se lista);
estrellas en la pantalla de fin en web y app; promedio en Explorar.

## H7. Lo privado: susurros y objetivo personal

Hoy no existe de punta a punta. Piezas:

1. **Contrato**: los bloques `narration` y `dialogue` ganan `to?: string[]`
   (ids de personaje; ausente = toda la mesa). `packages/engine-contract`.
2. **Linea del modelo**: `{"kind":"whisper","characterId":"byakuren","text":"..."}`.
   Un susurro por personaje y turno, hasta 60 palabras. El motor emite el
   bloque con `to` y el evento `narration` con
   `visibility: { layer: 'player', witnesses: ['character:<id>'] }`
   (`model-gm.ts`, donde hoy se fuerza la party completa: lineas 383, 844,
   877 y 988-1088). `secret_revealed` acepta un subconjunto de testigos.
3. **Prompt**: seccion "Susurros" en `prompt.ts`: usalo para lo que solo ese
   personaje percibe, recuerda o sabe (su meta, un secreto suyo, el resultado
   de su tirada de percepcion). Nunca para informacion que la mesa necesita
   para avanzar.
4. **Lint** (`lint.ts`): para un susurro, la vista de conocimiento se arma
   solo con los destinatarios, y `markRevealed` marca solo a ellos.
5. **Objetivo personal garantizado** (no depende del modelo): al abrir la
   sesion el motor emite a cada jugador un bloque con `to`: "Solo tú: tu meta
   es …" con `Character.goal`, mas `Character.private?.knows[]` si el mundo
   lo trae (campo opcional nuevo en `packages/content/src/character.ts`). Es
   el "por que existe cada jugador".
6. **API**: `TurnService::blocksPage` recibe el personaje de quien mira y
   omite los bloques con `to` que no lo incluyan. **El anfitrion tampoco ve
   los susurros ajenos** (tambien juega). Cronica, voz y video los excluyen
   (`ChronicleController`, `SpeechService`, `SessionVideoService`).
7. **Deuda que hay que cerrar antes** (ROADMAP, linea 453; detalle en
   `rpg-ngn-api/docs/vam-2026-09-19.md`, S14 y E1): `appendLog` del reductor
   no consulta `visibility`, y `worldProjection` entrega el estado completo
   de todos los personajes (las pistas `clue` de cada uno incluidas). Las
   pistas y el `custom` de un personaje solo los ve su jugador.
8. **Clientes**: `blocksForSeat` (`ui-logic/src/views.ts`) filtra por
   defensa; el susurro se pinta distinto ("Solo para ti"), en web y app. En
   modo pantalla (pantalla compartida) los susurros no se muestran ni se
   leen en voz alta.

Hecho cuando: test de API con tres miembros (el destinatario ve el susurro;
otro jugador y el anfitrion no; la cronica no lo trae); test de motor del
lint con destinatarios; test de proyecciones (las pistas de otro no llegan);
partida local de la boticaria con tres cuentas donde cada una recibe su meta
en privado. Al cerrar, AAB v25.

## H8. Formatos en la mesa y en Explorar

Datos del mundo (`catalog` en `packages/content/src/pack.ts` y su espejo en
`engine-contract/src/index.ts:359`), con vocabularios controlados en un
archivo nuevo `packages/content/src/taxonomy.ts` y etiquetas es/en en
`packages/i18n` (namespace `taxonomy`):

| Dimension | Valores | Notas |
|---|---|---|
| `format` | one-shot, aventura, campaña | ya existe |
| jugadores | solo, grupo | se deriva de `players` (max 1 = solo; min 2 = grupo; si no, ambos) |
| `sessionLength` | corta, media, larga | nuevo; lo recomendado por el mundo, la mesa puede cambiarlo si no hay `arc` |
| `genres` | misterio, policiaca, terror, romance, drama, comedia, fantasia, ciencia-ficcion, intriga, aventura, venganza, historico | nuevo, de 1 a 3; `genre` (texto libre) se conserva como etiqueta |
| `style` | historia (te la cuentan desde el protagonista), mision (objetivo abierto), libre | nuevo |
| `contentWarnings` | texto corto | nuevo, opcional |

- El motor expone los vocabularios en `GET /v1/vocabularies` (`apps/engine`).
- Mesa: al crearla se elige el largo de sesion ("Sesiones cortas, 30 a 40
  min", "medias, 1 h", "largas, 2 h", "libres"), en
  `apps/web/src/app/mesas/nueva/page.tsx` y `NewTableScreen.tsx`. Asi sale
  "Los Nueve Viajeros con 3 personas, en campaña, con sesiones cortas".
- Explorar: filtros nuevos en `CatalogController` y `CatalogService::matches`
  (`format`, `mode`, `style`, `genres` con O entre generos, `sessionLength`).
  Web (`mundos/explorar/page.tsx`): dos entradas arriba, "Para ti" y "Para tu
  grupo", y fichas de formato y genero. App (`ExploreScreen.tsx`) a la par.
  La tarjeta dice "One-shot · 1 jugador · 30 min".
- Completar la ficha de piloto, mascarada y boticaria (repo privado
  `~/dev/rpg-packs/boticaria`).

Hecho cuando: tests de schema y de `CatalogService`; filtros en web y app a
390 px.

## H9. Catalogo sobre atomo/taxonomy

Cuando el agente de Atomo avise con la etiqueta:

1. `git -C platform fetch`, `node platform/scripts/changes.mjs since 69f8130 --to <tag>`,
   leer los `major` y sus pasos, y subir el submodule (hoy v0.2.0).
2. `composer require atomo/taxonomy`; vocabularios en la config de la API,
   generados desde `GET /v1/vocabularies` del motor; `taxonomy:sync`.
3. `CatalogWorld` usa `HasTerms`. El comando que sincroniza el catalogo
   etiqueta cada mundo desde su `catalog`. La fuente de verdad sigue siendo el
   pack; Atomo es el indice.
4. `CatalogService` filtra con los scopes del trait y toma etiquetas y
   conteos del lector de Atomo ("Misterio (4)").

No bloquea nada anterior: H8 funciona con los vocabularios del pack.

## Despues (anotar en el ROADMAP, fuera de este plan)

- One-shots como misiones del camino de temporada.
- Limite de tiempo por respuesta en sesiones cortas (hoy el turno espera al
  mas lento: 4 a 6 minutos).
- Reseñas publicas con moderacion.
- Mas one-shots de un jugador por genero (misterio, terror, romance,
  policiaca tipo Sherlock Holmes).
- Variante femenina del protagonista de "¡Quiero ser médico!".

## Verificacion de punta a punta

1. `pnpm check` y `vendor/bin/phpunit` completos, en cada bloque.
2. La medicion que destapo el problema, repetida tras H1 a H3 sobre una
   sesion corta de prueba (misma consulta SQL del 04-10 sobre `turns`,
   `turn_blocks` y `scene_images`). Metas:

   | Metrica | 03-10 | Meta |
   |---|---|---|
   | Palabras del director por turno (mediana) | 350 | hasta 200 |
   | Turnos hasta un cierre | sin cierre en 12 | 8, y nunca mas de 14 con extensiones |
   | Logros por sesion corta | 0 | 2 o mas |
   | Ilustraciones por sesion corta | 1 | 4 o mas |
   | Jugadores que ven la pantalla de fin | 0 | todos |

3. A/B de apertura entregado a Gabino (H2).
4. "¡Quiero ser médico!" jugado completo por las dos ramas (H5).
5. Boticaria con tres cuentas: cada una recibe su meta en privado y nadie ve
   la ajena (H7).
6. Compuerta: Gabino juega una sesion corta con sus amigos antes de dar el
   bloque por bueno. Si vuelve a aburrir, se revisa el reloj antes de seguir.

## Anexo A. Pedido al agente de AtomoPlatform

Enviar tal cual (primera linea es el resumen):

> Pedido de Gabino desde rpg-ngn: endurecer atomo/taxonomy (hoy en
> Incubacion) para que rpg-ngn-api clasifique mundos por categorias; avisar a
> la sesion de rpg-ngn cuando este etiquetado.
>
> Contexto: rpg-ngn va a clasificar los mundos del catalogo (modelo
> CatalogWorld, tabla catalog_worlds, Postgres 16, Laravel 12, PHP 8.3) en
> varias dimensiones a la vez: formato (one-shot, aventura, campaña),
> jugadores (solo, grupo), duracion de sesion (corta, media, larga), genero,
> tono y estilo narrativo. La fuente de verdad son slugs en el pack.json de
> cada mundo; un comando nuestro etiqueta el CatalogWorld. Atomo aporta el
> indice, los filtros y las etiquetas traducidas. Tiene que quedar agnostico:
> la tienda y editorial lo usaran igual.
>
> Lo que se necesita, todo aditivo (minor, sin romper):
>
> 1. Trait HasTerms para modelos consumidores (morphToMany sobre taggables):
>    terms(), termsIn('vocab'), syncTerms('vocab', ['a','b']), attachTerm,
>    detachTerm. Scopes whereHasTerm(vocab, slug) y whereHasAnyTerm(vocab,
>    [slugs]): varios terminos del mismo vocabulario = O; vocabularios
>    distintos encadenados = Y.
> 2. Respetar allow_multiple al etiquetar: en un vocabulario de valor unico,
>    syncTerms reemplaza y mas de un termino es error de validacion.
> 3. Vocabularios declarados por la app en config
>    (atomo-taxonomy.vocabularies: slug, name, is_hierarchical,
>    allow_multiple y terms con slug, name, translations, order, metadata,
>    children) y comando idempotente taxonomy:sync (upsert por slug; no borra
>    terminos en uso; --prune los deja is_active=false).
> 4. Terminos y vocabularios traducibles: columna json translations aditiva
>    ({"en": {"name": "Mystery"}}) y Term::label($locale) con caida a name;
>    expuesto en el schema JSON:API.
> 5. Slug autogenerado si no viene; path y depth mantenidos solos (observer)
>    al crear o mover un termino.
> 6. Lectura para catalogos publicos sin las rutas con auth: un servicio PHP
>    (por ejemplo TaxonomyReader::vocabulary('genre', $locale)) con los
>    terminos activos en orden, su etiqueta y, opcional, el conteo de uso
>    para un taggable_type dado.
> 7. Pruebas de feature de todo lo anterior con el harness del package, y
>    pasarlo de "Incubacion" a listo en docs/USAR_ATOMO.md con un ejemplo.
>
> El selector de frontend no hace falta; si sale barato un componente de
> fichas de filtro en @atomo/taxonomy-ui, bienvenido, sin bloquear.
>
> rpg-ngn-api sigue en v0.2.0 (69f8130) y no instala atomo/taxonomy. Al
> terminar, avisar con: la etiqueta, la firma final del trait y del lector,
> el nombre de la config y los pasos de "Como actualizar" entre 0.2.0 y esa
> version que le toquen a la API.
