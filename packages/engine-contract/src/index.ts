import { CampaignEvent, Character, IsoDateTime, KebabId, Session, SessionId } from '@rpg-ngn/content'
import { z } from 'zod'

/**
 * Contrato Laravel <-> apps/engine (docs/11, D3 y D5). Version entera; el
 * engine rechaza contratos que no conoce. Los tipos de aqui son la unica
 * cosa que ambos lados comparten; la API los consume como JSON Schema.
 */
export const ENGINE_CONTRACT_VERSION = 1

export const ContractVersion = z.literal(ENGINE_CONTRACT_VERSION)

export const PackRef = z.strictObject({
  id: KebabId,
  version: z.string().min(1),
})
export type PackRef = z.infer<typeof PackRef>

/** Un dado con forma NdM, NdM+K o NdM-K (la misma regla que `DiceSpec` de content). */
const DieSpec = z.string().regex(/^\d{1,2}d\d{1,3}(?:[+-]\d{1,3})?$/, 'dado con forma NdM, NdM+K o NdM-K')

export const RollKind = z.enum(['skill', 'social', 'attack', 'save', 'other'])
export type RollKind = z.infer<typeof RollKind>

/**
 * Tirada que el DM pide a un personaje y que se resuelve fuera del motor: el
 * jugador la dispara desde la mesa y el numero lo pone la API (modo `dice`),
 * o la tira con su dado fisico y escribe el numero (modo `table`). Es solo
 * el dato: no dice como se pinta el dado.
 */
export const RollRequest = z.strictObject({
  characterId: KebabId,
  die: DieSpec,
  kind: RollKind,
  skill: z.string().min(1).max(60).optional(),
  /** Por que se pide, en palabras de la escena ("la cornisa cede bajo tus pies"). */
  reason: z.string().min(1).max(160).optional(),
  advantage: z.boolean().optional(),
  disadvantage: z.boolean().optional(),
})
export type RollRequest = z.infer<typeof RollRequest>

/** La tirada que ES la respuesta de un personaje (la registro la API al resolver una `RollRequest`). */
export const ResponseRoll = z.strictObject({
  die: DieSpec,
  result: z.number().int(),
  rolls: z.array(z.number().int()),
  kind: RollKind,
  skill: z.string().optional(),
})
export type ResponseRoll = z.infer<typeof ResponseRoll>

/** Lo que un jugador respondio en el turno. `late` llego tras el cierre. */
export const TurnResponse = z.strictObject({
  characterId: KebabId,
  playerId: z.string().min(1),
  text: z.string().min(1).max(4000),
  submittedAt: IsoDateTime,
  late: z.boolean().default(false),
  /** Si la respuesta es una tirada pedida y ya registrada por la API. Opcional: no sube la version. */
  roll: ResponseRoll.optional(),
})
export type TurnResponse = z.infer<typeof TurnResponse>

export const TurnInput = z.strictObject({
  id: z.string().min(1),
  number: z.number().int().positive(),
  sessionId: SessionId,
  responses: z.array(TurnResponse),
})
export type TurnInput = z.infer<typeof TurnInput>

/** Linea de un NPC que el DM scripted mete antes de su narracion. */
export const ScriptedLine = z.strictObject({
  speaker: z.string().min(1),
  speakerRef: z.string().min(1).optional(),
  text: z.string().min(1),
})

/**
 * Guion opcional del DM scripted: narracion fija por numero de turno, para
 * escenas cortas y demos sin modelo. Es contenido, viaja en `settings` de la
 * mesa; el codigo del provider no sabe de lore. Un turno sin entrada en el
 * guion recibe la narracion generica.
 */
export const ScriptedScene = z.strictObject({
  /** Narracion del turno 1 cuando se cierra sin respuestas: presenta la escena. */
  opening: z.string().min(1).optional(),
  turns: z
    .array(
      z.strictObject({
        turn: z.number().int().positive(),
        lines: z.array(ScriptedLine).optional(),
        narration: z.string().min(1),
      }),
    )
    .optional(),
})
export type ScriptedScene = z.infer<typeof ScriptedScene>

