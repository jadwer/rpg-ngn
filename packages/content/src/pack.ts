import { z } from 'zod'
import { GENRES, SESSION_LENGTHS, STORY_STYLES } from './taxonomy.js'
import { IsoDate, KebabId, SemVer } from './common.js'

/**
 * Manifiesto de content pack (05) con procedencia obligatoria (07).
 */

export const ProvenanceClass = z.enum(['original', 'licensed', 'user-provided'])

export const Provenance = z.strictObject({
  class: ProvenanceClass,
  authors: z.array(z.string().min(1)).min(1),
  sources: z.array(z.string().min(1)),
  license: z.string().min(1),
  createdAt: IsoDate,
  updatedAt: IsoDate,
  changelog: z.string().optional(),
})

export const PackType = z.enum(['setting', 'campaign'])

/** Un archivo de la carpeta `art/` del pack: solo el nombre, sin subir por el arbol. */
const ArtFile = z.string().regex(/^[a-z0-9][a-z0-9._-]*\.(webp|png|jpg|jpeg)$/i, 'archivo de art/ (webp, png o jpg)')

/**
 * Lo que el catalogo enseña de un mundo (E9, Explorar mundos; Gabino, 26-09).
 * Vive en el pack y no en codigo: un mundo de la comunidad trae el suyo. La
 * portada y la galeria son archivos de `art/`. Sin spoilers en la sinopsis:
 * la lee quien todavia no juega.
 */
export const PackCatalog = z.strictObject({
  /** "Fantasia clasica", "Intriga", "Misterio". */
  genre: z.string().min(1).max(40),
  /** Tono, en pocas palabras: "aventura", "drama", "romance". */
  tags: z.array(z.string().min(1).max(30)).max(6).default([]),
  /**
   * Jugadores que admite la historia. 9 es el tope absoluto y solo para packs
   * contados (oficiales); la plataforma recorta a 6 los de usuario (Gabino,
   * 29-09).
   */
  players: z.strictObject({ min: z.number().int().min(1).max(9), max: z.number().int().min(1).max(9) }),
  duration: z.enum(['corta', 'media', 'larga']),
  /** Duracion estimada de cara al jugador: "10-15 h". */
  hours: z.string().min(1).max(20).optional(),
  format: z.enum(['campaña', 'aventura', 'one-shot']),
  /** Largo de sesion que recomienda (docs/26, H8); la mesa nueva lo toma. */
  sessionLength: z.enum(SESSION_LENGTHS).optional(),
  /** De uno a tres generos del vocabulario (`taxonomy.ts`); `genre` queda como etiqueta libre. */
  genres: z.array(z.enum(GENRES)).min(1).max(3).optional(),
  /** Como se cuenta: historia, mision o libre (`taxonomy.ts`). */
  style: z.enum(STORY_STYLES).optional(),
  /** Avisos de contenido, cortos: "alcohol", "muerte". */
  contentWarnings: z.array(z.string().min(1).max(40)).max(8).optional(),
  synopsis: z.string().min(1).max(700),
  cover: ArtFile,
  gallery: z.array(ArtFile).max(8).default([]),
  /** Quien lo firma en la tarjeta; sin el, el primer autor de la procedencia. */
  author: z.string().min(1).max(60).optional(),
})
export type PackCatalog = z.infer<typeof PackCatalog>

/** Codigo de idioma de dos letras (`es`, `en`). */
export const LanguageCode = z.string().regex(/^[a-z]{2}$/, 'codigo de idioma de dos letras (es, en)')

/** Idiomas en que se puede jugar un pack: el suyo primero y luego sus traducciones. */
export function packLanguages(manifest: Pick<PackManifest, 'language' | 'translations'>): string[] {
  return [manifest.language, ...manifest.translations.filter((l) => l !== manifest.language)]
}

