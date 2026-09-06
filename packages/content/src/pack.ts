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
  quests: z.array(KebabId).default([]),
  factions: z.array(KebabId).default([]),
  sessions: z.array(z.string().regex(/^\d{3}$/)).default([]),
})

export type PackManifest = z.infer<typeof PackManifest>
