# apps/mobile

Superficie del jugador (docs/09) en Expo, con dos modos que se eligen al abrir la app:

- **Jugar en mesa** (entrega 5): contra `rpg-ngn-api` con `@rpg-ngn/api-client`. Cuenta (entrar, crear, perfil, recuperar contraseña), mesas y amigos, crear mesa con director de juego e invitar, la mesa con polling, respuesta y cierre de turno, mando del anfitrion, fichas con el estado vivo.
- **Leer sin conexion** (entrega 3): el pack piloto y su log viajan dentro de la app, se reducen en el telefono con `@rpg-ngn/campaign` y no hay servidor ni DM.

Las dos comparten las vistas, las fichas en modal, la narracion por voz y la bandera de narrador. Tema oscuro de `apps/sheets` (el mismo de la web) con Cinzel para titulos y Crimson Pro para texto. Los componentes viven aqui, en `src/`; la logica (bloques, vistas, velado, cola de TTS, estado del turno, preparacion de la mesa, tono por hablante, bandera de narrador, presets del DM) esta en `packages/ui-logic`, no importa React y es la misma que usa la web.

Vocabulario: el asiento del dueño se llama `host` en la API y en pantalla es el **anfitrion**. El **DM** es siempre la IA; "El DM esta narrando..." se refiere a ella.

## Que hace en linea

- **Conexion**: URL del servidor (por defecto la IP con la que el telefono llego a Metro mas el puerto 8010, editable y recordada) y login con correo y contraseña. El token de Sanctum va en `expo-secure-store`, nunca en AsyncStorage (docs/11, D8). Al volver a abrir la app entra sola mientras el token viva; un 401 en cualquier pantalla borra la sesion y vuelve al login con aviso. Debajo del boton, "¿Olvidaste tu contraseña?" y "Créala aquí".
- **Crear cuenta** (paridad con `/crear-cuenta`): servidor, nombre, correo, contraseña y confirmacion (8 caracteres minimo). Usa `POST /api/auth/register` de atomo/auth en modo token; con `ATOMO_REQUIRE_EMAIL_VERIFICATION=false` en la API entra directo a las mesas, con `true` vuelve al login con el aviso de verificar el correo.
- **Recuperar contraseña**: pide el correo de recuperacion a `POST /api/auth/forgot-password`; solo llega si el servidor tiene correo configurado, y la pantalla lo dice.
- **Perfil** (tocar el nombre en la cabecera de "Tus mesas"): cambiar el nombre visible (`PATCH /api/v1/profile`) y la contraseña (`PATCH /api/v1/profile/password`, pide la actual). El correo se muestra y no se edita.
- **Mesas**: las mesas donde el usuario es miembro, con su asiento (anfitrion o personaje) y quien mas esta, con retratos. Boton **Crear mesa**. Al pie, **Amigos**: solicitudes recibidas para aceptar (una jugadora nueva no tiene mesa donde hacerlo), buscar por correo y pedir amistad, y la lista de amigos.
- **Crear mesa** (paridad con la web): nombre, personaje del anfitrion con retrato (o sin personaje: solo dirige), director de juego entre los presets configurados en el servidor (por defecto el del servidor y entonces no se guarda nada en la mesa) y premisa opcional (`settings.premise`). La mesa se crea con `createTable` y el personaje con `setOwnerCharacter`; despues aparecen el panel de invitados, el del director de juego (con Probar) y el boton para entrar.
- **Invitar**: la API exige amistad aceptada antes de invitar. El panel muestra quien esta en la mesa, las solicitudes de amistad pendientes (para aceptarlas), un buscador por correo exacto (primero entre los conocidos, luego `GET /api/v1/users/lookup?email=`, abierto a cualquier cuenta), y por cada persona encontrada el paso que toca: pedir amistad, aceptar la suya, o elegir personaje e invitar. Vive en la mesa nueva y en el mando del anfitrion (boton Invitados, en un modal).
- **Director de juego** (boton DM del mando, en un modal; el mismo panel en la mesa recien creada): el proveedor de la mesa entre los presets del servidor (`scripted`, `anthropic`, `openai`, `deepseek`, `ollama`; los sin clave salen apagados), modelo opcional, "Probar" (`POST /api/v1/tables/{t}/dm/probe`, llama al engine sin gastar un turno) y "Guardar" (`settings.provider = {preset, model?}` por `PATCH /api/v1/tables/{t}`, conservando la premisa). Las claves nunca salen del `.env` de la API.
- **Mesa**: polling cada 1.5 s a `GET /api/v1/tables/{id}/state?after=<ultimo bloque>` (docs/11, D5). Cabecera con la mesa y, debajo, sesion, momento del mundo (de la proyeccion `world`), turno y quien falta. Los bloques del DM se acumulan y se pintan con las mismas vistas **narrativa** y **dialogo** del modo offline; los retratos salen del pack empaquetado por `speakerRef`. El `viewer` del estado manda sobre el miembro con el que se entro (por si el anfitrion cambia su personaje). La narracion baja sola al bloque nuevo; si el usuario subio a leer, aparece **Bajar a lo nuevo** en vez de moverle la pantalla.
- **Turno** (docs/09, "Respuesta y cierre"): cuadro de respuesta siempre visible, quien ya respondio y quien falta (nombres, no textos), `Idempotency-Key` estable por turno (reintentar no duplica), boton de cierre cuando no falta ningun interpelado (cualquiera puede cerrar), "Forzar cierre (anfitrion)", y mientras el turno esta en `closing` o `resolving` el pie de la narracion muestra "El DM esta narrando..." con su spinner (un turno con IA tarda de 20 a 35 s; el polling sigue y los bloques llegan solos). Si el turno se reabre, el error del engine.
- **Mando del anfitrion**: abrir la sesion con su codigo de tres digitos (sugiere uno mas que la mayor jugada, o la siguiente planeada del pack) y una nota de sesion que el DM recibe; cerrarla con cliffhanger opcional y confirmacion; ver la premisa; Invitados; DM.
- **Fichas** en modal, como en offline, con el estado vivo: la propia desde `player:<personaje>`, las ajenas desde `world`. Misma regla de velado; un personaje que un miembro de la mesa ha tomado deja de estar velado.
- **Red**: si el servidor no responde, la app lo dice y sigue reintentando; un 409 refresca el estado (el turno cambio por debajo); 403 y 422 muestran el mensaje de la API.

