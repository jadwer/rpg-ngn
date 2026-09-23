import type { ApiClient, ChronicleShare } from '@rpg-ngn/api-client'
import { chronicleStatus, chronicleUrl } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { Share, StyleSheet, Switch, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  client: ApiClient
  tableId: string
  /** Origen de la web publica, donde se lee la cronica. */
  webOrigin: string
}

/**
 * Compartir la historia de la mesa (docs/24, seccion 4), igual que en la web:
 * cualquiera lo pide, cada quien acepta, el enlace funciona cuando aceptan
 * todos y cualquiera lo retira.
 */
export function ChroniclePanel({ client, tableId, webOrigin }: Props) {
  const [share, setShare] = useState<ChronicleShare | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [anonymize, setAnonymize] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    void client.chronicleShare(tableId).then(
      (s) => {
        setShare(s)
        setLoaded(true)
      },
      () => setLoaded(true),
    )
  }, [client, tableId])
  useEffect(load, [load])

  const act = async (fn: () => Promise<ChronicleShare | null>) => {
    setBusy(true)
    setError(null)
    try {
      setShare(await fn())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <Text style={styles.hint}>Cargando...</Text>
  const status = chronicleStatus(share)
  const url = share ? chronicleUrl(webOrigin, share.token) : null

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{status.text}</Text>
      {status.state === 'none' ? (
        <>
          <View style={styles.row}>
            <Switch value={anonymize} onValueChange={setAnonymize} trackColor={{ true: theme.colors.accent, false: theme.colors.border }} />
            <Text style={styles.text}>Sin los nombres de quienes jugamos</Text>
          </View>
          <Button label="Pedir compartir la historia" small busy={busy} onPress={() => void act(() => client.shareChronicle(tableId, { anonymize }))} />
        </>
      ) : null}
      {share && status.canConsent ? <Button label="Acepto que se comparta" small primary busy={busy} onPress={() => void act(() => client.consentChronicle(tableId))} /> : null}
      {share && url ? <Button label="Compartir el enlace" small onPress={() => void Share.share({ message: url })} /> : null}
      {share ? (
        <Button
          label="Retirar el enlace"
          small
          busy={busy}
          onPress={() =>
            void act(async () => {
              await client.withdrawChronicle(tableId)
              return null
            })
          }
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hint: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.inkDim, lineHeight: 20 },
  text: { fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.ink },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger },
})
