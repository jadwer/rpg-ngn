# 27. Correccion del motor tras leer las mesas 43 y 44 (05-10)

Implementado el 05-10 por Fable, con pruebas y una validacion adversarial
(VAM) de dos rondas. Sale de leer completas la mesa 43 (boticaria, 03-10,
tres jugadores) y la mesa 44 (QUIERO SER MEDICO, 05-10, un jugador), de
cruzarlas con el mundo y de auditar el interprete, el reductor y el camino de
la API. La primera parte es lo que se encontro; la segunda, lo que se hizo y
como quedo probado; la tercera, lo que queda abierto.

En la tabla, "reproducido" es que se reprodujo en local con un transporte
falso, sin modelo; "en datos", que se ve en la base de produccion.

## Lo que encontro la auditoria

### Fallos del motor (codigo)

| # | Fallo | Evidencia | Estado |
|---|---|---|---|
| F1 | Lo que el jugador escribe junto al dado no llega al director. `turnLayer` manda "tiro 1d20: 12" y hace `continue` (`packages/narrative/src/context.ts:442`). El prompt le promete ese texto al director y la pantalla invita a escribirlo. | 6 mensajes perdidos: 4 en la mesa 43, 2 en la 44 ("le digo que mañana tengo examen, que me haga paro"). | Reproducido |
| F2 | Una llave de menos en una linea del modelo se traga el resto del turno. El interprete la trata como objeto de varias lineas y le pega todo lo que sigue (`model-gm.ts:675`). El aviso enseña la ultima linea, no la rota. | Mesa 44, sesion 003, turno 5: una frase, aviso con `addressed`, sin ideas. | Reproducido (la salida real del modelo no se guarda) |
| F3 | `relationship` y `condition` sobre un NPC no hacen nada. El reductor exige que el NPC ya exista en `world.npcs` y nadie lo crea (`packages/campaign/src/reduce.ts:266` y `:290`); `ensureNpc` existe y no se usa. El arreglo del 05-10 quito el aviso, no el fallo. | Mesa 44: evento 113 (`relationship` de Lucia) registrado y `world.npcs` sigue vacio. | En datos |
| F4 | Aunque F3 se arregle, el director nunca vuelve a ver la actitud ni la condicion de un NPC: `worldLayer` solo imprime descripcion y objetivos. Es estado que se escribe y no se lee. | `context.ts:162-169` | Lectura de codigo |
| F5 | Dar o quitar un objeto tumba el turno en los tres sistemas sin combate. Sus prompts ofrecen `inventory_change` (la rosa de la Mascarada, la carta lacrada de la corte) y sus rulesets lanzan `UnknownEffectError` con `gain` y `lose`. El turno entero se repite (doble costo y doble espera). | Mesa 42, turno 139: "el ruleset court-intrigue no conoce el effect gain". | Reproducido en court-intrigue, drama-lite y masquerade |
| F6 | El motor acepta dialogos del director firmados por un personaje jugador. Es la regla 2 del contrato de realidad y nada la hace cumplir (`model-gm.ts:940`). | Mesa 44: "¿Que quieres en realidad, papa?" como Emiliano. Mesa 43: Byakuren con pasado inventado. | En datos |
| F7 | Las ideas filtran secretos. Salen de la misma llamada que tiene la capa del GM delante; el lint solo busca frases exactas y un nombre no presenciado es advertencia, no corte. "Otras ideas" usa el mismo contexto completo. | Mesa 43, turno 10: "Pregunto directamente por Suirei, la dama de manos de boticaria" (copiado del secreto, antes de que nadie la nombrara) y "el dia en que murio la consorte menor hace tres años" (el movil). | En datos |
| F8 | Sin garantia de ideas: si el director no las escribe, o se pierden por F2, nadie las repone. Ademas el prompt prohibe ideas en turno de dado y el motor dice conservarlas. | Mesa 44: ultimo turno del capitulo 2 y turno 6 del capitulo 3. | En datos |
| F9 | El aviso al anfitrion miente: "la narracion que leyo la mesa no cambia" aunque lo ignorado sea narracion. | Al menos 6 turnos: mesa 39 (87, 95, 101, 115), mesa 43 (143), mesa 44 (172). | En datos |
| F10 | Los avisos tecnicos van dentro de la historia. En partida de uno el anfitrion es el unico jugador y los lee todos, con JSON incluido. | 28 avisos en 116 turnos resueltos (24%). | En datos |
| F11 | No queda rastro para depurar: la salida del modelo no se guarda y ningun evento sabe de que turno salio. | `campaign_events`: 758 filas, 0 con `turn_id`. | En datos |
| F12 | El reparto de puntos de trama va por numero de turno y ordena "avanza hasta el aunque tengas que saltar tiempo" (`pacing.ts:104`). Con 5 puntos en 6 turnos, dudar dos turnos borra una escena. Tambien trata las ramas ("si va", "si no va") como pasos en fila. | Mesa 44, capitulo 1: llegar al choque, ser culpado y subir a la patrulla en un solo turno. Capitulo 3: la patrulla llega aunque el jugador sostenia el no. | Formula verificada turno por turno |
| F13 | En sesiones de 6 turnos casi cada turno empieza tramo, asi que casi cada turno da logro. El logro sale antes del parrafo que lo gana. | "Se planto frente a su padre" en el turno 2 por elegir una idea; "Llego al lugar del choque" antes de la narracion de llegar. | En datos |
| F14 | La imagen del cierre cae al lugar actual si el director no manda `scene`, y en el cierre se le pide no mandar casi nada (`apps/engine/src/illustrate.ts:81`). | El final feliz se ilustro como "La casa de mama, con Emiliano". | En datos |
| F15 | El lugar de inicio de una sesion solo se aplica a quien no tiene lugar (`resolve.ts`, apertura). Tras un salto de tiempo el personaje abre donde termino la sesion anterior. | Capitulo 2: abre con Emiliano en ESIME hasta que el director lo mueve. | Lectura de codigo |
| F16 | El tope de salida es 4,000 tokens y el razonamiento cuenta. | Mesa 43, turno 5: 3,925. Con cuatro jugadores se corta, y un corte hoy pierde ideas y `addressed`. | En datos |

