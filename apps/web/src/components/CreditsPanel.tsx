'use client'

import { ApiError, type ApiClient, type CreditBalance, type CreditPack } from '@rpg-ngn/api-client'
import { balanceText, buyablePacks, comingSoonPacks, lowBalance, packCharge, packPrice, packValue, purchaseBlessing } from '@rpg-ngn/ui-logic'
import { Elements } from '@stripe/react-stripe-js'
import { type Stripe } from '@stripe/stripe-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Blessing, PayForm, stripeFor } from './payments/Checkout'

/**
 * Creditos de prepago: saldo, paquetes y pago con Stripe.
 *
 * Los turnos NO se suman aqui: los acredita el webhook cuando Stripe
 * confirma el cobro. Esta pantalla solo arranca el pago y despues vuelve a
 * preguntar el saldo, que puede tardar un instante en reflejarse.
 */
export function CreditsPanel({ client, unauthorized }: { client: ApiClient; unauthorized: (notice?: string) => void }) {
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [ownKey, setOwnKey] = useState(false)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [buying, setBuying] = useState<{ pack: CreditPack; clientSecret: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // La compra que acaba de salir bien: se celebra en una tarjeta propia.
  const [blessed, setBlessed] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const { packs: lista, balance: saldo, publishableKey } = await client.listCredits()
      setPacks(lista)
      setBalance(saldo)
      // Con clave propia el cupo no se gasta: el saldo se cuenta igual pero no
      // se anuncia como el limite de lo que puede jugar.
      setOwnKey((await client.listOwnKeys().catch(() => [])).some((k) => k.configured))
      // La clave la manda la API: cambiar de cuenta de Stripe no obliga a
      // reconstruir la web.
      if (publishableKey) setStripePromise((actual) => actual ?? stripeFor(publishableKey))
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) return unauthorized()
      setError('No se pudieron cargar los créditos.')
    }
  }, [client, unauthorized])

  useEffect(() => {
    void load()
  }, [load])

  // Un doble clic no puede iniciar dos pagos: el estado de React llega tarde
  // para el segundo clic, la referencia no.
  const startingRef = useRef(false)
  const start = async (pack: CreditPack) => {
    if (startingRef.current) return
    startingRef.current = true
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const purchase = await client.buyCredits(pack.id)
      setBuying({ pack, clientSecret: purchase.clientSecret })
    } catch (e) {
      if (e instanceof ApiError && e.isUnauthorized) return unauthorized()
      setError(e instanceof ApiError ? e.message : 'No se pudo iniciar el pago.')
    } finally {
      startingRef.current = false
      setBusy(false)
    }
  }

  const done = async (turns: number) => {
    setBuying(null)
    setNotice(null)
    setBlessed(turns)
    await load()
    // El saldo lo sube el webhook de Stripe, que llega uno o varios segundos
    // despues: se vuelve a mirar un par de veces para que se vea sin recargar.
    for (const wait of [2500, 6000]) {
      await new Promise((resolve) => setTimeout(resolve, wait))
      await load()
    }
  }

  const venta = useMemo(() => buyablePacks(packs), [packs])
  const pronto = useMemo(() => comingSoonPacks(packs), [packs])

  return (
    <section className="card stack" style={{ marginTop: 16 }}>
      <div className="label" style={{ marginTop: 0 }}>
        Tus créditos
      </div>

      {balance ? (
        <p className={lowBalance(balance, ownKey) ? 'error' : 'hint'} style={{ margin: 0 }}>
          {balanceText(balance, ownKey)}
        </p>
      ) : (
        <p className="hint">Cargando…</p>
      )}

      {blessed !== null ? <Blessing {...purchaseBlessing(blessed)} onClose={() => setBlessed(null)} /> : null}

      {buying && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret: buying.clientSecret, locale: 'es' }}>
          <PayForm
            summary={`${buying.pack.name}: ${packPrice(buying.pack)} por ${buying.pack.turns} turnos.`}
            payLabel={packCharge(buying.pack)}
            pendingNote="El pago quedó pendiente. Si se completa, los turnos se añadirán solos."
            onPaid={() => done(buying.pack.turns)}
            onCancel={() => setBuying(null)}
            onError={setError}
          />
        </Elements>
      ) : (
        <>
          {venta.map((pack) => (
            <div key={pack.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--line, #3a2f24)', paddingTop: 12 }}>
              <span>
                <strong>{pack.name}</strong> <span className="hint">{packValue(pack)}</span>
                <br />
                <span className="hint">{pack.description}</span>
              </span>
              <button type="button" className="btn primary" onClick={() => void start(pack)} disabled={busy}>
                {packPrice(pack)}
              </button>
            </div>
          ))}

          {pronto.length > 0 ? (
            <>
              <div className="label" style={{ marginTop: 8 }}>
                Más adelante
              </div>
              {pronto.map((pack) => (
                <div key={pack.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', opacity: 0.6 }}>
                  <span>
                    <strong>{pack.name}</strong> <span className="hint">{pack.description}</span>
                  </span>
                  <button type="button" className="btn" disabled>
                    {packPrice(pack)}
                  </button>
                </div>
              ))}
            </>
          ) : null}
        </>
      )}

      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="hint">{notice}</p> : null}
    </section>
  )
}
