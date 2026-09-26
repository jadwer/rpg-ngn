import type { ApiClient } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
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
      <Text style={styles.label}>Borrar mi cuenta</Text>

      {!open ? (
        <>
          <Text style={styles.hint}>Puedes borrar tu cuenta cuando quieras. Lo que escribiste en las partidas se conserva sin tu nombre, porque también es de quienes jugaron contigo.</Text>
          <View style={styles.actions}>
            <Button label="Quiero borrar mi cuenta" small onPress={() => setOpen(true)} />
          </View>
        </>
      ) : (
        <>
          {preview === null ? <Text style={styles.hint}>Comprobando...</Text> : null}

          {mesas.length > 0 ? (
            <>
              <Text style={styles.hint}>Antes tienes que retirar las mesas donde eres anfitrión, para no dejarlas sin quien abra las sesiones:</Text>
              {mesas.map((m) => (
                <Text key={m.id} style={styles.mesa}>
                  {m.name}
                  {m.played ? ' (jugada: archívala)' : ' (sin jugar: puedes borrarla)'}
                </Text>
              ))}
            </>
          ) : null}

          {preview?.canDelete ? (
            <>
              <Text style={styles.aviso}>Esto no se puede deshacer. Desaparecen tu nombre, tu correo y tus créditos sin usar. Lo que escribiste en tus partidas se queda, sin tu nombre.</Text>
              <Field label="Escribe tu contraseña para confirmar" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.row}>
            {preview?.canDelete ? <Button label="Borrar mi cuenta para siempre" primary busy={busy} disabled={password.length === 0} onPress={() => void submit()} /> : null}
            <Button
              label="Cancelar"
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
  label: { fontFamily: theme.fonts.display, fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim, lineHeight: 18 },
  aviso: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.ink, lineHeight: 18 },
  mesa: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.ink, paddingLeft: 8 },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
  actions: { alignItems: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
})