### Fallos de reglas (prompt y diseño)

| # | Fallo | Evidencia |
|---|---|---|
| R-a | Cada tirada cuesta una ronda entera: se declara en un turno y se tira en el siguiente. | Mesa 43: 10 de 32 respuestas (31%) fueron solo soltar el dado, con rondas de 4 a 12 minutos. |
| R-b | Fallar es un callejon. La regla 5 dice "a veces no hay nada" (`prompt.ts:21`). | Mesa 43: fallaron 4 de 9 tiradas y ninguna dio nada. El pase a la morgue que gano el 20 de Byakuren lo uso Ryomen, saco 2 y la pista del cuerpo se perdio para siempre. |
| R-c | Dados de utileria: el director pide tirada para algo que el desenlace inevitable ya decide. | Mesa 44: 12 con Ramirez y 6 en la ventana; nada cambiaba. Cada una costo un turno de 6 o 7. |

### Fallos de la historia y del mundo

Mesa 44 (QUIERO SER MEDICO):

- Capitulo 1: la mama esta en el hospital y contesta Emiliano. Capitulo 3: contesta ella en la cocina, "cansada de un turno de doce horas" y "entra a trabajar en media hora". El mundo dice que Lucia llama desde el hospital; el director lo contradijo con algo que el mismo invento al cerrar el capitulo 2.
- El "Anteriormente" del capitulo 3 lo escribe el modelo y esta mal: "cayo mientras intentaba evitar que lo culparan" y "la ultima vez moriste por ir".
- La casa se vuelve edificio con zaguan; una imagen la pone en la colonia Doctores. El examen es a las siete y hay "sol de mediodia".
- "La venganza" no tiene venganza: Rogelio desaparece en el turno 3 y el coche chocado a nombre de la mama tambien. El jugador sabe que fue a proposito y la historia no le deja usarlo. Es hueco del mundo, no del modelo.
- A los 33 años el susurro privado repite "tu meta es estudiar Medicina en la UNAM". Logro en plural en partida de uno.