## Voz

- `expo-speech` sobre el TTS del sistema, bloque a bloque. En Android no hay pausa nativa: Pausa detiene y Seguir salta al bloque siguiente (docs/09).
- **Una linea plegable** debajo del selector de vista: Leer (o Pausa, Seguir, Parar durante la lectura) y un resumen de estado ("Leyendo 2 de 5", "Otro teléfono narra", "Nadie narra en voz alta"; lo arma `voiceLineSummary` de ui-logic, el mismo texto que la web). Desplegada: Siguiente, la voz elegida, el idioma de lectura (abre el selector), la velocidad, "Leer lo nuevo desde este telefono" (online), la bandera de narrador y los avisos. Asi la narracion ocupa la pantalla.
- **Idioma de lectura** (arriba del selector de voz): español, ingles, portugues, frances, italiano o aleman. Filtra las voces del telefono y fija el idioma de la locucion; cambiarlo olvida la voz elegida. El DM narra en el idioma de la mesa; esto solo cambia con que voz se lee.
- **Selector de voz**: `Speech.getAvailableVoicesAsync()` filtrado al idioma de lectura. El sistema no dice si una voz es de hombre o de mujer, asi que cada fila tiene **Oir** y se elige de oido; se muestran nombre, idioma y calidad (mejorada o normal). La elegida viaja en `voice` (identificador) a `speak` y se recuerda por telefono en el almacen seguro, junto con la velocidad (0.70x a 1.40x en pasos de 0.05), el tono del narrador (0.85 por defecto, entre 0.70 y 1.10) y el idioma. Sin voz elegida, el sistema usa la suya para el idioma.
- **Tono por hablante** (`pitchFor` en `packages/ui-logic`, compartido con la web): narracion y bloques de sistema con el tono del narrador (mas grave); la party al natural (1.0); cada NPC con un tono fijo entre 0.90 y 1.12 elegido por hash de su `speakerRef`, asi el posadero suena igual en todos los turnos y en todos los dispositivos. Las tiradas llevan el tono de quien tira.
- Si el telefono no tiene voz en el idioma de lectura, aviso una sola vez (se recuerda con Entendido). Para instalar una: Android, Ajustes > Texto a voz > Instalar datos de voz; iOS, Accesibilidad > Contenido leido > Voces.

