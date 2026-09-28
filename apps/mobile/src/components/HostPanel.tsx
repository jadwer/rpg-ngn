import type { ApiClient, SessionSummary, TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { isValidSessionCode, sessionOptions } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { DiceModePanel } from './DiceModePanel'
import { DmSettingsPanel } from './DmSettingsPanel'
import { Panel } from './Panel'

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
          <Panel title="Director de juego">
            <DmSettingsPanel client={client} table={table} busy={busy} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
          </Panel>
        </>
      ) : (
        <>
          <Panel title={session ? `Sesión ${session.code}` : 'Abrir sesión'}>
            <Text style={styles.state}>{session ? 'Abierta: la mesa está jugando.' : 'Sin sesión abierta.'}</Text>
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
                  <TextInput
                    value={code}
                    onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 3))}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="001"
                    placeholderTextColor={theme.colors.inkFaint}
                    style={[styles.input, styles.code]}
                  />
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
          </Panel>
          {table.premise ? (
            <Panel title="Premisa">
              <Text style={styles.premise}>{table.premise}</Text>
            </Panel>
          ) : null}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sessions: { gap: 6 },
  session: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  sessionOn: { borderColor: theme.colors.accentBright, backgroundColor: theme.colors.panel2 ?? theme.colors.panel },
  sessionTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 14, color: theme.colors.ink },
  sessionHint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  state: { flex: 1, fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  form: { gap: 14 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' },
  tab: { paddingHorizontal: 14, paddingVertical: 8 },
  tabOn: { backgroundColor: theme.colors.accent },
  tabText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 12, color: theme.colors.inkDim },
  tabTextOn: { color: '#ffffff' },
  premise: { fontFamily: theme.fonts.serifItalic, fontSize: 16, lineHeight: 22, color: theme.colors.ink },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: { fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  code: { width: 72, textAlign: 'center', fontFamily: theme.fonts.uiSemiBold, letterSpacing: 0.2 },
})