/**
 * Proveedor de LLM. `scripted` narra de forma determinista (entrega 5);
 * `anthropic` (entrega 6) recibe la credencial custodiada por la plataforma,
 * que viaja solo por localhost, vive en memoria durante la llamada y nunca
 * vuelve al cliente ni aparece en logs.
 */
/**
 * `compact` recorta el contexto a menos de 3000 tokens de entrada (fichas
 * resumidas, memoria de 12 a 15 eventos): para modelos locales en maquinas
 * chicas. `full` es el perfil de los proveedores de nube.
 */
export const ContextProfile = z.enum(['full', 'compact'])

export const ProviderConfig = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('scripted'), script: ScriptedScene.optional() }),
  z.strictObject({
    kind: z.literal('anthropic'),
    model: z.string().min(1),
    credential: z.string().min(1),
    contextProfile: ContextProfile.optional(),
  }),
  /**
   * Cualquier API compatible con OpenAI (Chat Completions con streaming).
   * `baseUrl` apunta a otro proveedor: DeepSeek es `https://api.deepseek.com`,
   * Ollama es `http://<host>:11434/v1` (con credencial fija `ollama`).
   */
  z.strictObject({
    kind: z.literal('openai'),
    model: z.string().min(1),
    credential: z.string().min(1),
    baseUrl: z.string().url().optional(),
    contextProfile: ContextProfile.optional(),
  }),
])
export type ProviderConfig = z.infer<typeof ProviderConfig>
export type ProviderKind = ProviderConfig['kind']
export const PROVIDER_KINDS: readonly ProviderKind[] = ['scripted', 'anthropic', 'openai']

export const TurnBudget = z.strictObject({
  /** Tope de salida del modelo por turno. Con pensamiento adaptativo el razonamiento tambien cuenta aqui. */
  maxOutputTokens: z.number().int().positive().default(4000),
})

/**
 * Texto libre que el usuario escribe al crear la mesa (`premise`) o al abrir
 * la sesion (`sessionNote`). Entra al contexto del DM como contenido no
 * confiable, delimitado; no puede cambiar las reglas del DM (entrega 6).
 */
export const TurnContext = z.strictObject({
  premise: z.string().max(4000).optional(),
  sessionNote: z.string().max(1000).optional(),
  /** Personalidad escrita por cada jugador presente, por id de personaje. Texto del usuario, delimitado en el contexto. */
  personas: z.record(KebabId, z.string().max(600)).optional(),
})
export type TurnContext = z.infer<typeof TurnContext>

/**
 * Lint de conocimiento (docs/08, invariante 3). `enforce` sustituye por un
 * aviso `system` todo bloque que cuente un secreto no revelado; `report`
 * solo lo anota en `result.lint`; `off` no revisa. Si la peticion no lo
 * trae, decide el engine (variable `DM_LINT`, por defecto `enforce`).
 */
export const LintMode = z.enum(['enforce', 'report', 'off'])
export type LintMode = z.infer<typeof LintMode>

/**
 * Quien tira los dados de la mesa (Gabino, 25-09: tres modos).
 *
 * `engine`: el motor tira un d20 por personaje antes de llamar al modelo y
 * el DM narra la consecuencia en el mismo turno. El numero que escriba un
 * jugador se ignora. Rapido y sin dado a la vista.
 *
 * `dice`: el DM pide la tirada (`RollRequest`) y no narra la consecuencia;
 * el jugador suelta el dado en la mesa y el numero lo pone la API. Un numero
 * escrito por el jugador no cuenta. Es el dado en pantalla.
 *
 * `table`: partida presencial con dados reales. El DM pide la tirada y el
 * jugador escribe el numero que saco; ese vale como tirada fisica.
 */
export const DiceMode = z.enum(['engine', 'dice', 'table'])
export type DiceMode = z.infer<typeof DiceMode>

