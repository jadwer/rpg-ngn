import type { ApiClient, TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { isValidSessionCode } from '../online/tableSetup'
import { theme } from '../theme'
import { Button } from './Button'
import { InvitePanel } from './InvitePanel'

interface Props {
  client: ApiClient
  table: TableSummary
  meId: string
  pack: LoadedPack | null
  session: { code: string; status: string } | null
  /** true cuando ya llego el primer estado de la mesa (para abrir el mando solo si no hay sesion). */
  loaded: boolean
  /** Codigo sugerido: la siguiente sesion de la campaña. */
  suggestedCode: string
  busy: boolean
  onOpenSession: (code: string, note: string | null) => void
  onCloseSession: (cliffhanger: string | null) => void
  onTableChanged: () => void
  onUnauthorized: () => void
}

/**
 * Mando del anfitrion: abrir la sesion (codigo de tres digitos y una nota
 * que el DM tambien recibe), cerrarla con cliffhanger, e invitar (en un
 * modal, que en el telefono no cabe debajo de la narracion). El DM es la
 * IA; el anfitrion dirige la mesa.
 */
export function HostPanel({ client, table, meId, pack, session, loaded, suggestedCode, busy, onOpenSession, onCloseSession, onTableChanged, onUnauthorized }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [code, setCode] = useState(suggestedCode)
  const [note, setNote] = useState('')
  const [cliffhanger, setCliffhanger] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const decidedRef = useRef(false)

  useEffect(() => {
    setCode(suggestedCode)
  }, [suggestedCode])

  // Al entrar: abierto si no hay sesion (hay que abrirla), plegado si ya se juega.
  useEffect(() => {
    if (!loaded || decidedRef.current) return
    decidedRef.current = true
    setExpanded(!session)
  }, [loaded, session])

  // Al cerrarse la sesion, el mando vuelve a mostrarse para abrir la siguiente.
  useEffect(() => {
    if (loaded && !session) setExpanded(true)
  }, [loaded, session])

  return (
    <View style={styles.panel}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.headerRow} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Text style={styles.title}>Mando del anfitrión</Text>
        <Text style={styles.state} numberOfLines={1}>
          {session ? `Sesión ${session.code} abierta` : 'Sin sesión abierta'}
        </Text>
        <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.form}>
          {table.premise ? (
            <Text style={styles.premise} numberOfLines={3}>
              {table.premise}
            </Text>
          ) : null}
          {!session ? (
            <>
              <View style={styles.row}>
                <TextInput value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" maxLength={3} placeholder="003" placeholderTextColor={theme.colors.inkFaint} style={[styles.input, styles.code]} />
                <TextInput value={note} onChangeText={setNote} placeholder="Nota de la sesión; el DM la recibe" placeholderTextColor={theme.colors.inkFaint} maxLength={120} style={[styles.input, styles.grow]} />
              </View>
              <View style={styles.row}>
                <Button label="Abrir sesión" primary busy={busy} disabled={!isValidSessionCode(code)} onPress={() => onOpenSession(code, note.trim() || null)} />
                <Button label="Invitados" onPress={() => setInviting(true)} />
              </View>
            </>
          ) : (
            <>
              <TextInput value={cliffhanger} onChangeText={setCliffhanger} placeholder="Cliffhanger para la próxima (opcional)" placeholderTextColor={theme.colors.inkFaint} style={styles.input} />
              <View style={styles.row}>
                {!confirmClose ? (
                  <>
                    <Button label="Cerrar sesión" busy={busy} onPress={() => setConfirmClose(true)} />
                    <Button label="Invitados" onPress={() => setInviting(true)} />
                  </>
                ) : (
                  <>
                    <Button
                      label="Sí, cerrar y congelar"
                      primary
                      busy={busy}
                      onPress={() => {
                        setConfirmClose(false)
                        onCloseSession(cliffhanger.trim() || null)
                      }}
                    />
                    <Button label="No, seguir" onPress={() => setConfirmClose(false)} />
                  </>
                )}
              </View>
            </>
          )}
        </View>
      ) : null}

      <Modal visible={inviting} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setInviting(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={styles.modalSide} />
            <Text style={styles.modalTitle}>Invitados</Text>
            <Pressable onPress={() => setInviting(false)} hitSlop={10} style={styles.modalSide}>
              <Text style={styles.modalLink}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <InvitePanel client={client} table={table} meId={meId} pack={pack} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.panel2, paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold },
  state: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  chevron: { color: theme.colors.gold, fontSize: 14 },
  form: { gap: 8 },
  premise: { fontFamily: theme.fonts.serifItalic, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  code: { width: 72, textAlign: 'center', fontFamily: theme.fonts.display, letterSpacing: 2 },
  grow: { flex: 1 },
  modal: { flex: 1, backgroundColor: theme.colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.panel },
  modalSide: { minWidth: 56, alignItems: 'flex-end' },
  modalTitle: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold, letterSpacing: 1 },
  modalLink: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.goldBright },
  modalBody: { padding: 16, paddingBottom: 48 },
})
