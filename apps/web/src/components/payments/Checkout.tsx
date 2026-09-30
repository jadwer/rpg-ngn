'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type CatalogPurchase } from '@rpg-ngn/api-client'
import { catalogBlessing, packCharge } from '@rpg-ngn/ui-logic'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Isotipo } from '../Brand'

// Stripe.js se carga una vez por clave, aunque se abran varios pagos.
const stripes = new Map<string, Promise<Stripe | null>>()
export function stripeFor(key: string): Promise<Stripe | null> {
  let promise = stripes.get(key)
  if (!promise) {
    promise = loadStripe(key)
    stripes.set(key, promise)
  }
  return promise
}

/** La compra salio bien: una tarjeta con tono de cronica, no una linea gris. */
export function Blessing({ title, text, farewell, onClose }: { title: string; text: string; farewell: string; onClose: () => void }) {
  return (
    <div className="blessing" role="status">
      <Isotipo className="sello" height={56} />
      <p className="titulo">{title}</p>
      <p className="texto">{text}</p>
      <p className="despedida">{farewell}</p>
      <button type="button" className="btn primary" onClick={onClose}>
        {t('checkout.continuarLaAventura')}
      </button>
    </div>
  )
}

/**
 * El formulario de tarjeta. Vive dentro de <Elements> porque usa su contexto.
 * Solo confirma el pago: lo comprado lo entrega el webhook de Stripe.
 */
export function PayForm({
  summary,
  payLabel,
  pendingNote,
  onPaid,
  onCancel,
  onError,
}: {
  summary: string
  payLabel: string
  pendingNote: string
  onPaid: () => Promise<void> | void
  onCancel: () => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!stripe || !elements || busy) return

    setBusy(true)
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    setBusy(false)

    if (error) {
      onError(error.message ?? t('play.paymentIncomplete'))
      return
    }
    if (paymentIntent?.status === 'succeeded') {
      await onPaid()
      return
    }
    onError(pendingNote)
  }

  return (
    <form className="stack" onSubmit={(e) => void submit(e)}>
      <p className="hint" style={{ margin: 0 }}>
        {summary}
      </p>
      <PaymentElement />
      <div className="row">
        <button type="submit" className="btn primary" disabled={!stripe || busy}>
          {busy ? t('play.paying') : t('play.pay', { amount: payLabel })}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          {t('checkout.cancelar')}
        </button>
      </div>
    </form>
  )
}

export type CatalogProduct = { kind: 'pase'; name: string } | { kind: 'mundo'; id: string; name: string }

/**
 * Comprar el pase de temporada o un mundo (E9 3c y 3d) en una ventana sobre
 * la pagina: arranca el pago, pide la tarjeta y, al confirmarse, la tarjeta
 * dorada. `onDone` vuelve a cargar el catalogo, que cambia cuando el webhook
 * entrega lo comprado (uno o varios segundos despues).
 */
export function CatalogCheckout({ client, product, onClose, onDone }: { client: ApiClient; product: CatalogProduct; onClose: () => void; onDone: () => Promise<void> }) {
  const [purchase, setPurchase] = useState<CatalogPurchase | null>(null)
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      try {
        const { publishableKey } = await client.listCredits()
        if (!publishableKey) throw new Error('sin clave')
        setStripe(stripeFor(publishableKey))
        setPurchase(product.kind === 'pase' ? await client.buySeasonPass() : await client.buyWorld(product.id))
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('play.paymentStartFailed'))
      }
    })()
  }, [client, product])

  const paidNow = async () => {
    setPaid(true)
    for (const wait of [0, 2500, 6000]) {
      await new Promise((resolve) => setTimeout(resolve, wait))
      await onDone()
    }
  }

  const blessing = catalogBlessing(product.kind, product.name)
  return (
    <div className="recap-overlay" role="dialog" aria-modal="true" aria-label={product.kind === 'pase' ? t('play.buyPass') : t('play.buyItem', { name: product.name })}>
      <div className="recap-card checkout-card">
        {paid ? (
          <Blessing {...blessing} onClose={onClose} />
        ) : (
          <>
            <h2>{product.kind === 'pase' ? t('play.passOf', { name: product.name }) : product.name}</h2>
            {purchase && stripe ? (
              <Elements stripe={stripe} options={{ clientSecret: purchase.clientSecret, locale: 'es' }}>
                <PayForm
                  summary={product.kind === 'pase' ? t('play.oneTimeSeason') : t('play.oneTimeWorld')}
                  payLabel={packCharge(purchase)}
                  pendingNote="El pago quedó pendiente. Si se completa, lo verás en tu cuenta solo."
                  onPaid={paidNow}
                  onCancel={onClose}
                  onError={setError}
                />
              </Elements>
            ) : !error ? (
              <p className="hint">{t('checkout.preparandoElPago')}</p>
            ) : null}
            {error ? (
              <>
                <p className="error">{error}</p>
                {!purchase ? (
                  <button type="button" className="btn" onClick={onClose}>
                    {t('checkout.cerrar')}
                  </button>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
