import type { ApiClient, InvitePreview, TableSummary } from '@rpg-ngn/api-client'
import { inviteTokenFrom } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { Field } from './Field'

interface Props {
  client: ApiClient
  /** Abre la mesa recien aceptada, como si se hubiera tocado en la lista. */
  onOpen: (table: TableSummary) => void
  onRefresh: () => void
}

/**
 * Entrar a una mesa con un enlace, desde el telefono (docs/18, D-UX-1).
 *
 * En el telefono el enlace llega por WhatsApp y se pega aqui; vale la URL
 * entera o solo el token. Antes de entrar se enseña a que mesa invita y
 * quien, igual que en la pagina `/unirse` de la web. Es la paridad de la
 * funcion que quita los seis pasos de antes.
 */
export function JoinByLink({ client, onOpen, onRefresh }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = inviteTokenFrom(text)

  const buscar = async () => {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      setPreview(await client.invitePreview(token))
    } catch (caught) {
      setPreview(null)
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const entrar = async () => {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const tableId = await client.acceptInvite(token)
      const table = await client.table(tableId)
      onRefresh()
      setOpen(false)
      setText('')
      setPreview(null)
      onOpen(table)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <View style={styles.row}>
        <Button label="Tengo un enlace" small onPress={() => setOpen(true)} />
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Entrar con un enlace</Text>
      <Text style={styles.hint}>Pega aquí el enlace que te mandaron. Vale el enlace entero o solo el código.</Text>
      <Field
        label="Enlace"
        value={text}
        onChangeText={(t) => {
          setText(t)
          setPreview(null)
          setError(null)
        }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://rpg-worlds…/unirse/…"
        onSubmitEditing={() => void buscar()}
      />
      {text.trim() && !token ? <Text style={styles.error}>Eso no parece un enlace de mesa. Comprueba que lo copiaste entero.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {preview ? (
        <View style={styles.preview}>
          <Text style={styles.mesa}>{preview.tableName}</Text>
          {preview.hostName ? <Text style={styles.hint}>Te invita {preview.hostName}.</Text> : null}
          <Text style={styles.hint}>
            {preview.alreadyMember ? 'Ya eres parte de esta mesa.' : preview.seatsLeft === 1 ? 'Queda un sitio libre.' : `Quedan ${preview.seatsLeft} sitios libres.`}
          </Text>
        </View>
      ) : null}

      <View style={styles.row}>
        {preview ? (
          <Button label={preview.alreadyMember ? 'Ir a la mesa' : 'Entrar a la mesa'} primary busy={busy} onPress={() => void entrar()} />
        ) : (
          <Button label="Buscar la mesa" primary busy={busy} disabled={!token} onPress={() => void buscar()} />
        )}
        <Button
          label="Cancelar"
          small
          disabled={busy}
          onPress={() => {
            setOpen(false)
            setText('')
            setPreview(null)
            setError(null)
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 14, gap: 10 },
  title: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.ink, letterSpacing: 0.5 },
  hint: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.danger },
  preview: { borderTopWidth: 1, borderTopColor: theme.colors.borderSoft, paddingTop: 10, gap: 4 },
  mesa: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.ink },
})
