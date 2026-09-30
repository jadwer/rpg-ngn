'use client'

import { language, t } from '@rpg-ngn/i18n'
import type { ApiClient, BlessingState } from '@rpg-ngn/api-client'
import { packPrice } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { Panel } from '../Panel'
import { CatalogCheckout } from '../payments/Checkout'

/**
 * La Bendicion del bardo a la venta (30-09): 30 dias de turnos diarios.
 * Con una activa se puede sumar otros 30 hasta el tope de 180.
 */
export function BlessingOffer({ client }: { client: ApiClient }) {
  const [state, setState] = useState<BlessingState | null>(null)
  const [buying, setBuying] = useState(false)
  const load = useCallback(async () => {
    try {
      setState(await client.blessing())
    } catch {
      setState(null)
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load])

  if (!state) return null
  const price = packPrice(state.price)

  return (
    <Panel title={t('blessing.title')}>
      <p className="premise">{t('blessing.cardText', { first: 10, daily: state.turnsPerDay })}</p>
      {state.active && state.endsAt ? <p className="hint">{t('blessing.activeUntil', { date: new Date(state.endsAt).toLocaleDateString(language() === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'long' }) })}</p> : null}
      {state.canBuy ? (
        <button type="button" className="btn primary" onClick={() => setBuying(true)}>
          {state.active ? t('blessing.extend', { price }) : t('blessing.buy', { price })}
        </button>
      ) : (
        <p className="hint">{t('blessing.capReached')}</p>
      )}
      <p className="hint">{t('blessing.refundNote')}</p>
      {buying ? <CatalogCheckout client={client} product={{ kind: 'bendicion', name: t('blessing.title') }} onClose={() => setBuying(false)} onDone={load} /> : null}
    </Panel>
  )
}
