import type { ApiClient } from '@rpg-ngn/api-client'
import { t } from '@rpg-ngn/i18n'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { SectionTitle } from './Panel'
import { Button } from './Button'
import { Field } from './Field'

interface Props {
  client: ApiClient
  /** La cuenta ya no existe: borrar la sesion local sin pasar por la API. */
  onDeleted: () => void
}

type Preview = { canDelete: boolean; ownedTables: Array<{ id: string; name: string; played: boolean }> }

/**
 * Borrar la propia cuenta desde el telefono: el derecho de cancelacion del
 * aviso de privacidad, igual que en la web. Se explica lo que pasa de verdad
 * (la persona desaparece, lo escrito en las partidas se queda sin su nombre)
 * y, si es anfitriona de alguna mesa, cuales tiene que retirar antes.
 */
export function DeleteAccount({ client, onDeleted }: Props) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    void client.deletionPreview().then(
      (p) => {
        if (alive) setPreview(p)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [open, client])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await client.deleteAccount(password)
      onDeleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setBusy(false)
    }
  }

  const mesas = preview?.ownedTables ?? []

  return (
    <View style={styles.card}>
      <SectionTitle>{t('deleteAccount.borrarMiCuenta')}</SectionTitle>

      {!open ? (
        <>
          <Text style={styles.hint}>{t('mobile.deleteAccount.canDeleteAnytime')}</Text>
          <View style={styles.actions}>
            <Button label={t('deleteAccount.quieroBorrarMiCuenta')} small onPress={() => setOpen(true)} />
          </View>
        </>
      ) : (
        <>
          {preview === null ? <Text style={styles.hint}>{t('deleteAccount.comprobando')}</Text> : null}

          {mesas.length > 0 ? (
            <>
              <Text style={styles.hint}>{t('deleteAccount.antesTienesQueRetirar')}</Text>
              {mesas.map((m) => (
                <Text key={m.id} style={styles.mesa}>
                  {m.name}
                  {m.played ? t('deleteAccount.jugadaArchivala') : t('deleteAccount.sinJugarPuedesBorrarla')}
                </Text>
              ))}
            </>
          ) : null}

          {preview?.canDelete ? (
            <>
              <Text style={styles.aviso}>{`${t('deleteAccount.estoNoSePuede')} ${t('deleteAccount.desaparecenTuNombreTu')}`}</Text>
              <Field label={t('deleteAccount.escribeTuContrasenaPara')} value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.row}>
            {preview?.canDelete ? <Button label={t('mobile.deleteAccount.deleteForever')} primary busy={busy} disabled={password.length === 0} onPress={() => void submit()} /> : null}
            <Button
              label={t('deleteAccount.cancelar')}
              small
              disabled={busy}
              onPress={() => {
                setOpen(false)
                setPassword('')
                setError(null)
              }}
            />
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 14, gap: 12 },
  // Titulo de seccion con la letra de titulos, no la del texto (Gabino, 26-09).
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim, lineHeight: 18 },
  aviso: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.ink, lineHeight: 18 },
  mesa: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.ink, paddingLeft: 8 },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
  actions: { alignItems: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
})
