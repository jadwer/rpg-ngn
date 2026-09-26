import { z } from 'zod'
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
  players: z.strictObject({ min: z.number().int().min(1).max(12), max: z.number().int().min(1).max(12) }),
  duration: z.enum(['corta', 'media', 'larga']),
  /** Duracion estimada de cara al jugador: "10-15 h". */
  hours: z.string().min(1).max(20).optional(),
  format: z.enum(['campaña', 'aventura', 'one-shot']),
  synopsis: z.string().min(1).max(700),
  cover: ArtFile,
  gallery: z.array(ArtFile).max(8).default([]),
  /** Quien lo firma en la tarjeta; sin el, el primer autor de la procedencia. */
  author: z.string().min(1).max(60).optional(),
})
export type PackCatalog = z.infer<typeof PackCatalog>

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
  /** Capa `dm` del pack (secret.ts): nunca llega a un jugador ni al visor de fichas. */
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
  /** La ficha del mundo en el catalogo (E9). Obligatoria para publicar; opcional en un mundo privado. */
  catalog: PackCatalog.optional(),
})

export type PackManifest = z.infer<typeof PackManifest>