## Teclado en Android

Expo Go 57 dibuja la app de borde a borde en Android, y con eso el sistema ya no encoge la ventana al abrir el teclado aunque `softwareKeyboardLayoutMode` sea `resize` (es el valor por defecto y queda explicito en `app.json`; el propio esquema de configuracion de Expo avisa de que con la barra de estado translucida hay que usar `KeyboardAvoidingView`). Por eso la mesa, la conexion, las pantallas de cuenta y la mesa nueva usan `KeyboardAvoidingView` con `behavior="padding"` **en las dos plataformas**: acolcha el fondo con la altura del teclado y la columna se reparte de nuevo, la lista de narracion (flex 1) se encoge y el cuadro con Enviar queda encima del teclado. Se descarto `height` porque fija la altura con la del primer layout y se descuadra cuando aparece un aviso o cambia la orientacion.

Ademas, al enfocar el cuadro la narracion baja al final (se sigue viendo lo ultimo que dijo el DM sobre el teclado), los chips de quien respondio se esconden mientras se escribe, el cuadro crece hasta 120 px y la lista cierra el teclado al arrastrar.

Que mirar en el telefono (no hay emulador en la laptop):

1. Android, mesa con turno abierto: tocar el cuadro. El teclado debe subir el panel entero (cuadro y Enviar visibles) y la narracion debe quedar con lo ultimo a la vista. Si el panel sube el doble de la altura del teclado (hueco vacio entre el panel y el teclado), la ventana si se esta encogiendo: quitar `behavior` en Android en `TableScreen`.
2. iOS: mismo gesto; `padding` es lo que RN recomienda ahi.
3. Escribir tres lineas: el cuadro crece y Enviar sigue visible. Arrastrar la narracion hacia abajo cierra el teclado.
4. Anfitrion con el mando desplegado y el teclado abierto: si el mando mas el cuadro no caben, plegar el mando (toca su cabecera). Queda pendiente meter el pie en un scroll propio si estorba.

## Que hace sin conexion

- Selector de sesion (001, 002, 003) con briefing, fecha y quien esta en la mesa.
- Vista de sesion con las dos formas de pintar los mismos bloques.
- Fichas de toda la party con HP, Fortuna, inventario y condiciones del estado reducido. En la sesion 003 los seis viajeros sin dueño salen velados, igual que en `apps/sheets`.
- Narracion por voz con la misma linea plegable y el mismo selector.
- Bandera de narrador local.

## Diseño

Tema oscuro de `apps/sheets` (`src/theme.ts`): fondos `#17120e`, `#221a13`, `#2b2118`; dorado `#c9a35c` con sus variantes; tinta `#e8dcc8`; granate `#7d2f28` para la accion principal. Fuentes con `expo-font` y `@expo-google-fonts/cinzel` y `crimson-pro`, importadas por peso para que al bundle solo vayan las seis que se usan (regular y bold de Cinzel; regular, cursiva, semibold y bold de Crimson Pro). `Root` espera a `useFonts` antes de pintar, con la serif del sistema en la pantalla de espera; si las fuentes fallaran (viajan dentro del bundle, no deberia) la app arranca igual y el sistema pone la suya. Con fuentes propias React Native no sintetiza cursiva ni negrita: se usa la familia de la variante (`serifItalic`, `displayBold`), nunca `fontStyle` ni `fontWeight`. Las fichas en modal se conservan tal cual; los presets del DM y las voces usan la misma fila de opcion (`RadioRow`).

