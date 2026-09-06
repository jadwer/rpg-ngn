# Alcance del SaaS

Escrito el 2026-09-05, despues de dos sesiones jugadas del piloto. Este documento
recoge lo que la mesa pidio y las decisiones de producto. Como se construye lo
decide el ADR de stack ([11](11-adr-stack-saas.md)), que manda sobre este en lo
que se contradigan; el contrato de realidad ([06](06-reality-contract.md)) manda
sobre ambos.

## Que valido el piloto

Dos sesiones con tres jugadores distintos dieron datos que no teniamos:

1. **Una sola pantalla pierde la atencion.** El DM narra en un dispositivo y la
   mesa se dispersa. Cada jugador necesita su propia superficie.
2. **Las fichas se consultan constantemente**, y salir de la narracion para verlas
   rompe el hilo.
3. **Las capacidades tienen que estar declaradas.** Un jugador pregunto "que puedo
   hacer" y el DM improviso. Ya resuelto en el pack v0.2 (`attacks`, `abilities`).
4. **El log de eventos se escribe solo si es barato.** A mano durante la partida
   funciono para `roll` y `discovery`; mas tipos hubieran matado el ritmo.

## Modo de juego objetivo

**Mesa presencial, un dispositivo por jugador.** Todos en el mismo cuarto, cada
quien con su telefono, el DM (humano o IA) en su propia sesion.

Consecuencia de diseno: no hace falta sincronia en tiempo real dura. Un polling
corto o SSE alcanza; los jugadores se hablan en voz alta, que es el canal de
latencia cero. El modo remoto es una extension posterior, no un requisito.

## Superficie del jugador

### Lectura

Dos vistas sobre el mismo turno, alternables:

- **Narrativa**: el texto sobre un fondo definido por el pack (pergamino por
  defecto; el pack declara su tema). Es la vista por defecto.
- **Dialogo**: intervenciones con retrato a un lado, estilo RPG clasico. Cada
  linea lleva el `portrait` de su hablante, sea PJ o NPC.

No son dos pantallas: son dos formas de pintar el mismo array de bloques. Un turno
del DM produce bloques tipados (`narration`, `dialogue`, `roll`, `system`) y cada
vista decide como renderiza cada tipo. En la vista narrativa los dialogos aparecen
intercalados encima del cuadro de respuesta; en la vista dialogo, la narracion se
comprime.

Requisito derivado: los NPC necesitan `portrait` igual que los personajes. Hoy solo
lo tienen los PJ. Va al schema de `npcs/*.json`.

### Fichas

Menu lateral con las fichas de toda la party. Se abren como modal sobre la
narracion, sin navegar fuera. La propia y las ajenas (la mesa comparte informacion
mecanica constantemente).

Lo que se ve de un PJ ajeno: ficha completa. Lo que NO se ve: su conocimiento
privado. `PlayerKnowledge` es por personaje ([08](08-event-model.md)) y esa
separacion no se rompe por conveniencia de UI.

### Respuesta y cierre de turno

El turno del DM marca a quien interpela directamente. Reglas:

- Todo jugador puede escribir siempre, tenga pregunta directa o no.
- Un jugador puede describir **acciones conjuntas** con otros. Se registran como un
  `player_action` con varios `actors` y se resuelven juntas.
- El turno se cierra cuando **todos los interpelados directamente** han respondido.
  "No hago nada" es una respuesta valida y explicita.
- **Envio automatico** al completarse. Ademas, **cualquier jugador puede forzar el
  envio** una vez estan todas las obligatorias, para el caso del que se distrajo o
  del que quiere anadir algo antes de que salga.
- Mientras el turno esta abierto, cada quien ve quien ya respondio (no que
  respondio). Presion social suave, sin filtrar intenciones.

Esto ultimo importa: ver la respuesta ajena antes de enviar la propia convierte la
mesa en un comite. Se ve el estado, no el contenido.

### Narracion por voz

