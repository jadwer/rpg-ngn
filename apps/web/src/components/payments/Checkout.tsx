'use client'

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
        Continuar la aventura
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
      onError(error.message ?? 'El pago no se pudo completar.')
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
          {busy ? 'Pagando…' : `Pagar ${payLabel}`}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancelar
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
        setError(e instanceof ApiError ? e.message : 'No se pudo iniciar el pago.')
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
    <div className="recap-overlay" role="dialog" aria-modal="true" aria-label={product.kind === 'pase' ? 'Comprar el pase' : `Comprar ${product.name}`}>
      <div className="recap-card checkout-card">
        {paid ? (
          <Blessing {...blessing} onClose={onClose} />
        ) : (
          <>
            <h2>{product.kind === 'pase' ? `Pase de ${product.name}` : product.name}</h2>
            {purchase && stripe ? (
              <Elements stripe={stripe} options={{ clientSecret: purchase.clientSecret, locale: 'es' }}>
                <PayForm
                  summary={product.kind === 'pase' ? 'Pago único para toda la temporada.' : 'Pago único; el mundo queda en tu cuenta.'}
                  payLabel={packCharge(purchase)}
                  pendingNote="El pago quedó pendiente. Si se completa, lo verás en tu cuenta solo."
                  onPaid={paidNow}
                  onCancel={onClose}
                  onError={setError}
                />
              </Elements>
            ) : !error ? (
              <p className="hint">Preparando el pago…</p>
            ) : null}
            {error ? (
              <>
                <p className="error">{error}</p>
                {!purchase ? (
                  <button type="button" className="btn" onClick={onClose}>
                    Cerrar
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