## Estructura

| Ruta | Contenido |
|---|---|
| `scripts/bundle-pack.ts` | Empaqueta `content/packs/<pack>` y `campaigns/<pack>/events.jsonl` en `src/generated/` y copia los retratos a `assets/pack/` |
| `scripts/play-turn.mts` | Smoke del cliente contra la API viva: mesa nueva, sesion, respuestas, cierre, polling, proyecciones, cierre de sesion (`pnpm --filter mobile smoke-api`) |
| `src/generated/` | Generado, versionado. El test `src/pack/offline.test.ts` falla si esta desactualizado |
| `src/theme.ts` | Colores, familias de fuente por variante, `FONT_ASSETS` para `useFonts` |
| `src/pack/offline.ts` | `loadBundledPack` (pack en memoria, para los dos modos), `loadOfflineCampaign` (ademas valida el log y reduce), `PACK_OPTION` (el pack y el ruleset que la mesa nueva manda a la API) |
| `src/online/storage.ts` | URL del servidor, token, usuario y preferencias de voz (voz, velocidad, tono, idioma) en `expo-secure-store` |
| `src/online/useTableState.ts` | Polling del estado de la mesa; acumula bloques, distingue red caida de errores y avisa del 401 |
| `src/online/OnlineRoot.tsx` | Flujo en linea: conexion, crear cuenta, recuperar contraseña, mesas, perfil, mesa nueva, mesa |
| `src/sheets/entries.ts` | Que se ve de cada ficha, offline (sesion y log) y online (miembros y proyecciones); probado con vitest |
| `src/speech/voices.ts` | Lo que depende de las voces del telefono: filtro por idioma de lectura, voz recordada y etiqueta; probado con vitest. Ajustes y tono por hablante en `@rpg-ngn/ui-logic` |
| `src/speech/expoSpeechEngine.ts` | `SpeechEngine` de ui-logic sobre `expo-speech`: voz, velocidad, idioma y tono por item; lista de voces; muestra de voz |
| `src/hooks/useTts.ts` | La cola de TTS de ui-logic como hook; voces por idioma, ajustes persistidos, lectura automatica y el aviso de sin voz |
| `src/state/narrator.tsx` | Bandera de narrador: el reducer de ui-logic colgado de un contexto local |
| `src/screens/` | `ModePicker`, `SessionPicker`, `SessionScreen`, `SheetsModal`, `online/ConnectScreen`, `online/RegisterScreen`, `online/ForgotPasswordScreen`, `online/ProfileScreen`, `online/TablesScreen`, `online/NewTableScreen`, `online/TableScreen` |
| `src/components/` | `BlockGroups` (las dos vistas), `Sheet`, `TtsBar` (linea de voz plegable con idioma y bandera de narrador), `VoicePicker`, `Portrait`, `TurnPanel`, `HostPanel`, `InvitePanel`, `FriendsPanel`, `DmSettingsPanel`, `CharacterPicker`, `RadioRow`, `Button`, `Field` |

Sin libreria de navegacion a proposito: unas pocas pantallas y un modal no la necesitan, y cada dependencia nativa es un punto fragil del spike pnpm + Expo (docs/10, IA2). Por lo mismo no hay slider nativo (la velocidad y el tono van con pasos) ni AsyncStorage (las preferencias van al almacen seguro que ya estaba).

## Comandos

```bash
pnpm install                          # desde la raiz del monorepo
pnpm build                            # compila packages/*; la app importa dist/
pnpm --filter mobile bundle-pack      # regenerar tras cambiar el pack o el log
pnpm --filter mobile typecheck
pnpm --filter mobile test             # tests puros: pack empaquetado, fichas, voces del telefono
pnpm --filter mobile smoke-api        # juega un turno contra la API viva (RPG_API_URL, por defecto 127.0.0.1:8010)
pnpm --filter mobile start            # Metro; escanear el QR con Expo Go
pnpm --filter mobile doctor           # expo-doctor
```