Mesa 43 (boticaria):

- La deuda de go es "de anoche, con un funcionario de rentas" y luego "de hace meses, con el escribano".
- El escribano da el origen de la orden de incinerar en el turno 5; en el 8 y 9 el director lo trata como desconocido, pide tirada y lo niega.
- "La orden que quemo el libro de turnos": nadie quemo ningun libro. Dos guardias se funden en uno.
- El secreto de Suirei queda conocido completo por los tres cuando solo Kogen oyo un fragmento.
- Un jugador escribio "nos podra decir algo Kogen" siendo el Kogen: no sabia quien era.

### Por que no se habian encontrado

1. Se depura desde los avisos del motor, y F1, F3, F6 y F7 no generan aviso.
2. Sin salida cruda, cada causa es hipotesis y se parcha la forma vista: el parser lleva parches del 20-09, 25-09, 03-10 y tres del 05-10 para la misma clase de error.
3. Nadie agrega los avisos: el rechazo de `relationship` salia desde el 26-09.
4. Las pruebas miden la tuberia (cierra en 8 turnos, 2 logros), no la historia.
5. Nada comprueba que el motor cumpla lo que el prompt promete. F1, F3 y F5 son eso.

## Decisiones de Gabino (05-10)

1. **Dados**: no se tira en cada turno. Se queda el modo actual con un tope de tiradas pedidas por personaje y sesion, reservadas a lo que decide algo.
2. **Dialogos del GM como jugador**: en el juego se permiten. Lo que el jugador escribio como accion se quita del video, la presentacion y la voz; ahi la historia la cuenta el GM.
3. **Rogelio**: en el final bueno lo encarcelan por declarar en falso, la investigacion destapa que es un estafador y le dan veinte años.
4. De cara al jugador se dice "GM", no "director".

## Lo que cambio de arquitectura

1. **El formato del GM es plano.** `{"kind":"narration","text":"..."}`, `{"kind":"state_change","effects":[...]}`. Es el que el modelo escribia solo cuando "se equivocaba": todos los parches del parser (20-09, 25-09, 03-10, 05-10) fueron por la envoltura anidada `{"kind":"block","block":{...}}`. El formato viejo se sigue aceptando. Una sola funcion (`normalizeRecord`) reduce todas las variantes a bloque, evento o linea de control.
2. **Una linea no daña a otra, y la historia se rescata.** Una linea que empieza un registro corta lo que estuviera pendiente. Una linea a la que le falta el cierre se repara; un parrafo con JSON ilegible se rescata; un salto de linea dentro de un texto no parte el parrafo. Lo que no se puede usar se apunta con su propio texto. Nunca se repara lo que corto el limite de salida, ni se rescata nada privado como publico, ni llega JSON a la mesa.
3. **Las ideas salen de lo que el jugador sabe.** Las pide el engine despues de aplicar el turno, una llamada por personaje con la palabra, al modelo barato, con tope de 15 s y sin reintentos. El contexto (`buildPlayerContext`) no trae secretos, puntos de trama, desenlace, finales ni lo que solo sabe el GM de la ficha. El GM deja de escribirlas. Con modelos locales (perfil compacto) siguen en linea.
4. **Lo tecnico sale de la historia.** Los avisos al anfitrion ya no son bloques del turno. Cada intento de narrar deja en `turn_diagnostics` la salida del modelo tal cual, lo ignorado, lo reparado, lo descartado, los cortes del lint y lo que costaron las ideas. `turns:notices` lo agrega por clase y `tables:review` escribe una mesa entera legible con los conteos que delatan problemas.
5. **Prueba de contrato prompt-motor.** Cada ejemplo de evento de cada prompt tiene que ser aceptado por el interprete, aplicarse sin romper y cambiar el estado, en los cuatro sistemas. Se comprobo por mutacion: reintroducir el fallo de `relationship` la hace fallar.

