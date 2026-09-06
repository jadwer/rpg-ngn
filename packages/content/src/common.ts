import { z } from 'zod'

/** Ids kebab-case, la forma canonica de referencia cruzada (05, regla 3). */
export const KebabId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id en kebab-case (a-z, 0-9, guiones)')

/** Referencia tipada a una entidad: `character:zahira`, `npc:osric`, `fact:...`. */
export const EntityRef = z
  .string()
  .regex(/^(character|npc|location|faction|item|quest|fact|player):[a-z0-9]+(?:-[a-z0-9]+)*$/, 'referencia `tipo:id` en kebab-case')

export type EntityRef = z.infer<typeof EntityRef>

export const CharacterRef = z.string().regex(/^character:[a-z0-9]+(?:-[a-z0-9]+)*$/)
export const NpcRef = z.string().regex(/^npc:[a-z0-9]+(?:-[a-z0-9]+)*$/)
export const FactRef = z.string().regex(/^fact:[a-z0-9]+(?:-[a-z0-9]+)*$/)

/** `1d20`, `2d6+3`, `1d8-1`. */
export const DiceSpec = z.string().regex(/^\d{1,2}d\d{1,3}(?:[+-]\d{1,3})?$/, 'dado con forma NdM, NdM+K o NdM-K')

/** Fechas de calendario en ISO (YYYY-MM-DD). */
export const IsoDate = z.iso.date()

/** Instantes en ISO 8601 con zona. */
export const IsoDateTime = z.iso.datetime({ offset: true })

/** Semver estricto sin prerelease para versiones de pack. */
export const SemVer = z.string().regex(/^\d+\.\d+\.\d+$/, 'version semver X.Y.Z')

export function refId(ref: string): string {
  const idx = ref.indexOf(':')
  return idx === -1 ? ref : ref.slice(idx + 1)
}

export function refKind(ref: string): string {
  const idx = ref.indexOf(':')
  return idx === -1 ? '' : ref.slice(0, idx)
}