Exportar el bundle sin telefono, como hace el CI: `pnpm --filter mobile exec expo export --platform android` (debe listar seis `.ttf`).

## Probar en el telefono

Servicios como en `RUNBOOK.md` (engine, API, Metro). Expo Go 57 en cada telefono, misma Wi-Fi.

1. **Tema y fuentes**: al abrir, la espera sale en serif del sistema sobre fondo oscuro y en menos de un segundo entra la portada con Cinzel (titulo) y Crimson Pro (texto). Si Expo Go se queda en la espera, mirar la consola de Metro: es la carga de fuentes.
2. **Cuenta nueva**: Jugar en mesa, "Créala aquí". Nombre, correo nuevo, contraseña de 8 y repetirla; Crear cuenta. Debe entrar directo a "Tus mesas" vacias (la API local tiene la verificacion apagada). Tocar el nombre en la cabecera: Perfil; cambiar el nombre y Guardar (la cabecera lo refleja al volver); cambiar la contraseña con la actual; Mesas, Salir y volver a entrar con la nueva. En "Entrar", "¿Olvidaste tu contraseña?" con ese correo debe contestar el mensaje de la API (en local no llega correo).
3. **Amigos desde fuera de la mesa**: con la cuenta nueva, al pie de "Tus mesas" buscar `gabino@example.com` y Enviar solicitud. Con `gabino@example.com` / `password` (otro telefono o la web), aceptar en Amigos.
4. **Anfitrion** (`gabino@example.com` / `password`): Crear mesa. Nombre "Prueba movil ...", elegir personaje con retrato, en "Director de juego" dejar el del servidor o elegir "DM con guion" para no gastar modelo, escribir una premisa, Crear. En la mesa creada: en Invitados escribir `jaz@example.com`, Buscar (sale como conocida), elegir personaje, Invitar; lo mismo con `armando@example.com`. En "Director de juego", Probar: con `scripted` debe decir "Listo"; cambiar de preset y Guardar. Ir a la mesa: el mando del anfitrion aparece desplegado con Abrir sesion, Invitados y DM; Abrir sesion con el codigo sugerido y una nota. La cabecera debe decir la sesion, el momento del mundo si la nota lo fijo, el turno y quien falta.
5. **Jugadores** (`jaz@example.com`, `armando@example.com`): entrar a la mesa. Tocar el cuadro de respuesta (ver la seccion del teclado), escribir, Enviar. Cuando los dos respondieron, cualquiera toca Cerrar turno y narrar: el pie muestra "El DM esta narrando..." con spinner durante 20 a 35 s y los bloques llegan solos. Subir a leer un bloque viejo antes de que lleguen: debe aparecer "Bajar a lo nuevo" sin mover la pantalla; tocarlo baja al final.
6. **Voz**: desplegar la linea de voz (toca el resumen a la derecha de Leer), tocar el boton de la voz o el del idioma: arriba estan los idiomas, cambiar a English filtra las voces y olvida la elegida; volver a Español, Oir varias, elegir una, subir la velocidad, Oir con estos ajustes, Cerrar. Leer: la narracion debe sonar mas grave que un dialogo de la party, y un NPC con otro tono. Cerrar la app y volver: la voz y el idioma siguen.
7. **Sin voz en el idioma**: en un telefono sin datos de voz en español, al entrar a una mesa aparece el aviso dentro de la linea desplegada; Entendido lo quita y no vuelve.

## Lo que no hace todavia

- La bandera de narrador sigue siendo local; compartirla entre telefonos necesita un endpoint.
- Cambiar el correo de la cuenta (exige verificar el nuevo) y BYOK (clave propia por mesa, entrega 7).
- Los bloques del turno se piden desde el primero cada vez que se entra a la mesa (`after=0`); con sesiones largas convendra guardar el ultimo id.
- La premisa se escribe al crear; editarla despues no esta en la API.
- El tema lo fija la app; el del pack (docs/09) llega cuando exista un pack que lo declare.
