# Especificacion de content packs

Un content pack es un directorio bajo `content/packs/<id>/` con un manifiesto y colecciones de entidades. Es la unica fuente de lore del motor.

## Estructura

```
content/packs/<id>/
├── pack.json               manifiesto: id, nombre, tipo, version, colecciones
├── characters/*.json       personajes jugables pregenerados
├── portraits/*.jpg         (opcional) retratos referidos por `portrait`
├── npcs/*.json             (opcional)
├── locations/*.json        (opcional) con `map`, `x`, `y` si el pack trae mapa
├── maps/*.json             (opcional) mapas de region
├── maps/*.webp             (opcional) las imagenes que referencian
├── factions/*.json         (opcional)
├── rumors.json             (opcional)
├── timeline.json           (opcional)
├── secrets/*.json          (opcional) capa `dm`: hechos que la party no sabe, con condicion de revelacion
└── sessions/*.json         datos publicos de sesion (logistica, sin spoilers)
```

Formato JSON en el piloto (lo consume fetch sin parser extra). Los schemas formales viven en `packages/content` (zod, `strictObject`: una clave desconocida es error) y `tools/validate` los aplica en CI sobre `content/packs/*` y `campaigns/*`. Este documento describe la intencion; ante una duda, manda el schema.

## Schema de personaje (v0, el contrato vigente)

```json
{
  "id": "dayan",
  "name": "Dayan",
  "race": "Elfa oscura",
  "class": "Arquera",
  "age": "72 anios (joven)",
  "quote": "La sombra tambien puede ser un hogar.",
  "bio": "...",
  "stats": { "fue": 10, "des": 17, "con": 14, "int": 12, "sab": 14, "car": 11 },
  "hp": 12,
  "ac": 14,
  "attacks": [
    { "id": "arco-largo", "name": "Arco largo", "use": "des",
      "damage": "1d8", "damageType": "perforante", "range": "largo" }
  ],
  "abilities": [
    { "id": "disparo-certero", "name": "Disparo certero", "type": "rasgo",
      "uses": 2, "per": "descanso corto",
      "effect": "Aniade 1d6 al danio de un disparo declarado antes de tirar." }
  ],
  "skills": ["Tiro con arco", "Sigilo", "Percepcion", "Supervivencia"],
  "roles": ["Danio a distancia", "Exploracion"],
  "goal": "una linea con el objetivo del personaje",
  "portrait": "portraits/dayan.jpg"
}
```

Notas:

- `stats` usa las seis caracteristicas clasicas en espanol abreviado (fue, des, con, int, sab, car), valores 3 a 20.
- `hp` y `ac` son valores de nivel 1. En el pack piloto fueron derivados por clase; la lamina original no los traia.
- `portrait` es una ruta relativa al pack o null.
- **Estandar de retrato (2026-09-19): cuadrado de 512x512, WebP (calidad
  82), encuadrado en cara y hombros con la cara en el tercio superior.** Los
  tres clientes pintan el retrato como un cuadrado con recorte centrado, de 24
  a 96 px de lado (hasta unos 200 en los selectores), asi que un retrato
  vertical pierde la cabeza y uno mas grande solo pesa. JPG se acepta por
  compatibilidad (el piloto sigue en 512x512 JPG hasta su paso a WebP). De una
  lamina de varios personajes se sacan con `tools/packs/crop-portraits.py`.
- `skills` y `roles` son texto libre en v0; en fase 1 se normalizan a catalogos.

### attacks y abilities

Se agregaron en v0.2 despues de la sesion piloto: un jugador tuvo que preguntarle al
DM que podia hacer su personaje, y el DM improviso el kit. Sin este bloque las fichas
no son reproducibles entre sesiones ni entre DMs.

El vocabulario es deliberadamente neutro (`type`, `uses`, `per`, `effect` en prosa) y
no menciona niveles de conjuro ni nombres propios de ningun sistema. El mapeo a un
ruleset concreto es responsabilidad de `packages/rules`, no del content pack.

