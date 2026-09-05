# Alcance del SaaS

Escrito el 2026-09-06, despues de tres sesiones jugadas del piloto. Este documento
recoge lo que la mesa pidio y decide como se construye. Manda sobre el ROADMAP en
lo que se contradigan; el contrato de realidad ([06](06-reality-contract.md)) manda
sobre este.

## Que valido el piloto

Tres sesiones con cinco jugadores distintos dieron datos que no teniamos:

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

TTS del dispositivo (Expo Speech en la app, Web Speech API en web). Sin coste de
API. Lee los bloques de narracion; los dialogos pueden variar el tono por hablante
si el motor de voz lo permite, y si no, se leen igual.

En mesa presencial suena en un solo dispositivo (el de quien haga de narrador).

## Arquitectura

### Monorepo, y por que

Se mantiene el monorepo pnpm que ya define [02-architecture.md](02-architecture.md).
La razon no es comodidad: `packages/core`, `rules`, `content` y `campaign` son una
libreria compartida que importan la web, la app y el servidor. En repos separados
eso obliga a publicar a un registry privado y a versionar entre repos cada vez que
cambia una primitiva.

Costo aceptado: un repo grande, CI que tiene que filtrar por paquete afectado.

Cuando separar: cuando haya que dar acceso parcial a un colaborador externo, o
cuando un paquete tenga vida propia fuera del producto. Ese dia `packages/*` se
publica y las apps salen. No antes.

```
rpg-ngn/
├── packages/
│   ├── core/          primitivas deterministas (fase 2)
│   ├── rules/         rulesets (fase 2)
│   ├── content/       schemas zod + loader (fase 1)
│   ├── campaign/      estado vivo y proyecciones (fase 2)
│   ├── narrative/     DMProvider y context builder (fase 3)
│   └── ui/            componentes compartidos web/native
├── apps/
│   ├── sheets/        visor estatico actual (legacy, se mantiene)
│   ├── web/           Next.js: mesa, DM harness, admin de packs
│   ├── mobile/        Expo: la superficie del jugador
│   └── server/        API + estado de campana
└── content/packs/     contenido versionado (sin cambio)
```

`packages/ui`: la app y la web comparten la vista de narrativa y la de dialogo.
Decidir en fase 4 si se resuelve con React Native Web o con dos implementaciones
sobre logica compartida. No adelantar la decision.

### Ramas

- `main`: lo que sirve GitHub Pages. Las fichas de la mesa viven aqui.
- `legacy`: la campana de Valdoria en curso. Se mergea a `main` para publicar.
- `dev`: el SaaS. No toca `content/packs/pilot` salvo para migrarlo.

### Que se guarda donde

No cambia lo que ya define [08](08-event-model.md):

- **Contenido canonico**: Git, en `content/packs/`. Versionado, revisable.
- **Estado de campana**: `events.jsonl` append-only, y en la fase servidor una
  tabla append-only. Las proyecciones se derivan.
- **Secretos del DM**: fuera del repo publico (`dm/`).

El SaaS anade multi-tenant: cada mesa es una campana con su log. El contenido puede
ser publico (packs compartidos) o privado del usuario.

## Lo que falta definir

Estas son las preguntas que este documento NO responde y que hay que cerrar antes
de escribir codigo de servidor:

1. **Autenticacion y sesion de mesa.** Como entra un jugador: cuenta, o codigo de
   mesa efimero. Para presencial, un codigo de seis caracteres es menos friccion
   que registrarse, pero no permite historial personal entre campanas.
2. **Quien paga el DM.** El coste de LLM por sesion es real (una sesion de dos
   horas son decenas de turnos con contexto largo). Definir si lo paga el duenio
   de la mesa, si hay cuota por sesion, o si el usuario trae su propia API key.
3. **Modo DM humano.** Las tres sesiones jugadas tuvieron DM IA. Un DM humano
   usando la misma herramienta es un producto distinto y probablemente mas facil
   de vender. Decidir si es v1 o v2.
4. **Que pasa si el jugador cierra la app a medio turno.** Timeout, o el turno
   queda bloqueado hasta que vuelva.
5. **Contenido de terceros.** El repo publico solo admite contenido original o
   licenciado ([07](07-content-provenance.md)). En SaaS, un usuario que sube un
   pack con material de otro sistema es un problema legal, no tecnico.
6. **Persistencia de la voz.** Si el TTS es del dispositivo, cada quien oye una voz
   distinta. Aceptable en presencial (suena uno solo); en remoto, no.

## Orden sugerido

1. Fase 1 del ROADMAP (schemas zod, validacion en CI). Es la base de todo y ya
   tiene contenido real que validar: tres sesiones y nueve fichas.
2. `apps/mobile` con el pack cargado en local y sin DM: solo lectura de narrativa,
   fichas en modal y TTS. Es la mitad de las notas de la mesa y no necesita
   servidor.
3. Motor (`core`, `rules`) con los eventos de las tres sesiones como caso de test.
4. Servidor y turnos simultaneos.
5. DM IA sobre `narrative`.

El punto 2 es el que da valor visible mas rapido y el que se puede probar en la
siguiente sesion presencial.
