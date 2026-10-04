import { t } from '@rpg-ngn/i18n'
import type { ApiClient, ChronicleShare } from '@rpg-ngn/api-client'
import { chronicleUrl } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { webOriginOf } from '../online/server-url'
import { theme } from '../theme'
import { Button } from './Button'

/**
 * Los accesos a la historia de una mesa ya compartida, en Opciones de cada
 * mesa (paridad con la web, 02-10): leerla, verla como presentacion (se abre
 * en el navegador para grabarla) y "Generar video", que anuncia el plan Oro.
 * Si aun no se comparte, dice donde se pide.
 */
export function ChronicleShortcuts({ client, tableId }: { client: ApiClient; tableId: string }) {
  const [share, setShare] = useState<ChronicleShare | null | undefined>(undefined)
  const [gold, setGold] = useState(false)

  useEffect(() => {
    let alive = true
    client.chronicleShare(tableId).then(
      (s) => alive && setShare(s),
      () => alive && setShare(null),
    )
    return () => {
      alive = false
    }
  }, [client, tableId])

  if (share === undefined) return null
  if (!share?.public) return <Text style={styles.hint}>{t('chroniclePage.compartirParaVer')}</Text>

  const url = chronicleUrl(webOriginOf(client.baseUrl), share.token)
  return (
    <View style={styles.wrap}>
      <Button label={t('chroniclePage.leerLaHistoria')} small onPress={() => void Linking.openURL(url)} />
      <Button label={t('chroniclePage.presentacionVertical')} small onPress={() => void Linking.openURL(`${url}/presentacion?formato=vertical`)} />
      <Button label={t('chroniclePage.presentacionHorizontal')} small onPress={() => void Linking.openURL(`${url}/presentacion?formato=horizontal`)} />
      {/* Sin video de un mundo derivado de obra ajena (Gabino, 03-10). */}
      {share.derived ? null : <Button label={t('chroniclePage.generarVideo')} small onPress={() => setGold((v) => !v)} />}
      {gold && !share.derived ? <Text style={styles.gold}>{t('chroniclePage.videoOro')}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, alignItems: 'flex-start', marginBottom: 10 },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim, marginBottom: 10 },
  gold: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, color: theme.colors.goldBright },
})