- `attacks[].use` nombra la caracteristica que se aplica (`fue`, `des`, ...).
- `abilities[].type`: `truco`, `conjuro`, `rasgo` o `pasiva` en v0.
- `abilities[].uses`: numero de usos, o `null` si es a voluntad. Se acompania de `per`
  cuando hay limite (`descanso corto`, `descanso largo`).
- `effect` es prosa dirigida al jugador, no una formula. La resolucion la arbitra el DM.
- Una capacidad que hace daño (trucos y conjuros de ataque) lleva ademas `damage`,
  `damageType` y `range`, con el mismo vocabulario que `attacks`.

## Mapas de region

Un pack puede traer mapas. **No son tableros tacticos**: no hay casillas ni
nadie se coloca en una coordenada. Un mapa es una imagen que dibuja el autor
del pack, y los lugares se posan encima por coordenadas.

Dos piezas que ya existian y ahora se usan juntas:

- **Los nodos son los lugares** (`locations/*.json`), que ya estaban.
- **Las aristas son sus `connections`**, que tambien estaban: del comedor se
  llega al salon grande y a los pasillos de servicio, a la biblioteca no. El
  DM las recibe en su contexto, asi que sabe que caminos existen.

Lo nuevo es donde cae cada nodo sobre la imagen.

```json
// maps/palacio.json
{
  "id": "palacio",
  "name": "Palacio de Montclair",
  "image": "maps/palacio.webp",
  "description": "Planta del palacio la noche del baile."
}
```

```json
// locations/comedor.json (extracto)
{
  "id": "comedor",
  "connections": ["salon-grande", "pasillos-de-servicio"],
  "map": "palacio",
  "x": 17.5,
  "y": 40.0
}
```

Reglas:

- **`x` e `y` van en porcentaje** del ancho y el alto de la imagen (0 a 100),
  no en pixeles: la misma coordenada vale en un telefono y en una pantalla
  compartida.
- **Los tres campos van juntos o no va ninguno.** Un lugar sin `map` sigue
  siendo valido; el pack simplemente no lo pinta.
- **Varios mapas por pack**, porque una campaña puede querer el pueblo y,
  aparte, los tres niveles de la mina. Cada lugar dice en cual esta.
- El cargador comprueba que la imagen exista, que el `map` este declarado en
  el manifiesto, y **avisa si dos lugares caen casi encima** (se taparian).
- Un pack sin mapas funciona igual: sus lugares se leen como lista.