export const ResolveTurnRequest = z.strictObject({
  contract: ContractVersion,
  campaignId: z.string().min(1),
  pack: PackRef,
  ruleset: z.string().min(1),
  /** Estado canonico del ultimo snapshot (CampaignState), o null si la campaña empieza. */
  snapshot: z.unknown().nullable(),
  /** Eventos posteriores al snapshot, en orden. */
  events: z.array(z.unknown()),
  turn: TurnInput,
  provider: ProviderConfig,
  budget: TurnBudget.optional(),
  /** Opcional y sin subir la version: un campo nuevo opcional no rompe el contrato. */
  context: TurnContext.optional(),
  lint: LintMode.optional(),
  dice: DiceMode.optional(),
})
export type ResolveTurnRequest = z.infer<typeof ResolveTurnRequest>

/** Hallazgo del lint de conocimiento sobre un bloque o evento del turno. */
export const LintFinding = z.strictObject({
  level: z.enum(['error', 'warning']),
  /** Secreto del pack cuya keyword aparecio (error). */
  secretId: z.string().optional(),
  /** Entidad del pack nombrada sin haberla presenciado (warning). */
  entity: z.string().optional(),
  /** La keyword o el nombre que disparo el hallazgo. */
  marker: z.string(),
  /** Personajes presentes que no lo conocen. */
  receivers: z.array(KebabId),
  message: z.string().min(1),
})
export type LintFinding = z.infer<typeof LintFinding>

/** Bloques tipados de un turno (docs/09): lo que el jugador ve y oye. */
export const TurnBlock = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('narration'), text: z.string().min(1) }),
  z.strictObject({
    type: z.literal('dialogue'),
    speaker: z.string().min(1),
    speakerRef: z.string().nullable(),
    text: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal('roll'),
    text: z.string().min(1),
    actor: z.string(),
    die: z.string(),
    result: z.number().int(),
    /** Cada dado por separado (dos con ventaja o desventaja, varios en 2d6): para pintar las caras. */
    rolls: z.array(z.number().int()).optional(),
    /** La pidio el DM y la resolvio la API (no una tirada rapida ni el motor). Opcional: no sube la version. */
    requested: z.literal(true).optional(),
    /** Con dos d20, cual cuenta (el mayor o el menor): para atenuar el otro. Opcional: no sube la version. */
    advantage: z.enum(['advantage', 'disadvantage']).optional(),
  }),
  z.strictObject({
    type: z.literal('system'),
    text: z.string().min(1),
    /**
     * Quien necesita leerlo. `table` es para todos; `host` es ruido tecnico
     * que solo el anfitrion puede accionar y que a un jugador solo le estorba.
     * Sin el campo, la mesa entera lo ve (compatible con lo ya guardado).
     */
    audience: z.enum(['table', 'host']).optional(),
    /**
     * Que hacer: `info` no pide nada, `action` si (volver a cerrar el turno,
     * responder). La UI puede resaltar solo los `action`.
     */
    tone: z.enum(['info', 'action']).optional(),
    /** Detalle largo para el anfitrion (que linea se ignoro y por que). */
    detail: z.string().optional(),
    /** Titulo y puntos: la apertura de sesion trae el briefing y "como se juega" del pack. */
    title: z.string().min(1).optional(),
    items: z.array(z.string().min(1)).optional(),
    /** Es el "Anteriormente..." de la apertura (E10c): los clientes lo enseñan al entrar. */
    recap: z.literal(true).optional(),
  }),
  /**
   * Ilustracion de la escena (E10a). No la escribe el engine: la API la
   * genera aparte y la añade al turno cuando esta lista, asi que el texto
   * nunca la espera. `url` es relativa al servidor de la API.
   */
  z.strictObject({
    type: z.literal('image'),
    url: z.string().min(1),
    alt: z.string().min(1),
    caption: z.string().optional(),
  }),
])
export type TurnBlock = z.infer<typeof TurnBlock>

/**
 * Lo que el engine propone ilustrar al terminar un turno. Decide cuando
 * (apertura, cambio de lugar, momento que marco el DM) y arma el prompt
 * desde el pack y el estado, nunca desde el texto libre de un jugador. La
 * API decide si se genera (tope por sesion, procedencia del pack, ajuste de
 * la mesa) y con que proveedor.
 */