## Lo que se hizo, por fallo

| Fallo | Correccion | Donde | Prueba |
|---|---|---|---|
| F1 | El texto que sigue a la linea de la tirada va al GM; sin texto, se le dice que no le invente palabras. | `narrative/src/context.ts` (`turnLayer`) | `docs27.test.ts`, F1 |
| F2 | Limites de registro por como empieza la linea, reparacion, rescate y reporte con el texto propio. | `narrative/src/model-gm.ts` (`line`, `recover`, `repairJson`, `salvageStory`) | `docs27.test.ts`, F2 y bloque VAM |
| F3, F4 | `relationship` y `condition` crean al NPC en el estado; el contexto del GM imprime "Ahora: ..." con su actitud, condiciones e inventario. | `campaign/src/reduce.ts`, `context.ts` (`npcNow`) | `docs27.test.ts`, `reduce.test.ts`, contrato |
| F5 | Inventario compartido por todos los rulesets; un evento del GM que lanza al aplicarse se descarta y se apunta. | `rules/src/inventory.ts`, `engine/src/resolve.ts` | contrato, `engine/src/docs27.test.ts` |
| F6 | Decision 2: no se descarta. El bloque de lo que escribio el jugador lleva `declared`; video, presentacion y voz lo quitan. Los turnos viejos se reconocen por el texto de la respuesta. | `model-gm.ts`, `ui-logic/src/presentation.ts`, API `TurnService::isDeclaration`, `SessionVideoService`, `SpeechChronicle` | `presentation.test.ts`, `TurnFlowTest` |
| F7, F8 | Ideas desde la vista del jugador, garantizadas para quien tiene la palabra (tambien en turno de dado); una idea que nombra a alguien no presenciado se descarta. | `context.ts` (`buildPlayerContext`), `model-gm.ts` (`ideasFor`), `resolve.ts` | `docs27.test.ts` bloque I, `engine/src/docs27.test.ts` |
| F9, F10, F11 | Diagnostico por intento fuera de la historia, con salida cruda tambien en los intentos fallidos; eventos ligados a su turno. | contrato `TurnDiagnostics`, API `turn_diagnostics`, `EventStore::append` | `TurnFlowTest` |
| F12 | El reloj ya no ordena saltar tiempo; da el punto actual y el siguiente y prohibe borrar la escena que el jugador abrio. El validador avisa de puntos que no caben o que son ramas. | `narrative/src/pacing.ts`, `content/src/loader.ts` | `docs27.test.ts` |
| F13 | El logro sale al final de lo narrado y solo en el turno en que el reloj lo pide; fuera de eso el motor lo descarta. | `model-gm.ts`, `pacing.ts` (`milestoneDue`) | `docs27.test.ts` |
| F14 | La imagen del cierre es la del autor (`endings[].scene`, `endCard.scene`); si no hay, la del GM; si no, la primera frase de la tarjeta. | `resolve.ts`, `content/src/session.ts` | `engine/src/docs27.test.ts` |
| F15 | Al abrir una sesion con lugar de inicio se coloca ahi a toda la party. | `resolve.ts` | `engine/src/docs27.test.ts` |
| F16 | Tope de salida: 4,000 mas 800 por jugador a partir del segundo. | `model-gm.ts` | `model-gm.test.ts` |
| R-a | Tope de tiradas pedidas: una por personaje cada ocho turnos de presupuesto (sin reloj, una cada seis turnos jugados). El GM lo ve en "Tiradas pedidas". Una peticion de mas no deja a nadie esperando: el personaje conserva la palabra y el GM recibe una nota en su capa para resolver la accion sin dado en el turno siguiente. | `context.ts` (`rollAllowance`, `rollsLayer`), `model-gm.ts`, `prompt.ts` | `docs27.test.ts`, R1 y VAM |
| R-b | La regla 5 del prompt ya no dice "a veces no hay nada": un fallo cuesta algo o destapa otra cosa. Con reloj, ademas: lo que la mesa necesita no depende de un solo dado, y lo que un jugador gano lo aprovecha el. | `prompt.ts`, `pacing.ts` | `docs27.test.ts` |
| R-c | Con desenlace inevitable el reloj le dice al GM que no pida ni use dados para lo que ese desenlace ya decide, en cualquier modo de dados. | `pacing.ts` | `docs27.test.ts` |
| Mundo | `arc.canon` (hechos fijos), `arc.previously` (el "Anteriormente" del autor), `arc.goal` (meta del capitulo, tambien en la ficha que ve el GM y en las ideas). QUIERO SER MEDICO: canon de la noche del examen en los capitulos 1 y 3, capitulo 1 a 8 turnos, puntos del capitulo 3 en fila con un punto de venganza, y el final de Rogelio. | `content/src/session.ts`, `content/packs/quiero-ser-medico` | `docs27.test.ts`, `pnpm validate` |
| Texto | "Director" pasa a "GM" en i18n, API, web y mundos. El susurro de apertura dice "Eres <nombre>" (mesa 43: un jugador no sabia quien era). | `i18n`, `lang/es/game.php` | suites |