**Como se sacan las coordenadas** (lo que costo aprender con el primer
mapa): un generador de imagenes no obedece numeros, obedece composicion. Se
le pide la disposicion en rejilla ("el salon en el centro, el comedor a la
izquierda") y despues **se miden las coordenadas sobre la imagen ya
generada**, pintando los marcadores encima para comprobar que cada uno cae
dentro de su sala. En el palacio de La Mascarada, dos de seis estaban mal al
primer intento.

**Un mapa no se declara hasta que su imagen existe.** Un `maps/x.json` que
apunta a una imagen que falta **impide cargar el pack entero**, no solo el
mapa, y con el pack sin cargar no hay partida. Mientras se espera la imagen,
el mapa y las coordenadas se guardan como `.pendiente` junto al archivo que les
toca; el empaquetador los ignora y el validador no los ve. Se activan al llegar
la imagen. Los prompts para generarlas estan en `docs/20`.

**Donde arranca la party: `startLocation` en la sesion.** Un pack con mapa
deberia declararlo; si no lo hace, nadie tiene ubicacion hasta que el DM mueva
a alguien y el mapa sale vacio de gente toda la primera escena:

```json
{
  "id": "001",
  "title": "Una noche puede cambiarlo todo",
  "startLocation": "salon-grande"
}
```

Al abrir la sesion, el engine coloca ahi a todo personaje de la party que no
tenga ya ubicacion (docs/08). El cargador comprueba que el lugar exista en el
pack. Es opcional: un pack sin lugares no lo usa.

## Secretos: la capa `dm` del pack

`secrets/<id>.json`, declarados en `pack.json` bajo `secrets`. Son la capa DM knowledge de
[04](04-narrative-context.md) escrita como datos: hechos que existen en el mundo y que la party
no ha descubierto. Schema en `packages/content/src/secret.ts`:

```json
{
  "id": "brorg-pago-por-zahira",
  "about": "character:brorg",
  "text": "Brorg pagó por Zahira: la empujó hacia arriba tocando la campana con la palma.",
  "keywords": ["Brorg pagó", "pagó por Zahira", "quemaduras de bronce", "fue Brorg"],
  "revealWhen": { "event": "discovery", "fact": "fact:brorg-pago-por-zahira" },
  "revealedBy": "character:brorg",
  "note": "Zahira solo recuerda una mano verdosa; la identidad se revela con un discovery propio."
}
```

- `about`: la entidad a la que pertenece (`character`, `npc`, `location`, `quest`, `item`, `faction`).
  Un personaje debe existir en el pack; NPC, lugar o mision pueden vivir solo en la cronica (aviso).
- `text`: el hecho, escrito para el DM. Es lo que entra a la capa `dm` del contexto del modelo.
- `keywords`: frases que solo aparecen si se esta contando este hecho. El lint de conocimiento
  las busca en la narracion sin acentos ni mayusculas; una frase generica ("la campana") produce
  falsos positivos y corta narracion legitima. Elegirlas como marcadores, no como temas.
- `revealWhen`: `{ "manual": true }` (solo lo revela el DM con un evento `secret_revealed`) o una
  condicion sobre un evento del log: `event` (tipo) y opcionalmente `fact` (discovery), `actor`,
  `target` y `match` (texto que debe contener el evento, sin acentos).
- `revealedBy` y `note`: quien puede soltarlo en la ficcion y una nota de mantenimiento.

Semantica: un secreto esta revelado a un personaje cuando el log tiene un evento visible para el
que cumple `revealWhen`, o un `secret_revealed` con ese personaje entre los testigos
([08](08-event-model.md)). `packages/campaign` lo proyecta en `knowledge[<pc>].secrets`; el texto
y las keywords nunca entran a una proyeccion de jugador, al visor de fichas ni al pack empaquetado
en la app movil (`bundle-pack` los omite y deja `secrets: []` en el manifiesto).

En un repo publico como este, "secreto" significa oculto a los jugadores por software, no oculto
al mundo: quien quiera secretos que nadie pueda leer los mantiene en un pack privado. Los dos del
pack piloto (`osric-esta-abajo`, `brorg-pago-por-zahira`) salen de las notas de la sesion 003.

## Log de eventos de campaña

`campaigns/<id>/events.jsonl` no forma parte del pack, pero se valida contra el pack
de la misma id. Cada linea es un evento con `id` (`evt-NNNNN`), `v` (version del
schema de ese tipo; hoy 1), `seq`, `type`, `sessionId` y `recordedAt`. Los eventos
escritos antes de existir `v` se leen con `upcastEvent`; el archivo no se edita. El
detalle esta en [08](08-event-model.md) y en `packages/content/src/event.ts`.

## Reglas

0. Todo pack declara su procedencia en `pack.json` segun [07-content-provenance.md](07-content-provenance.md).
1. Un pack de tipo `setting` no contiene estado de campana; un pack de tipo `campaign` puede referenciar un setting.
2. La unica parte del pack que un jugador no ve es `secrets/`, y solo por software (proyecciones, visor y bundle la omiten). Este repo es publico, asi que las notas privadas del DM siguen viviendo fuera (`dm/`, gitignored); a `secrets/` van los hechos que el motor debe vigilar.
3. Los ids son kebab-case, unicos dentro del pack, y son la forma canonica de referencia cruzada.
4. Todo cambio de lore pasa por PR/commit: Git es el historial del conocimiento del mundo.
