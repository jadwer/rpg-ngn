import type { ApiClient, SessionSummary, TableSummary } from '@rpg-ngn/api-client'
import type { LoadedPack } from '@rpg-ngn/content'
import { t, type Language } from '@rpg-ngn/i18n'
import { isValidSessionCode, pacingLine, sessionOptions, type TablePacing } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { DiceModePanel } from './DiceModePanel'
import { GmSettingsPanel } from './GmSettingsPanel'
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
  /** Idiomas que trae el mundo, para cambiar el de la mesa. */
  worldLanguages?: readonly Language[]
  busy: boolean
  onOpenSession: (code: string, note: string | null) => void
  onCloseSession: (cliffhanger: string | null) => void
  /** Reloj de la sesion abierta (docs/26, H1); null si la mesa juega libre. */
  pacing?: TablePacing | null | undefined
  onExtendSession?: (() => void) | undefined
  onWrapSession?: (() => void) | undefined
  /** Fin sin ver: hasta abrirlo no se abre la sesion siguiente (Gabino, 05-10). */
  pendingEndingLabel?: string | null | undefined
  onOpenEnding?: (() => void) | undefined
  onTableChanged: () => void
  onUnauthorized: () => void
}

/**
 * El anfitrion (docs/18, D-UX-7), dentro de su hoja de la barra del juego:
 * pestaña Sesion (premisa, abrir con codigo y nota, cerrar con cliffhanger),
 * que es lo de cada noche, y pestaña Ajustes de la mesa (dados, secretos del
 * pack y director), que casi no se toca. Invitar vive en Jugadores.
 */
export function HostPanel({ client, table, pack, session, suggestedCode, playedSessions = [], worldLanguages = ['es'], busy, onOpenSession, onCloseSession, pacing = null, onExtendSession, onWrapSession, pendingEndingLabel = null, onOpenEnding, onTableChanged, onUnauthorized }: Props) {
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
        {(['session', 'settings'] as const).map((tabKey) => (
          <Pressable key={tabKey} onPress={() => setTab(tabKey)} style={[styles.tab, tab === tabKey && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === tabKey }}>
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextOn]}>{tabKey === 'session' ? t('hostPanel.sesion') : t('hostPanel.ajustesDeLaMesa')}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'settings' ? (
        <>
          <DiceModePanel client={client} table={table} languages={worldLanguages} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
          <Panel title={t('hostPanel.directorDeJuego')}>
            <GmSettingsPanel client={client} table={table} busy={busy} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
          </Panel>
        </>
      ) : (
        <>
          <Panel title={session ? t('play.session', { code: session.code }) : t('hostPanel.abrirSesion')}>
            <Text style={styles.state}>{session ? t('mobile.hostPanel.abiertaLaMesaEsta') : t('play.noSessionDot')}</Text>
            {!session && pendingEndingLabel ? (
              <>
                <Text style={styles.hint}>{t('ending.closeFirst')}</Text>
                <Button label={pendingEndingLabel} primary onPress={() => onOpenEnding?.()} />
              </>
            ) : !session ? (
              <>
                {opciones.length > 0 ? (
                  <View style={styles.sessions}>
                    {opciones.map((o) => (
                      <Pressable key={o.code} onPress={() => setCode(o.code)} style={[styles.session, code === o.code && styles.sessionOn]} accessibilityRole="radio" accessibilityState={{ selected: code === o.code }}>
                        <Text style={styles.sessionTitle}>{`${o.code} · ${o.title}${o.played ? t('hostPanel.yaJugada') : ''}`}</Text>
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
                <TextInput value={note} onChangeText={setNote} placeholder={t('mobile.hostPanel.notaDeLaSesionEl')} placeholderTextColor={theme.colors.inkFaint} maxLength={120} style={styles.input} />
                <Button label={t('hostPanel.abrirSesion')} primary busy={busy} disabled={!isValidSessionCode(code)} onPress={() => onOpenSession(code, note.trim() || null)} />
              </>
            ) : (
              <>
                {pacing ? (
                  <>
                    <Text style={styles.hint}>{pacing.wrap ? t('ending.wrapAsked') : pacingLine(pacing)}</Text>
                    <View style={styles.row}>
                      <Button label={t('ending.extend')} small busy={busy} onPress={() => onExtendSession?.()} />
                      {pacing.wrap ? null : <Button label={t('ending.wrap')} small busy={busy} onPress={() => onWrapSession?.()} />}
                    </View>
                  </>
                ) : null}
                <TextInput value={cliffhanger} onChangeText={setCliffhanger} placeholder={t('mobile.hostPanel.cliffhangerParaLaProximaOpcional')} placeholderTextColor={theme.colors.inkFaint} style={styles.input} />
                <View style={styles.row}>
                  {!confirmClose ? (
                    <Button label={t('hostPanel.cerrarSesion')} busy={busy} onPress={() => setConfirmClose(true)} />
                  ) : (
                    <>
                      <Button
                        label={t('mobile.hostPanel.siCerrarYCongelar')}
                        primary
                        busy={busy}
                        onPress={() => {
                          setConfirmClose(false)
                          onCloseSession(cliffhanger.trim() || null)
                        }}
                      />
                      <Button label={t('mobile.hostPanel.noSeguir')} onPress={() => setConfirmClose(false)} />
                    </>
                  )}
                </View>
              </>
            )}
          </Panel>
          {table.premise ? (
            <Panel title={t('hostPanel.premisa')}>
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
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  input: { fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.ink, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  code: { width: 72, textAlign: 'center', fontFamily: theme.fonts.uiSemiBold, letterSpacing: 0.2 },
})