## Validacion adversarial (VAM)

Un defensor y dos fiscales independientes, cada ataque con una entrada
reproducible. Cuatro rondas sobre el interprete y tres sobre el contexto y
la API (Gabino pidio dos mas antes de desplegar, 05-10).

Lo que la primera ronda tumbo y se corrigio:

- La reparacion era demasiado pronta: un registro partido en dos lineas perdia campos y el resto llegaba a la mesa como narracion con claves de JSON; un susurro roto podia salir publico pegado al parrafo siguiente; una linea cortada por el limite de salida se daba por buena (un daño de -1 que iba a ser -10).
- Las ideas se pedian con el estado de antes del turno, sin tope de espera (una llamada lenta retenia el turno y lo hacia repetir), y la ficha les decia que rumor era falso.
- Con DeepSeek las ideas seguian saliendo del GM: la condicion miraba `baseUrl` y no el perfil.
- Una tirada de mas se descartaba en silencio y dejaba la accion colgada.
- El canon nuevo del medico se contradecia en el cumpleaños y cerraba el camino de la venganza (salir a denunciar contaba como ir a salvarlo).
- La meta del capitulo solo llegaba al susurro; el GM y las ideas seguian con la de los 18 años.
- El motor aceptaba un logro en cualquier turno; un `relationship` con un personaje en `who` creaba un NPC fantasma; el costo de las ideas se sumaba al del narrador.

Lo que tumbo la segunda ronda, ya sobre lo corregido, y tambien se corrigio:

- Dos registros en una linea con el segundo sin cerrar: el segundo se perdia sin dejar rastro en el diagnostico. Ahora cada objeto de la linea se lee por separado y el resto roto se repara o se apunta.
- Un bloque marcado para alguien con `to` como texto (no como lista), o una narracion con `characterId`, salia publico. Ahora cualquier marca de destinatario lo vuelve susurro o lo descarta.
- El filtro de "esto parece JSON" se comia prosa legitima con una cita y dos puntos. Ahora solo mira restos de estructura y claves del formato.
- Con la salida cortada por el limite se tiraba tambien la linea anterior, a la que solo le faltaba una llave.
- JSON con formato al que le falta una llave: el registro siguiente se perdia. Ahora una llave tras un valor ya cerrado empieza registro.

Tercera y cuarta ronda, sobre lo que el modelo escribe fuera del formato:

- Una linea JSON sin su llave final se tragaba la prosa que venia detras y la
  ponia en boca del NPC. Ahora, dentro de una cadena solo la cierra otro
  registro; fuera de ella la cierra lo que no puede continuar JSON (texto,
  una comilla, un guion, un numero o un corchete al empezar la linea).