TTS del dispositivo (Expo Speech en la app, Web Speech API en web). Verificado
contra la documentacion de Expo: es gratis y sin clave, porque no es un servicio
sino un envoltorio sobre el TTS del sistema operativo. Permite `pitch`, `rate`,
`volume`, seleccion de voz via `getAvailableVoicesAsync()` y un flag de calidad
`Default` / `Enhanced`.

Tres limitaciones que condicionan el diseno:

- **Longitud maxima por llamada** (`Speech.maxSpeechInputLength`): ilimitada en iOS,
  con tope en Android y web. La narracion de un turno se pasa facil. Se resuelve
  leyendo bloque a bloque, que ademas da pausas naturales.
- **Pause/resume no existe en Android** (solo iOS y web). Con narracion por bloques
  el problema desaparece: se para y se reanuda desde el bloque siguiente.
- **Offline en Android depende de la voz instalada.** Las voces se dividen en
  embebidas (descargadas) y de red. Sin la voz espanola descargada y sin datos, no
  suena. Es detectable con `getAvailableVoicesAsync()`: avisar una vez al usuario
  que descargue la voz para jugar sin conexion.

Las voces neurales de calidad (servicio externo, con coste por caracter) quedan
reservadas para la version de pago. Es de las pocas funciones donde el usuario
literalmente oye lo que paga.

En mesa presencial suena en un solo dispositivo (ver Voz, mas abajo).

## Arquitectura

La version original de esta seccion (2026-09-05, madrugada) proponia un
`apps/server` sin tecnologia y un `packages/ui` generico, derivados del prototipo
del piloto y no de lo acordado en `CLAUDE.md`. Quedo sustituida por el ADR de
stack ([11](11-adr-stack-saas.md)): plataforma Laravel sobre el core de
AtomoPlatform en un repo privado aparte, motor TypeScript corriendo una sola vez
en `apps/engine`, PostgreSQL como event store, Next.js y Expo como clientes.

Lo que se conserva de aqui porque no cambia con el stack:

- **Contenido canonico** en Git (`content/packs/`), versionado y revisable.
- **Estado de campaña** como log append-only ([08](08-event-model.md)); en el
  SaaS vive en la base de datos de la plataforma, no en Git. Cada mesa es una
  campaña con su log. El contenido puede ser publico o privado del usuario.
- **Secretos del DM** fuera del repo publico (`dm/`, o capa `dm` del event store).
- **Ramas**: `main` sirve GitHub Pages, `legacy` es la campaña de Valdoria en
  curso, `dev` es el SaaS y no toca `content/packs/pilot` salvo para migrarlo.

## Proveedor de LLM: configurable desde el dia uno

Es el mayor riesgo economico del prototipo. La decision: **el proveedor es
configurable y esa configuracion es obligatoria antes de jugar**, no un ajuste
escondido. Tres vias, y el usuario elige la suya al crear la mesa.

### BYOK (trae tu clave o tu modelo)

El usuario configura su propio proveedor. Cubre dos casos que hoy son comunes:

- **Local**: Ollama, LM Studio o similar corriendo en su maquina. Coste cero para
  el usuario y para nosotros. La app apunta a un endpoint de su red.
- **Servicio propio**: su clave de Anthropic, OpenAI, DeepSeek o quien sea.

Requisito de producto, no de codigo: **tutoriales**. Configurar Ollama con un
modelo decente no es dificil, pero si nadie lo explica, no se usa. Un tutorial por
proveedor, con el modelo recomendado y como apuntar la app.

Consecuencia tecnica: el contrato de `DMProvider` ([02](02-architecture.md)) es el
mismo para ambos casos, pero donde corre el adapter no era una decision tomada
(hallazgo BA3 de [10](10-audit-2026-09-05.md)). Lo resuelve [11](11-adr-stack-saas.md),
D6: nube con la clave custodiada en el servidor; modelo local a traves de un relay
que corre junto a Ollama, con probe de capacidad al configurarlo.