export const Illustration = z.strictObject({
  reason: z.enum(['opening', 'location', 'moment']),
  /** Descripcion lista para el generador: momento, lugar, personajes y estilo. */
  prompt: z.string().min(1),
  /** Texto alternativo corto para quien no ve la imagen. */
  alt: z.string().min(1),
  /** Rutas del pack (`portraits/zahira.webp`) que el generador usa de referencia. */
  references: z.array(z.string().min(1)),
  /** Hay personajes en cuadro: pide un proveedor que respete referencias. */
  withCharacters: z.boolean(),
  location: KebabId.nullable(),
})
export type Illustration = z.infer<typeof Illustration>

/**
 * Un pack que este servidor puede jugar. La plataforma lo ofrece al crear
 * una mesa; hasta ahora la lista vivia escrita a mano en cada cliente.
 */
/**
 * Un mapa del pack listo para pintar: la imagen y los lugares posados sobre
 * ella, en porcentaje. No es un tablero: las coordenadas dicen donde cae
 * cada lugar, no donde se coloca un personaje.
 */
export const PackMapView = z.strictObject({
  id: KebabId,
  name: z.string().min(1),
  image: z.string().min(1),
  description: z.string().nullable(),
  places: z.array(
    z.strictObject({
      id: KebabId,
      name: z.string().min(1),
      x: z.number(),
      y: z.number(),
      connections: z.array(KebabId),
    }),
  ),
})
export type PackMapView = z.infer<typeof PackMapView>

export const PackSummary = z.strictObject({
  id: KebabId,
  version: z.string().min(1),
  type: z.enum(['setting', 'campaign']),
  name: z.string().min(1),
  tagline: z.string().nullable(),
  /** Ruleset que el pack asume; la mesa se crea con el. */
  system: KebabId,
  characters: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  /** El pack pide que cada jugador escriba la personalidad de su personaje. */
  playerPersona: z.boolean().default(false),
})
export type PackSummary = z.infer<typeof PackSummary>

/**
 * Un personaje jugable de un pack, para elegirlo al crear la mesa o al
 * invitar. Es lo justo para pintar la tarjeta: el resto de la ficha lo da la
 * proyeccion cuando ya se juega.
 */
export const PackCharacter = z.strictObject({
  id: KebabId,
  name: z.string().min(1),
  /** Raza y clase, o lo que el pack use para describirse en una linea. */
  race: z.string(),
  characterClass: z.string(),
  quote: z.string(),
  roles: z.array(z.string()),
  /** Ruta del retrato dentro del pack, o null. */
  portrait: z.string().nullable(),
})
export type PackCharacter = z.infer<typeof PackCharacter>

/**
 * Lo que un cliente necesita de un NPC de un pack que no lleva empaquetado:
 * nombre y retrato para el dialogo. Sin esto, los NPC de la boticaria y de La
 * Mascarada hablaban sin cara en los dos clientes aunque tuvieran retrato.
 */
export const PackNpc = z.strictObject({
  id: KebabId,
  name: z.string().min(1),
  portrait: z.string().nullable(),
})
export type PackNpc = z.infer<typeof PackNpc>

export const TurnUsage = z.strictObject({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
})

export const TurnProjections = z.strictObject({
  world: z.unknown(),
  narrative: z.unknown(),
  players: z.record(z.string(), z.unknown()),
})
export type TurnProjections = z.infer<typeof TurnProjections>

/** Una linea del stream NDJSON de `POST /v1/turns/resolve`. */
export const ResolveLine = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('block'), block: TurnBlock }),
  z.strictObject({
    kind: z.literal('result'),
    events: z.array(CampaignEvent),
    /** Personajes a los que el DM interpela directamente; cierran el siguiente turno. */
    addressed: z.array(KebabId),
    state: z.unknown(),
    projections: TurnProjections,
    usage: TurnUsage,
    /** Hallazgos del lint de conocimiento; ausente si no hubo ninguno. Opcional: no sube la version. */
    lint: z.array(LintFinding).optional(),
    /** Escenas que el engine propone ilustrar (E10a); ausente si ninguna. Opcional: no sube la version. */
    illustrations: z.array(Illustration).optional(),
    /**
     * Ideas de accion por personaje interpelado (E10b): dos frases cortas que
     * el cliente ofrece sobre el cuadro de texto, que sigue libre. Opcional:
     * no sube la version.
     */
    suggestions: z.record(KebabId, z.array(z.string().min(1).max(120)).max(2)).optional(),
    /**
     * Tiradas que el DM pidio para el turno que viene (modos `dice` y
     * `table`): esos personajes tiran en vez de escribir. Opcional: no sube
     * la version.
     */
    rollRequests: z.array(RollRequest).optional(),
  }),
  z.strictObject({ kind: z.literal('error'), message: z.string().min(1) }),
])
export type ResolveLine = z.infer<typeof ResolveLine>