- La prosa escrita como dialogo se leia como dialogo con hablantes falsos
  ("Las once: «ya es tarde»"). Solo es dialogo si habla alguien conocido (NPC
  del mundo, personaje, o quien ya hablo) y la cita cierra la linea.
- Las notas del modelo para si mismo llegaban a la mesa ("Nota: el jugador
  eligio X, sigue el final medico", "Objetivo oculto:", "Narrador (para mi):",
  anotaciones con `//` o `<-`). Se descartan y cuentan como historia perdida.
  "Nota el frio en la nuca", "Todo esta en silencio:" o "(La puerta se cierra
  sola.)" siguen siendo historia.
- Una narracion con `characterId` se descartaba y un dialogo con
  `characterId` se publicaba: al reves. Ahora el hablante se publica sin su
  referencia interna y un destinatario escrito como texto vuelve susurro.
- La cola que corto el limite de salida se narraba a medias; se descarta.
- Hablantes en negrita (`**Bren:** "..."`), prosa pegada a un objeto por
  delante o por detras y "[entre corchetes]" como prosa entera.
- Contexto y API (fiscal B): `arc.sheet` aplicaba a toda la party; ahora es
  `arc.sheets` por id de personaje. `withoutClosingQuestion` dejaba "Y si no
  vas." de un dilema de dos ramas y cortaba vocativos con raya ("—Mijo, ¿me
  vas a dejar solo?"): una condicion delante de la pregunta se va con ella y
  un parrafo que abre con raya o comilla no se toca. La nota de una tirada de
  mas solo llega al GM el turno siguiente, no el resto de la sesion.

Riesgos que quedan del interprete, aceptados tras cuatro rondas: un texto que cita
literalmente `","speaker"` se trunca; una narracion cerrada con `")` deja ese
resto en el parrafo; un salto de linea dentro de un texto seguido de una linea
que empieza con `{` corta el parrafo ahi. Son entradas que no se han visto en
produccion; si aparecen, quedan en `turn_diagnostics` con su salida cruda.

## Prueba con el modelo real (05-10, local)

QUIERO SER MEDICO completo con Sonnet (el modelo de las mesas de pago), tres
capitulos, 23 turnos, modo de dados `dice`, ideas elegidas por un guion:

| Dato | Mesa 44 (antes) | Prueba (despues) |
|---|---|---|
| Parrafos perdidos | 1 turno entero (cap. 3, turno 5) | 0 |
| Turnos sin ideas | 2 | 0 |
| Respuestas de solo soltar el dado | 3 de 18 | 0 de 20 |
| Avisos tecnicos dentro de la historia | 7 | 0 |
| Lineas ignoradas | 7 | 3 (un `scene` mal escrito, un secreto inventado, una actitud con delta 0) |
| Intentos repetidos | 0 | 0 |
| Palabras del GM por turno (mediana) | 176 | 206 |
| Capitulo 1: turnos en el lugar del choque | 1 (tres frases) | 4 |
| Final | `medico`, sin Rogelio | `medico`, con Rogelio detenido y la presion de las tres llamadas en orden |

Costo: 177,626 tokens de entrada y 27,288 de salida del narrador, mas 38,793
y 1,285 de las ideas (Haiku): las ideas son alrededor del 5% del costo.

Lo que esa partida destapo y ninguna prueba local podia ver:

