import type { ApiClient, TableInvite } from '@rpg-ngn/api-client'
import { t } from '@rpg-ngn/i18n'
import { useCallback, useEffect, useState } from 'react'
import { Share, StyleSheet, Text, View } from 'react-native'
import { webOriginOf } from '../online/server-url'
import { theme } from '../theme'
import { Button } from './Button'
import { Panel } from './Panel'

interface Props {
  client: ApiClient
  tableId: string
  tableName: string
}

/**
 * El enlace con el que entra la gente a la mesa, desde el telefono (docs/18,
 * D-UX-1). Aqui no se copia: se **comparte** con la hoja nativa, que es como
 * la gente manda cosas por WhatsApp. El enlace apunta a la web publica,
 * porque quien lo recibe puede no tener la app; la web ya sabe recibirlo.
 *
 * El token solo se ve al crearlo, porque en el servidor vive hasheado.
 */
export function InviteLink({ client, tableId, tableName }: Props) {
  const [invite, setInvite] = useState<TableInvite | null>(null)
  const [enlace, setEnlace] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(() => {
    void client.currentInvite(tableId).then(setInvite, () => undefined)
  }, [client, tableId])
  useEffect(cargar, [cargar])

  // La pagina /unirse es de la web; con la API en /movil, el enlace iba a un 404.
  const web = webOriginOf(client.baseUrl)

  const crear = async () => {
    setBusy(true)
    setError(null)
    try {
      const creado = await client.createInvite(tableId)
      setInvite(creado)
      if (creado.token) setEnlace(`${web}/unirse/${creado.token}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const compartir = async () => {
    if (!enlace) return
    try {
      await Share.share({ message: t('mobile.inviteLink.teInvitoAMiMesa', { tableName, enlace }) })
    } catch {
      // La hoja de compartir cancelada no es un error.
    }
  }

  const cortar = async () => {
    setBusy(true)
    setError(null)
    try {
      await client.revokeInvite(tableId)
      setInvite(null)
      setEnlace(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={t('inviteLink.invitarConUnEnlace')}>
      {enlace ? (
        <>
          <Text style={styles.hint}>{t('inviteLink.mandaseloPorDondeQuieras')}</Text>
          <Text style={styles.enlace} selectable numberOfLines={2}>
            {enlace}
          </Text>
          <View style={styles.row}>
            <Button label={t('mobile.inviteLink.compartir')} primary onPress={() => void compartir()} />
            <Text style={styles.hint}>{t('inviteLink.guardaloPorSeguridadNo')}</Text>
          </View>
        </>
      ) : invite ? (
        <>
          <Text style={styles.hint}>
            {t('mobile.inviteLink.hayUnEnlaceActivo', {
              seats: invite.seatsLeft === 1 ? t('mobile.inviteLink.quedaUnSitio') : t('mobile.inviteLink.quedanSitios', { count: invite.seatsLeft }),
              max: invite.maxUses,
            })}
          </Text>
          <View style={styles.row}>
            <Button label={t('inviteLink.crearUnoNuevo')} small busy={busy} onPress={() => void crear()} />
            <Button label={t('inviteLink.desactivar')} small disabled={busy} onPress={() => void cortar()} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.hint}>{t('inviteLink.creaUnEnlaceY')}</Text>
          <View style={styles.row}>
            <Button label={t('guide.crearEnlace')} primary onPress={() => void crear()} />
            <Text style={styles.hint}>{t('mobile.inviteLink.valeParaPersonas')}</Text>
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Panel>
  )
}

const styles = StyleSheet.create({
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim, flexShrink: 1 },
  enlace: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
})
