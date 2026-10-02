import { ApiError, type ApiClient, type CreditBalance, type CreditPack } from '@rpg-ngn/api-client'
import { t } from '@rpg-ngn/i18n'
import { balanceText, bucketText, lowBalance } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { SectionTitle } from './Panel'
import { usePlay } from '../online/play'
import { openWebShop, PackCards } from './shop/ShopOffers'

interface Props {
  client: ApiClient
  onUnauthorized: () => void
}

/**
 * Creditos: cuanto le queda y como recargar.
 *
 * El pago **no ocurre en la app**: manda a nuestra web, no a una pagina de
 * Stripe, para que quien solo conoce el telefono descubra que hay un sitio
 * detras. Cobrar dentro de la app pide el SDK nativo de Stripe, que hoy
 * romperia Expo Go; queda pendiente para cuando haya builds propias.
 */
export function CreditsPanel({ client, onUnauthorized }: Props) {
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [ownKey, setOwnKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    // Con clave propia el cupo no se gasta y no se anuncia como su limite.
    void client.listOwnKeys().then(
      (keys) => setOwnKey(keys.some((k) => k.configured)),
      () => undefined,
    )
    void client.listCredits().then(
      ({ packs: lista, balance: saldo }) => {
        setPacks(lista)
        setBalance(saldo)
      },
      (caught: unknown) => {
        if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
        else setError(t('mobile.creditsPanel.balanceError'))
      },
    )
  }, [client, onUnauthorized])

  const play = usePlay()
  // Una compra de Google entregada recarga el saldo.
  useEffect(load, [load, play.deliveries])

  return (
    <View style={styles.card}>
      <SectionTitle>{t('creditsPanel.tusCreditos')}</SectionTitle>

      {balance && !ownKey && bucketText(balance) ? <Text style={styles.hint}>{bucketText(balance)}</Text> : null}
      {balance ? <Text style={lowBalance(balance, ownKey) ? styles.warn : styles.hint}>{balanceText(balance, ownKey)}</Text> : <Text style={styles.hint}>{t('creditsPanel.cargando')}</Text>}

      {packs.length > 0 ? (
        <>
          {play.available ? null : <Text style={styles.hint}>{t('shop.webNote')}</Text>}
          <PackCards packs={packs} onBuy={() => openWebShop(client)} />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 14, gap: 10 },
  // Titulo de seccion con la letra de titulos, no la del texto (Gabino, 26-09).
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  warn: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.goldBright },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
})