### Pago por sesion (mesas constantes)

Para la mesa que juega cada semana y no quiere administrar claves. Se cobra por
sesion jugada, no por suscripcion: una mesa que juega una vez al mes no paga como
una que juega semanal.

Pendiente de calcular: el coste real por sesion. Los datos que ya tenemos de las
dos sesiones del piloto (turnos, longitud de contexto, tamano de respuesta) sirven
para estimarlo antes de fijar precio.

### Sesiones gratuitas para One Shot

Una mesa marcada como **One Shot** (partida unica, sin continuidad) consume del cupo
gratuito. Objetivo: que alguien pruebe el producto sin configurar nada ni pagar.

Viabilidad, y aqui hay que ser honesto: **depende de que el proveedor lo permita en
sus terminos**. Revender o intermediar un tier gratuito ajeno suele estar prohibido
explicitamente. Lo que si es viable y es lo que hay que disenar:

- Un cupo gratuito **nuestro**, financiado por nosotros como coste de adquisicion,
  con limite duro por usuario registrado (por ejemplo, una One Shot de N turnos).
- Modelo barato para ese cupo (Haiku o equivalente), no el modelo caro. La
  diferencia de calidad narrativa existe, y es un argumento de venta honesto para
  pasar a pago.
- Limite por turnos, no por tiempo. Es lo unico que correlaciona con el coste.

Antes de prometer "gratis" en la UI hay que leer los terminos del proveedor que se
use para financiar ese cupo. No es una decision tecnica.

### Coste del turno lento (nota tecnica)

Esperar a que la mesa responda **no consume tokens**: nadie llama al modelo con el
turno abierto. Pero el prompt caching tiene TTL (5 minutos por defecto, 1 hora en la
variante extendida). Si un turno tarda mas que el TTL, el siguiente reprocesa el
contexto entero a precio completo.

No justifica un timeout automatico (ver abajo), pero si dos cosas: usar el TTL
extendido en mesas activas, y avisar en la UI cuando un turno lleva mucho abierto.

## Timeout de turno: no hay

Decidido: **sin timeout automatico**. Estan jugando entre humanos en la misma sala;
si alguien tarda, la mesa decide si espera o si usa el envio manual que cualquiera
puede disparar.

La unica consecuencia es la del caché descrita arriba, y se resuelve avisando, no
cortando.

## Packs de usuario

Los usuarios pueden crear y subir packs. El modelo es de intermediario con retirada
a solicitud, y depende de cuatro condiciones que hay que sostener:

1. **No lucramos con el contenido subido.** Se cobra por funciones de la app, nunca
   por distribuir packs de terceros ni con comision sobre ellos.
2. **Los packs no entran al repo.** Viven como archivo instalable, no como parte de
   nuestro codigo versionado. Distribuir desde nuestro Git nos convierte en editor.
3. **Retirada a solicitud del titular** de la propiedad intelectual, con un
   procedimiento publico y un contacto designado para recibir esas solicitudes.
4. **El usuario declara tener derecho** a subir lo que sube, al aceptar los
   terminos.

Nuestros propios packs son originales y van marcados como oficiales, para que el
usuario distinga lo nuestro de lo subido por otros.

### Formato

Un pack es una carpeta con la estructura de [05](05-content-pack-spec.md)
empaquetada: `pack.json` en la raiz mas sus colecciones. Extension propia
(`.rpgpack`) sobre un zip.

**Limite de peso** en la subida. Un pack con nueve retratos como el piloto pesa
poco; uno con arte para cincuenta NPCs, no. Para contenido pesado, el autor pone en
la descripcion un enlace externo a su version completa.

### Descargas externas

Cuando un usuario sigue un enlace de descarga puesto por otro usuario, la app avisa
de forma explicita: **esta saliendo de nuestros servidores, la descarga es bajo su
propio riesgo, se recomienda analizarla con antivirus**. El aviso es interstitial y
no se puede saltar la primera vez.

