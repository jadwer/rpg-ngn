import { packArtUrl, type PackOption } from '@rpg-ngn/api-client'
import { packOriginText, packSummaryText, worldTags } from '@rpg-ngn/ui-logic'

/**
 * Un mundo para elegir al crear la mesa, con su portada como en Mesas y
 * Explorar mundos (27-09). Antes era un select con "El té que nadie probó
 * (campaña)". Mismo dibujo que la app (`WorldOption` de apps/mobile).
 */
export function WorldOption({ world, selected, onSelect }: { world: PackOption; selected: boolean; onSelect: () => void }) {
  const cover = packArtUrl(world.id, world.catalog?.cover)
  const tags = worldTags(world.catalog)
  const origin = packOriginText(world)
  return (
    <button type="button" role="radio" aria-checked={selected} className="mundo-opcion" onClick={onSelect}>
      <span className="portada" style={cover ? { backgroundImage: `url(${cover})` } : undefined} aria-hidden>
        {cover ? null : world.name.charAt(0)}
      </span>
      <span className="texto">
        <span className="nombre">{world.name}</span>
        <span className="sub">{[tags.length > 0 ? tags.join(' · ') : packSummaryText(world), origin].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="punto" aria-hidden />
    </button>
  )
}
