import type { ApiClient, ChronicleShare } from '@rpg-ngn/api-client'
import { t } from '@rpg-ngn/i18n'
import { chronicleStatus, chronicleUrl } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { Linking, Share, StyleSheet, Switch, Text, View } from 'react-native'
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
 * todos y cualquiera lo retira. Publicarla en Comunidad (02-10) es aparte
 * del enlace y todos lo aceptan sabiendolo.
 */
export function ChroniclePanel({ client, tableId, webOrigin }: Props) {
  const [share, setShare] = useState<ChronicleShare | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [anonymize, setAnonymize] = useState(false)
  const [listed, setListed] = useState(false)
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

  if (!loaded) return <Text style={styles.hint}>{t('chroniclePanel.cargando')}</Text>
  const status = chronicleStatus(share)
  const url = share ? chronicleUrl(webOrigin, share.token) : null

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{status.text}</Text>
      {status.state === 'none' ? (
        <>
          <View style={styles.row}>
            <Switch value={anonymize} onValueChange={setAnonymize} trackColor={{ true: theme.colors.accent, false: theme.colors.border }} />
            <Text style={styles.text}>{t('chroniclePanel.sinLosNombresDe')}</Text>
          </View>
          <View style={styles.row}>
            <Switch value={listed} onValueChange={setListed} trackColor={{ true: theme.colors.accent, false: theme.colors.border }} />
            <Text style={styles.text}>{t('chroniclePanel.publicarEnComunidad')}</Text>
          </View>
          {listed ? <Text style={styles.hint}>{t('chroniclePanel.publicarHint')}</Text> : null}
          <Button label={t('chroniclePanel.pedirCompartirLaHistoria')} small busy={busy} onPress={() => void act(() => client.shareChronicle(tableId, { anonymize, listed }))} />
        </>
      ) : null}
      {share?.listed ? <Text style={styles.hint}>{share.public ? t('chroniclePanel.publicada') : t('chroniclePanel.seraPublicada')}</Text> : null}
      {share && !share.listed ? (
        <>
          <Text style={styles.hint}>{t('chroniclePanel.publicarHint')}</Text>
          <Button label={t('chroniclePanel.publicarEnComunidad')} small busy={busy} onPress={() => void act(() => client.shareChronicle(tableId, { anonymize: share.anonymize, listed: true }))} />
        </>
      ) : null}
      {share && status.canConsent ? <Button label={t('chroniclePanel.aceptoQueSeComparta')} small primary busy={busy} onPress={() => void act(() => client.consentChronicle(tableId))} /> : null}
      {share && url ? <Button label={t('mobile.chroniclePanel.shareLink')} small onPress={() => void Share.share({ message: url })} /> : null}
      {/* Ya compartida: leerla o verla como presentacion en el navegador para grabarla (02-10). */}
      {share?.public && url ? (
        <>
          <Button label={t('chroniclePage.presentacionVertical')} small onPress={() => void Linking.openURL(`${url}/presentacion?formato=vertical`)} />
          <Button label={t('chroniclePage.presentacionHorizontal')} small onPress={() => void Linking.openURL(`${url}/presentacion?formato=horizontal`)} />
        </>
      ) : null}
      {share ? (
        <Button
          label={t('chroniclePanel.retirarElEnlace')}
          small
          danger
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
