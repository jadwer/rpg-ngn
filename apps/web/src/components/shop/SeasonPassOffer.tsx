'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient, SeasonPassOffer as Offer } from '@rpg-ngn/api-client'
import { passView } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { Panel } from '../Panel'
import { CatalogCheckout } from '../payments/Checkout'

/**
 * El pase de temporada en la tienda: lo que da y comprarlo, con la misma
 * oferta que Explorar mundos (`catalogWorlds().pass`). Sin temporada abierta
 * no se muestra.
 */
export function SeasonPassOffer({ client }: { client: ApiClient }) {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [season, setSeason] = useState<string | null>(null)
  const [buying, setBuying] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await client.catalogWorlds({})
      setOffer(result.pass)
      setSeason(result.season?.name ?? null)
    } catch {
      setOffer(null)
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load])

  const view = passView(offer)
  if (!view || !season) return null

  return (
    <Panel title={t('shop.passTitle', { season })}>
      <ul className="shop-perks">
        {view.perks.map((perk) => (
          <li key={perk}>{perk}</li>
        ))}
      </ul>
      <p className="hint">{view.priceLine}</p>
      {view.owned ? null : (
        <button type="button" className="btn primary" onClick={() => setBuying(true)}>
          {view.label}
        </button>
      )}
      {buying ? <CatalogCheckout client={client} product={{ kind: 'pase', name: season }} onClose={() => setBuying(false)} onDone={load} /> : null}
    </Panel>
  )
}
