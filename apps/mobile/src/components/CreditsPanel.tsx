import { ApiError, type ApiClient, type CreditBalance, type CreditPack } from '@rpg-ngn/api-client'
import { balanceText, buyablePacks, lowBalance, packPrice, packValue, topUpUrl } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  client: ApiClient
  /** El servidor con el que habla la app; de ahi sale la web para recargar. */
  serverUrl: string
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
export function CreditsPanel({ client, serverUrl, onUnauthorized }: Props) {
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
        else setError('No se pudo leer tu saldo.')
      },
    )
  }, [client, onUnauthorized])

  useEffect(load, [load])

  const venta = useMemo(() => buyablePacks(packs), [packs])
  const url = useMemo(() => topUpUrl(serverUrl), [serverUrl])

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Tus créditos</Text>

      {balance ? <Text style={lowBalance(balance, ownKey) ? styles.warn : styles.hint}>{balanceText(balance, ownKey)}</Text> : <Text style={styles.hint}>Cargando…</Text>}

      {venta.length > 0 ? (
        <>
          <Text style={styles.hint}>Recargas desde la web, con la misma cuenta:</Text>
          {venta.map((pack) => (
            <Text key={pack.id} style={styles.pack}>
              {pack.name}, {packPrice(pack)}: {packValue(pack)}
            </Text>
          ))}
        </>
      ) : null}

      {url ? (
        <View style={styles.actions}>
          <Button label="Recargar en la web" primary onPress={() => void Linking.openURL(url)} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 14, gap: 10 },
  // Titulo de seccion con la letra de titulos, no la del texto (Gabino, 26-09).
  label: { fontFamily: theme.fonts.display, fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  warn: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.goldBright },
  pack: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.ink },
  actions: { alignItems: 'flex-start' },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
})
