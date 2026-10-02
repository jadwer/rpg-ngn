import type { ApiClient } from '@rpg-ngn/api-client'
import type * as ExpoIap from 'expo-iap'
import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Platform } from 'react-native'

/**
 * Compras con Google Play en la app (Gabino, 02-10): solo paquetes de turnos
 * y la Bendicion, 15% arriba del precio de la web. El pase y los mundos no se
 * venden aqui.
 *
 * El orden importa: Google cobra, la app manda el comprobante al servidor,
 * el servidor lo confirma con Google y entrega, y solo entonces la app lo
 * consume (`finishTransaction`) para que se pueda volver a comprar. Si la
 * app se cierra a medias, al volver se reintentan las compras sin consumir
 * (Google reembolsa solo lo que no se reconoce en tres dias).
 *
 * `expo-iap` es nativo: en Expo Go o en la web no existe, y la app sigue sin
 * tienda de Google.
 */
type Iap = typeof ExpoIap

function loadIap(): Iap | null {
  if (Platform.OS !== 'android') return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-iap') as Iap
  } catch {
    return null
  }
}

/** El id del producto en Google para un paquete de la web (`turnos-60` -> `turnos_60`). */
export function playIdOfPack(packId: string): string {
  return packId.replace(/-/g, '_')
}

export const PLAY_BLESSING = 'bendicion_30'

export interface PlayStore {
  /** Hay tienda de Google y respondio con los productos. */
  available: boolean
  /** Sube cada vez que se entrega una compra: los paneles recargan saldo y Bendicion. */
  deliveries: number
  /** Precio que muestra Google (en la moneda del telefono) por id de producto. */
  prices: Record<string, string>
  /** El producto que se esta comprando, o null. */
  buying: string | null
  error: string | null
  buy: (productId: string) => Promise<void>
}

function usePlayStoreState(client: ApiClient): PlayStore {
  const iap = useRef<Iap | null>(null)
  const accountId = useRef<string | null>(null)
  const [available, setAvailable] = useState(false)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState(0)

  /** Entrega y consume una compra; si el servidor no la acepta, se queda sin consumir para reintentar. */
  const redeem = useCallback(
    async (purchase: { productId: string; purchaseToken?: string | null }) => {
      const lib = iap.current
      if (!lib || !purchase.purchaseToken) return
      await client.redeemPlayPurchase(purchase.productId, purchase.purchaseToken)
      await lib.finishTransaction({ purchase: purchase as Parameters<Iap['finishTransaction']>[0]['purchase'], isConsumable: true })
      setDeliveries((n) => n + 1)
    },
    [client],
  )

  useEffect(() => {
    const lib = loadIap()
    if (!lib) return
    iap.current = lib
    let alive = true
    const subs: Array<{ remove: () => void }> = []

    void (async () => {
      try {
        const config = await client.playConfig()
        accountId.current = config.accountId
        await lib.initConnection()
        subs.push(
          lib.purchaseUpdatedListener((purchase) => {
            void redeem(purchase).then(
              () => setBuying(null),
              (caught: unknown) => {
                setBuying(null)
                setError(caught instanceof Error ? caught.message : String(caught))
              },
            )
          }),
          lib.purchaseErrorListener((failure) => {
            setBuying(null)
            if (!lib.isUserCancelledError(failure)) setError(failure.message)
          }),
        )
        const products = (await lib.fetchProducts({ skus: config.products, type: 'in-app' })) ?? []
        if (!alive) return
        const found: Record<string, string> = {}
        for (const product of products) found[product.id] = product.displayPrice
        setPrices(found)
        setAvailable(Object.keys(found).length > 0)
        // Lo que se cobro y no se entrego (la app se cerro a medias): se reintenta.
        for (const pending of await lib.getAvailablePurchases()) await redeem(pending).catch(() => undefined)
      } catch {
        // Sin tienda de Google (o sin productos aun): la app sigue sin vender aqui.
      }
    })()

    return () => {
      alive = false
      for (const sub of subs) sub.remove()
      void lib.endConnection().catch(() => undefined)
    }
  }, [client, redeem])

  const buy = useCallback(async (productId: string) => {
    const lib = iap.current
    if (!lib || !accountId.current) return
    setError(null)
    setBuying(productId)
    try {
      await lib.requestPurchase({ request: { google: { skus: [productId], obfuscatedAccountId: accountId.current } }, type: 'in-app' })
    } catch (caught) {
      setBuying(null)
      if (!lib.isUserCancelledError(caught as never)) setError(caught instanceof Error ? caught.message : String(caught))
    }
  }, [])

  return { available, deliveries, prices, buying, error, buy }
}

const NO_PLAY: PlayStore = { available: false, deliveries: 0, prices: {}, buying: null, error: null, buy: async () => undefined }
const PlayContext = createContext<PlayStore>(NO_PLAY)

/** Una sola conexion con Google por sesion: dos escuchas entregarian dos veces cada compra. */
export function PlayStoreProvider({ client, children }: { client: ApiClient; children: ReactNode }) {
  const store = usePlayStoreState(client)
  return createElement(PlayContext.Provider, { value: store }, children)
}

export function usePlay(): PlayStore {
  return useContext(PlayContext)
}