export const PackManifest = z.strictObject({
  id: KebabId,
  type: PackType,
  version: SemVer,
  name: z.string().min(1),
  tagline: z.string().optional(),
  motto: z.string().optional(),
  /** Id del ruleset que este pack asume (packages/rules). */
  system: KebabId,
  provenance: Provenance,
  /** Un pack de campaña puede apuntar a un setting. */
  setting: KebabId.optional(),
  /** Colecciones declaradas: cada id corresponde a `<coleccion>/<id>.json`. */
  characters: z.array(KebabId).default([]),
  npcs: z.array(KebabId).default([]),
  locations: z.array(KebabId).default([]),
  /** Mapas de region sobre los que se posan los lugares (map.ts). */
  maps: z.array(KebabId).default([]),
  quests: z.array(KebabId).default([]),
  factions: z.array(KebabId).default([]),
  sessions: z.array(z.string().regex(/^\d{3}$/)).default([]),
  /** Capa `gm` del pack (secret.ts): nunca llega a un jugador ni al visor de fichas. */
  secrets: z.array(KebabId).default([]),
  /**
   * El pack pide que cada jugador escriba la personalidad de su personaje
   * (como es, que busca, que no soporta, su secreto). Lo usa La Mascarada,
   * donde el arquetipo viene hecho y quien lo juega decide quien es. Por
   * omision NO: en el piloto la ficha ya trae bio y meta, y pedir un texto
   * mas antes de jugar estorba (mesas del 20-09).
   */
  playerPersona: z.boolean().default(false),
  /**
   * Estilo de las ilustraciones de escena (E10a), en una frase: tecnica,
   * paleta y ambiente ("oleo oscuro de fantasia minera, luz de farol").
   * Sin el, se usa un estilo pictorico neutro.
   */
  artStyle: z.string().min(1).optional(),
  /**
   * Como suena este mundo: las reglas de tono que el GM sigue por encima de
   * su estilo por omision (la comedia de "Benditos sean los inutiles": el
   * plan falla por alguien de la party, el gran golpe gana y arruina).
   */
  tone: z.string().min(1).max(1500).optional(),
  /**
   * Las acciones de cada jugador son privadas por omision en este mundo: lo
   * que escribe lo lee el GM y el, no la mesa (roles ocultos). La mesa puede
   * cambiarlo en sus ajustes.
   */
  privateActions: z.boolean().optional(),
  /**
   * La party debe dinero y eso es parte del juego (la posada, las multas del
   * Gremio, el Recaudador). `start` es la deuda al empezar la campaña; el GM
   * la mueve con el effect `debt` y la mesa la ve en la cabecera.
   */
  debt: z.strictObject({ start: z.number().int().min(0), note: z.string().min(1).optional() }).optional(),
  /**
   * Mundo de calle (Vuelta al barrio, inspirado en GTA): el calor de 0 a 6
   * (cuanto busca la policia a la banda, a la vista en la mesa) y el
   * respeto de 0 a 10 de cada personaje en el barrio. Los mueve el GM con
   * los effects `heat` y `respect`.
   */
  street: z.strictObject({ heat: z.boolean().default(true), respect: z.boolean().default(true) }).optional(),
  /**
   * Combate por elementos (Las Siete Coronas, inspirado en Genshin Impact):
   * los ataques llevan elemento en su `damageType` y el motor aplica auras y
   * reacciones sobre los enemigos con `combat`.
   */
  elements: z.boolean().optional(),
  /** La ficha del mundo en el catalogo (E9). Obligatoria para publicar; opcional en un mundo privado. */
  catalog: PackCatalog.optional(),
  /** Idioma en que esta escrito el pack (i18n). Los packs de antes de declararlo son en español. */
  language: LanguageCode.default('es'),
  /**
   * Traducciones que trae en `i18n/<idioma>/` (docs/05). Solo las declaradas
   * se aplican y se validan, y son las que el catalogo anuncia.
   */
  translations: z.array(LanguageCode).default([]),
  /**
   * El texto con el que termina la historia entera (docs/26, H4): "Y asi
   * termina la historia de los Nueve Viajeros...". Sale en la pantalla de
   * fin cuando se cierra la ultima sesion o un final marcado como `final`.
   */
  finale: z.strictObject({ title: z.string().min(1), text: z.string().min(1) }).optional(),
})

export type PackManifest = z.infer<typeof PackManifest>