- **Sonnet, cuando responde sin razonar, escribia la historia como prosa suelta** (9 de 16 turnos con alguna linea fuera de JSON) y los dialogos como `Lucia (npc:lucia): «...»`. El motor no perdio nada, pero el dialogo llegaba sin hablante y en un turno se colo como narracion una nota del propio modelo sobre que final aplicar. Correccion: el prompt enseña un turno completo de ejemplo y dice que todo va en un objeto; el interprete lee un dialogo en prosa como dialogo y sin la referencia interna. Medido de nuevo con el prompt corregido (dos capitulos, 12 turnos): 4 turnos con prosa en vez de 9 de 16, y en esos solo la narracion va en prosa (los dialogos y todo lo demas, en JSON), que el motor narra igual; cero lineas ignoradas y cero reparadas. Se vuelve a medir en cada cambio de prompt con `turns:notices --raw`.
- Haiku (el modelo del cupo gratuito) respeto el formato pero invento un segundo coche: el canon ahora dice que es el unico coche y que Emiliano va a pie.
- El modelo cerro un texto con `}"` en vez de `"}` y dejo una comilla angular sin abrir: `tidyStory` limpia el final de los textos.
- Doña Chelo, casera del capitulo 2, aparecio en el edificio del capitulo 3: los NPCs del mundo se listan en todas las sesiones. El canon de los capitulos 1 y 3 lo corta; falta poder decir por sesion que NPCs existen.
- Las ideas de Haiku salian a veces en infinitivo o como orden; el encargo ahora pide primera persona en presente, con ejemplos.

## Abierto

| Que | Por que queda | Dueño |
|---|---|---|
| Probar el formato plano y las reglas nuevas con el modelo real en los otros tres sistemas y con tres jugadores | Solo se jugo el medico (drama, un jugador); el tope de tiradas y la separacion de la mesa no se ejercitaron con modelo | Antes de desplegar, o Gabino juega una mesa corta de la boticaria |
| Decir por sesion que NPCs del mundo existen | Hoy se listan todos en todas; se tapa con `canon` | Siguiente sesion |
| Una nota del modelo para si mismo que no empieza con una etiqueta conocida se narra como historia | Se descartan las etiquetadas (Nota, Recordatorio, Objetivo oculto, GM, anotaciones); una nota en prosa limpia no se distingue de narracion | Vigilar en `tables:review`; si se repite, descartar la prosa cuando el turno ya trae lineas JSON de historia |
| Las voces de las cronicas publicadas con audio quedan `stale` al cambiar el texto que se cuenta | El audio viejo lleva las preguntas del GM; se regenera al pedirlo y el video no se arma con el | Regrabar con `speech:chronicle <token>` (primero `--dry-run` por el costo) |
| El GM a veces narra en tercera persona ("Emiliano cierra la guia") en mesa de uno, sobre todo sin razonar | Es del modelo; el prompt ya pide segunda persona | Medir con el prompt nuevo |
| Con modelos locales (perfil compacto) las ideas siguen saliendo del GM, con los secretos delante | Otra llamada por turno son minutos en una M1 | Aceptado; partidas privadas |
| El canon es instruccion: el motor no lo hace cumplir | Haria falta un lector que compare la narracion con el canon | Lector critico, abajo |
| Lector critico en `play-session`: una llamada que lee la sesion entera mas `arc.canon` y lista contradicciones | No se hizo; hoy se lee a mano con `tables:review` | Siguiente sesion |
| Panel del anfitrion con el diagnostico del turno | Hoy solo se lee por comando; el anfitrion ya no ve avisos tecnicos, que es lo que pidio | Si hace falta |
| `reopen()` sigue escribiendo "El relato se ha trabado" con el error tecnico en el detalle para el anfitrion | La mesa tiene que saber que el turno se reabrio | Revisar el texto |
| Medir cuanto de la salida del narrador es razonamiento y probar `effort: low` | Ahora se puede: el consumo de las ideas va aparte | Con `ab-opening`, antes de tocar produccion |
| El piloto, la mascarada y la boticaria no tienen `canon` ni `scene` de cierre | Son campos nuevos y opcionales | Al tocar cada mundo |

## Como se revisa de aqui en adelante

```bash
php artisan turns:notices --since=7 --show=10   # que no pudo usar el motor, por clase
php artisan turns:notices --raw=<turno>          # lo que escribio el modelo en ese turno
php artisan tables:review <mesa>                 # la mesa entera, legible, con sus conteos
```

Antes de dar por bueno un cambio del motor: `turns:notices` sin historia
perdida ni eventos rechazados por forma valida, y una sesion leida de corrido.
