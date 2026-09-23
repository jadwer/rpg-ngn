import type { ApiClient, TableSummary } from '@rpg-ngn/api-client'
import { retirementText, tableRetirement } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  client: ApiClient
  table: TableSummary
  host: boolean
  /** La lista se recarga sola despues de cada accion. */
  onChanged: () => void
}

/**
 * Retirar una mesa desde el telefono, con las mismas reglas que en la web:
 * **una partida jugada se archiva, no se borra**, porque lo que paso en ella
 * tambien es de los demas jugadores. Borrar de verdad solo si la mesa nunca
 * se jugo. El invitado no borra nada: se va.
 *
 * Vive dentro de la tarjeta de la mesa, que es un Pressable: en React Native
 * el Pressable interno se queda el toque, asi que tocar aqui no abre la mesa.
 */
export function RetireTable({ client, table, host, onChanged }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const retirement = tableRetirement(table, { host, played: table.headSeq > 0 })
  const texto = retirementText(retirement)

  const act = async (accion: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await accion()
      setOpen(false)
      setConfirmando(false)
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={styles.abrir}>
        <Text style={styles.abrirTexto}>{retirement.archived ? 'Recuperar' : 'Retirar'}</Text>
      </Pressable>
    )
  }

  return (
    <Pressable onPress={() => undefined} style={styles.panel}>
      <Text style={styles.hint}>{texto.hint}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.row}>
        {retirement.canArchive ? <Button label={texto.archive} small busy={busy} onPress={() => void act(() => client.archiveTable(table.id, !retirement.archived))} /> : null}
        {retirement.canLeave ? <Button label="Salir de la mesa" small busy={busy} onPress={() => void act(() => client.leaveTable(table.id))} /> : null}
        <Button
          label="Cancelar"
          small
          disabled={busy}
          onPress={() => {
            setOpen(false)
            setConfirmando(false)
          }}
        />
      </View>

      {retirement.canDelete ? (
        <View style={styles.borrar}>
          {confirmando ? (
            <>
              <Text style={styles.hint}>{retirement.deleteWarning}</Text>
              <Button label="Sí, borrar" small busy={busy} onPress={() => void act(() => client.deleteTable(table.id))} />
            </>
          ) : (
            <Pressable onPress={() => setConfirmando(true)} hitSlop={8} disabled={busy}>
              <Text style={styles.borrarTexto}>Borrar del todo</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  abrir: { alignSelf: 'flex-start', marginTop: 6 },
  abrirTexto: { fontFamily: theme.fonts.uiMedium, fontSize: 12, color: theme.colors.cyan, letterSpacing: 0.2 },
  panel: { marginTop: 8, padding: 10, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, backgroundColor: theme.colors.panel2, gap: 8 },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  borrar: { borderTopWidth: 1, borderTopColor: theme.colors.borderSoft, paddingTop: 8, gap: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  borrarTexto: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.accentBright, textDecorationLine: 'underline' },
})