export const IssueLine = z.strictObject({
  level: z.enum(['error', 'warning']),
  path: z.string(),
  message: z.string(),
})

export const ValidateEventsRequest = z.strictObject({
  contract: ContractVersion,
  pack: PackRef.optional(),
  events: z.array(z.unknown()),
})
export type ValidateEventsRequest = z.infer<typeof ValidateEventsRequest>

export const ValidateEventsResponse = z.strictObject({
  ok: z.boolean(),
  events: z.array(CampaignEvent),
  issues: z.array(IssueLine),
})
export type ValidateEventsResponse = z.infer<typeof ValidateEventsResponse>

export const ProjectRequest = z.strictObject({
  contract: ContractVersion,
  pack: PackRef,
  ruleset: z.string().min(1),
  /** Todos los eventos de la campaña desde el principio. */
  events: z.array(z.unknown()),
  /**
   * Snapshot a auditar: el engine reproyecta hasta su seq y compara (BA2).
   * Acepta el archivo de snapshot tal cual (packId, ruleset y demas se ignoran).
   */
  compareWith: z
    .object({
      seq: z.number().int().positive(),
      state: z.unknown(),
    })
    .optional(),
})
export type ProjectRequest = z.infer<typeof ProjectRequest>

export const Divergence = z.strictObject({
  path: z.string(),
  expected: z.unknown(),
  actual: z.unknown(),
})

export const ProjectResponse = z.strictObject({
  seq: z.number().int().nonnegative(),
  state: z.unknown(),
  projections: TurnProjections,
  divergence: z.array(Divergence).nullable(),
})
export type ProjectResponse = z.infer<typeof ProjectResponse>

export const ProbeResponse = z.strictObject({
  ok: z.boolean(),
  provider: z.string(),
  model: z.string().nullable(),
  message: z.string().nullable(),
})
export type ProbeResponse = z.infer<typeof ProbeResponse>

export const ENGINE_HEADERS = {
  token: 'x-engine-token',
  contract: 'x-engine-contract',
} as const

/**
 * Validar un pack subido (entrega 8): la plataforma lo descomprime en una
 * carpeta de cuarentena, en la misma maquina que el engine, y le pide que lo
 * cargue con los mismos schemas que a los oficiales.
 */
export const PackValidateRequest = z.strictObject({
  /** Ruta absoluta de la carpeta, dentro de la zona de packs de usuario. */
  dir: z.string().min(1),
})
export type PackValidateRequest = z.infer<typeof PackValidateRequest>

export const PackIssue = z.strictObject({
  level: z.enum(['error', 'warning']),
  path: z.string(),
  message: z.string(),
})
export type PackIssue = z.infer<typeof PackIssue>

export const PackValidateResponse = z.strictObject({
  ok: z.boolean(),
  issues: z.array(PackIssue),
  pack: PackSummary.nullable(),
})
export type PackValidateResponse = z.infer<typeof PackValidateResponse>

/**
 * Las fichas completas de un pack y sus sesiones (entrega 8, E3 del VAM):
 * lo que un cliente que no lleva el pack necesita para pintar el panel de
 * fichas con el mismo velo que el pack empaquetado. El velo se aplica en el
 * cliente: es presentacion, no frontera de seguridad.
 */
export const PackSheets = z.strictObject({
  characters: z.array(Character),
  sessions: z.array(Session),
})
export type PackSheets = z.infer<typeof PackSheets>