Esto no es formalismo: un `.rpgpack` es un zip, y un zip de origen desconocido es un
vector. Ademas hay que validar la estructura al instalar y rechazar rutas fuera del
directorio del pack (zip slip).

## Auth: la mesa es un contrato, no una sesion

El acceso se liga a **amistad**, no a codigos publicos. Un jugador pertenece a una
mesa de forma persistente; entrar y salir de la app no cambia su pertenencia.

Esto resuelve solo el problema de la reconexion: el jugador que cierra la app no
pierde nada porque su sitio no dependia de estar conectado. Y descarta las mesas
publicas, que en la practica son imposibles de sostener con continuidad narrativa.

## Voz: bandera de narrador

El TTS es del dispositivo, asi que cada quien oye la voz de su telefono. Eso no es
un problema: cada quien oye la suya.

Lo que si hace falta es que la mesa sepa si alguien esta narrando en voz alta:

- Nadie con narracion activa: aviso visible de que no hay narrador.
- Alguien la activa: el aviso desaparece.
- Cualquiera puede descartar el aviso (mesa que juega leyendo, sin voz), y no
  vuelve a aparecer hasta que alguien lo restaure.

Es un indicador de estado compartido, no sincronia de audio.

## Fortuna abierta

El jugador tira su Fortuna, ve el numero y la tabla de rangos esta publicada. Es
informacion de jugador, no de personaje.

Lo secreto es el **efecto**, nunca el tier. El jugador sabe que le toco mala suerte
y descubre jugando como se manifiesta.

Razon, y viene de la mesa: en la sesion 002, Narivyl volco un farol y quemo el
unico registro del pueblo con un 1 natural. Que la mesa viera el numero hizo el
momento mejor, no peor. Un modificador secreto del que el jugador no percibe nada
es un modificador que igual podria no existir.

Consecuencia tecnica: los eventos `roll` de tipo fortuna no llevan
`visibility.layer: "dm"`. La proyeccion de conocimiento del jugador incluye su
propio tier.

Esto cierra el hallazgo IL6 de [10](10-audit-2026-09-05.md), donde el diseno estaba
a medias: el evento se registraba como secreto mientras el jugador veia el dado y
la tabla estaba publicada en el visor.

## Lo que sigue sin definir

1. **Coste real por sesion.** Calculable con los datos de las dos sesiones
   jugadas. Bloquea fijar el precio del pago por sesion.
2. **Donde viven los packs subidos.** Almacenamiento del dispositivo, bucket
   propio o un tercero. Cambia el coste de infraestructura.
3. **Terminos del proveedor** que financie el cupo gratuito de One Shot.
4. **Modo DM humano (v2).** Arrastra narracion por microfono y analisis de
   respuestas de texto, que son piezas del modo remoto: los dos van juntos.

## Orden

V1 es con **DM IA**. El DM humano es v2, junto con el modo remoto.

El orden de construccion vive en el [ROADMAP](../ROADMAP.md), derivado de
[11](11-adr-stack-saas.md). Dos correcciones respecto a la version anterior de
esta seccion: la app movil offline no puede ser "solo lectura de narrativa"
porque el log del piloto no tiene ningun evento `narration` (la narrativa esta en
los `recap` de las sesiones), y "BYOK primero porque no necesita facturacion"
deja de aplicar cuando la plataforma ya trae el cobro. La app offline sigue
siendo la entrega que se puede probar en la siguiente sesion presencial, y corre
en paralelo con la plataforma.

## Aviso

Nada de lo escrito aqui sobre responsabilidad por contenido de terceros es
asesoria legal. El modelo de intermediario con retirada a solicitud es el estandar
de la industria, pero los requisitos concretos (procedimiento de retirada, contacto
designado, plazos) varian por jurisdiccion. Cuando el producto genere ingresos,
conviene una revision con alguien de propiedad intelectual.
