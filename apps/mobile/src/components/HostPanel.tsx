import type { ApiClient, SessionSummary, TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { isValidSessionCode, sessionOptions } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { DiceModePanel } from './DiceModePanel'
import { DmSettingsPanel } from './DmSettingsPanel'

interface Props {
  client: ApiClient
  table: TableSummary
  pack: LoadedPack | null
  session: { code: string; status: string } | null
  /** Codigo sugerido: la siguiente sesion de la campaña. */
  suggestedCode: string
  /** Sesiones que ESTA campaña ya jugo, para marcarlas en el selector. */
  playedSessions?: readonly SessionSummary[]
  busy: boolean
  onOpenSession: (code: string, note: string | null) => void
  onCloseSession: (cliffhanger: string | null) => void
  onTableChanged: () => void
  onUnauthorized: () => void
}

/**
 * El anfitrion (docs/18, D-UX-7), dentro de su hoja de la barra del juego:
 * pestaña Sesion (premisa, abrir con codigo y nota, cerrar con cliffhanger),
 * que es lo de cada noche, y pestaña Ajustes de la mesa (dados, secretos del
 * pack y director), que casi no se toca. Invitar vive en Jugadores.
 */
export function HostPanel({ client, table, pack, session, suggestedCode, playedSessions = [], busy, onOpenSession, onCloseSession, onTableChanged, onUnauthorized }: Props) {
  const [tab, setTab] = useState<'session' | 'settings'>('session')
  const [code, setCode] = useState(suggestedCode)
  const [note, setNote] = useState('')
  const [cliffhanger, setCliffhanger] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const opciones = sessionOptions(pack, playedSessions)
  const elegida = opciones.find((o) => o.code === code) ?? null

  useEffect(() => {
    setCode(suggestedCode)
  }, [suggestedCode])

  return (
    <View style={styles.form}>
      <View style={styles.tabs}>
        {(['session', 'settings'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t === 'session' ? 'Sesión' : 'Ajustes de la mesa'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'settings' ? (
        <>
          <DiceModePanel client={client} table={table} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
          <Text style={styles.title}>Director de juego</Text>
          <DmSettingsPanel client={client} table={table} busy={busy} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
        </>
      ) : (
        <>
          <Text style={styles.state}>{session ? `Sesión ${session.code} abierta` : 'Sin sesión abierta'}</Text>
          {table.premise ? <Text style={styles.premise}>{table.premise}</Text> : null}
          {!session ? (
            <>
              {opciones.length > 0 ? (
                <View style={styles.sessions}>
                  {opciones.map((o) => (
                    <Pressable key={o.code} onPress={() => setCode(o.code)} style={[styles.session, code === o.code && styles.sessionOn]} accessibilityRole="radio" accessibilityState={{ selected: code === o.code }}>
                      <Text style={styles.sessionTitle}>{`${o.code} · ${o.title}${o.played ? ' (ya jugada)' : ''}`}</Text>
                    </Pressable>
                  ))}
                  {elegida ? <Text style={styles.sessionHint}>{elegida.summary}</Text> : null}
                </View>
              ) : (
                <TextInput value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" maxLength={3} placeholder="001" placeholderTextColor={theme.colors.inkFaint} style={[styles.input, styles.code]} />
              )}
              <TextInput value={note} onChangeText={setNote} placeholder="Nota de la sesión; el DM la recibe" placeholderTextColor={theme.colors.inkFaint} maxLength={120} style={styles.input} />
              <Button label="Abrir sesión" primary busy={busy} disabled={!isValidSessionCode(code)} onPress={() => onOpenSession(code, note.trim() || null)} />
            </>
          ) : (
            <>
              <TextInput value={cliffhanger} onChangeText={setCliffhanger} placeholder="Cliffhanger para la próxima (opcional)" placeholderTextColor={theme.colors.inkFaint} style={styles.input} />
              <View style={styles.row}>
                {!confirmClose ? (
                  <Button label="Cerrar sesión" busy={busy} onPress={() => setConfirmClose(true)} />
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
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sessions: { gap: 6 },
  session: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  sessionOn: { borderColor: theme.colors.accentBright, backgroundColor: theme.colors.panel2 ?? theme.colors.panel },
  sessionTitle: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.ink },
  sessionHint: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkDim },
  panel: { borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.panel2, paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.inkDim },
  state: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  chevron: { color: theme.colors.gold, fontSize: 14 },
  form: { gap: 10 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' },
  tab: { paddingHorizontal: 14, paddingVertical: 8 },
  tabOn: { backgroundColor: theme.colors.accent },
  tabText: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.inkDim },
  tabTextOn: { color: '#ffffff' },
  premise: { fontFamily: theme.fonts.serifItalic, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  code: { width: 72, textAlign: 'center', fontFamily: theme.fonts.display, letterSpacing: 2 },
  grow: { flex: 1 },
  modal: { flex: 1, backgroundColor: theme.colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.panel },
  modalSide: { minWidth: 56, alignItems: 'flex-end' },
  modalTitle: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.ink, letterSpacing: 1 },
  modalLink: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.cyan },
  modalBody: { padding: 16, paddingBottom: 48 },
})
