import type { ApiClient, TableInvite } from '@rpg-ngn/api-client'
import { useCallback, useEffect, useState } from 'react'
import { Share, StyleSheet, Text, View } from 'react-native'
import { PUBLIC_SERVER_URL } from '../online/storage'
import { theme } from '../theme'
import { Button } from './Button'

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

  const web = (client.baseUrl || PUBLIC_SERVER_URL).replace(/\/+$/, '')

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
      await Share.share({ message: `Te invito a mi mesa "${tableName}" en rpg-worlds. Entra con este enlace: ${enlace}` })
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
    <View style={styles.card}>
      <Text style={styles.title}>Invitar con un enlace</Text>

      {enlace ? (
        <>
          <Text style={styles.hint}>Mándaselo por donde quieras. Quien lo abra entra a la mesa y elige personaje.</Text>
          <Text style={styles.enlace} selectable numberOfLines={2}>
            {enlace}
          </Text>
          <View style={styles.row}>
            <Button label="Compartir" primary onPress={() => void compartir()} />
            <Text style={styles.hint}>Guárdalo: por seguridad no se vuelve a mostrar.</Text>
          </View>
        </>
      ) : invite ? (
        <>
          <Text style={styles.hint}>
            Hay un enlace activo: {invite.seatsLeft === 1 ? 'queda un sitio' : `quedan ${invite.seatsLeft} sitios`} de {invite.maxUses}. Por seguridad no se puede volver a mostrar.
          </Text>
          <View style={styles.row}>
            <Button label="Crear uno nuevo" small busy={busy} onPress={() => void crear()} />
            <Button label="Desactivar" small disabled={busy} onPress={() => void cortar()} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.hint}>Crea un enlace y pásaselo a quien quieras. No hace falta que sean tus amigos aquí ni que te den su correo.</Text>
          <View style={styles.row}>
            <Button label="Crear enlace" primary busy={busy} onPress={() => void crear()} />
            <Text style={styles.hint}>Vale para 5 personas y caduca en una semana.</Text>
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 14, gap: 10, marginBottom: 14 },
  title: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.gold, letterSpacing: 0.5 },
  hint: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, flexShrink: 1 },
  enlace: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  error: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.danger },
})
