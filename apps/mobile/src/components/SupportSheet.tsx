import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type SupportTicket, type SupportTicketSummary } from '@rpg-ngn/api-client'
import { SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN, SUPPORT_REPLY_MIN, SUPPORT_SUBJECT_MAX, supportAbout, supportContext, supportDate, supportStatusLabel } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { Field } from './Field'
import { Panel } from './Panel'
import { SheetModal } from './SheetModal'

/** Lo que muestra la hoja: el formulario, la lista o un reporte. */
export type SupportView = { name: 'new' } | { name: 'list' } | { name: 'ticket'; id: number }

interface Props {
  client: ApiClient
  /** null: cerrada. */
  view: SupportView | null
  onView: (view: SupportView | null) => void
  /** Desde la mesa: se ofrece adjuntarla (el turno en curso si lo hay). */
  table?: { tableId: string | number; turnId?: number | null | undefined } | null | undefined
  /** De que pantalla se abrio, para el contexto del reporte. */
  screen: string
  onUnauthorized: () => void
}

/**
 * Soporte en la app (E11c), lo mismo que en la web en una sola hoja:
 * reportar un problema (desde la mesa la adjunta por defecto), "Mis reportes"
 * y la conversacion con el equipo, donde se responde.
 */
export function SupportSheet({ client, view, onView, table, screen, onUnauthorized }: Props) {
  const close = () => onView(null)
  const title = view?.name === 'new' ? t('support.reportarUnProblema') : t('support.misReportes')
  const back = view?.name === 'ticket' ? { label: t('support.volverAMisReportes'), onPress: () => onView({ name: 'list' }) } : undefined

  const fail = useCallback(
    (caught: unknown, set: (text: string) => void) => {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      // El ApiError ya trae el `error` del servidor o el primer mensaje de validacion.
      else set(caught instanceof Error ? caught.message : String(caught))
    },
    [onUnauthorized],
  )

  return (
    <SheetModal visible={view !== null} title={title} onClose={close} onBack={back?.onPress} back={back}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {view?.name === 'new' ? <NewReport client={client} table={table} screen={screen} fail={fail} onView={onView} /> : null}
        {view?.name === 'list' ? <MyReports client={client} fail={fail} onView={onView} /> : null}
        {view?.name === 'ticket' ? <Ticket client={client} id={view.id} fail={fail} /> : null}
      </ScrollView>
    </SheetModal>
  )
}

type Fail = (caught: unknown, set: (text: string) => void) => void

function NewReport({ client, table, screen, fail, onView }: Pick<Props, 'client' | 'table' | 'screen' | 'onView'> & { fail: Fail }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attach, setAttach] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<SupportTicket | null>(null)

  const length = message.trim().length
  const tooShort = length < SUPPORT_MESSAGE_MIN

  const submit = async () => {
    if (tooShort || busy) return
    setBusy(true)
    setError(null)
    try {
      const about = supportAbout(table ?? null, attach)
      const context = supportContext({ path: screen, app: `app-${Platform.OS}`, os: String(Platform.Version) })
      setSent(await client.createSupportTicket({ subject, message, context, ...(about ? { about } : {}) }))
    } catch (caught) {
      fail(caught, setError)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <Panel>
        <Text style={styles.ok} accessibilityLiveRegion="polite">
          {t('support.recibido')}
        </Text>
        <Button label={t('support.verReporte')} primary onPress={() => onView({ name: 'ticket', id: sent.id })} />
        <Button label={t('support.cerrar')} small onPress={() => onView(null)} />
      </Panel>
    )
  }

  return (
    <Panel>
      <Field label={t('support.asunto')} value={subject} onChangeText={setSubject} placeholder={t('support.asuntoPlaceholder')} maxLength={SUPPORT_SUBJECT_MAX} />
      <Field
        label={t('support.quepaso')}
        value={message}
        onChangeText={setMessage}
        placeholder={t('support.mensajePlaceholder')}
        maxLength={SUPPORT_MESSAGE_MAX}
        multiline
        textAlignVertical="top"
        style={styles.textarea}
        hint={tooShort ? t('support.minimoCaracteres', { min: SUPPORT_MESSAGE_MIN, count: length }) : undefined}
      />
      {table ? (
        <>
          <View style={styles.switchRow}>
            <Switch value={attach} onValueChange={setAttach} trackColor={{ true: theme.colors.accent, false: theme.colors.border }} />
            <Text style={styles.text}>{t('support.adjuntarEstaMesa')}</Text>
          </View>
          {attach ? <Text style={styles.hint}>{t('support.adjuntarHint')}</Text> : null}
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={busy ? t('support.enviando') : t('support.enviarReporte')} primary busy={busy} disabled={tooShort} onPress={() => void submit()} />
      <Button label={t('support.misReportes')} small onPress={() => onView({ name: 'list' })} />
    </Panel>
  )
}

function MyReports({ client, fail, onView }: Pick<Props, 'client' | 'onView'> & { fail: Fail }) {
  const [tickets, setTickets] = useState<SupportTicketSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void client.supportTickets().then(
      (loaded) => {
        if (alive) setTickets(loaded)
      },
      (caught: unknown) => {
        if (alive) fail(caught, setError)
      },
    )
    return () => {
      alive = false
    }
  }, [client, fail])

  return (
    <>
      <Text style={styles.intro}>{t('support.soporteTexto')}</Text>
      <Button label={t('support.reportarUnProblema')} primary onPress={() => onView({ name: 'new' })} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {tickets === null && !error ? <ActivityIndicator color={theme.colors.goldBright} /> : null}
      {tickets?.length === 0 ? (
        <Panel>
          <Text style={styles.text}>{t('support.vacio')}</Text>
          <Text style={styles.hint}>{t('support.vacioHint')}</Text>
        </Panel>
      ) : null}
      {tickets?.map((ticket) => (
        <Pressable key={ticket.id} accessibilityRole="button" onPress={() => onView({ name: 'ticket', id: ticket.id })} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text style={styles.rowTitle}>{ticket.subject}</Text>
          <View style={styles.meta}>
            <Text style={[styles.badge, ticket.status === 'waiting_user' && styles.badgeHot]}>{supportStatusLabel(ticket.status)}</Text>
            {ticket.lastMessageAt ? <Text style={styles.hint}>{t('support.ultimaActividad', { when: supportDate(ticket.lastMessageAt) })}</Text> : null}
          </View>
          {ticket.about?.label ? <Text style={styles.hint}>{t('support.sobre', { label: ticket.about.label })}</Text> : null}
        </Pressable>
      ))}
    </>
  )
}

function Ticket({ client, id, fail }: { client: ApiClient; id: number; fail: Fail }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setError(null)
    void client.supportTicket(id).then(
      (loaded) => {
        if (alive) setTicket(loaded)
      },
      (caught: unknown) => {
        if (alive) fail(caught, setError)
      },
    )
    return () => {
      alive = false
    }
  }, [client, id, fail])

  const tooShort = reply.trim().length < SUPPORT_REPLY_MIN

  const send = async () => {
    if (tooShort || busy) return
    setBusy(true)
    setReplyError(null)
    try {
      setTicket(await client.replySupportTicket(id, reply))
      setReply('')
    } catch (caught) {
      fail(caught, setReplyError)
    } finally {
      setBusy(false)
    }
  }

  if (error) return <Text style={styles.error}>{error}</Text>
  if (!ticket) return <ActivityIndicator color={theme.colors.goldBright} />

  const messages = ticket.messages.filter((m) => !m.internal)

  return (
    <>
      <Text style={styles.ticketTitle}>{ticket.subject}</Text>
      <View style={styles.meta}>
        <Text style={[styles.badge, ticket.status === 'waiting_user' && styles.badgeHot]}>
          {t('support.estado')}: {supportStatusLabel(ticket.status)}
        </Text>
        {ticket.createdAt ? <Text style={styles.hint}>{t('support.enviado', { when: supportDate(ticket.createdAt) })}</Text> : null}
      </View>
      {ticket.about?.label ? <Text style={styles.hint}>{t('support.sobre', { label: ticket.about.label })}</Text> : null}

      {messages.length === 0 ? <Text style={styles.hint}>{t('support.sinMensajes')}</Text> : null}
      {messages.map((m) => (
        <View key={m.id} style={[styles.message, m.fromTeam ? styles.fromTeam : styles.fromMe]}>
          <View style={styles.meta}>
            <Text style={[styles.author, m.fromTeam && styles.authorTeam]}>{m.fromTeam ? t('support.equipo') : t('support.tu')}</Text>
            {m.createdAt ? <Text style={styles.hint}>{supportDate(m.createdAt)}</Text> : null}
          </View>
          <Text style={styles.text}>{m.body}</Text>
        </View>
      ))}

      <Panel title={t('support.responder')}>
        <Field label={t('support.responder')} value={reply} onChangeText={setReply} placeholder={t('support.respuestaPlaceholder')} maxLength={SUPPORT_MESSAGE_MAX} multiline textAlignVertical="top" style={styles.textarea} />
        {ticket.status === 'resolved' ? <Text style={styles.hint}>{t('support.resueltoHint')}</Text> : null}
        {replyError ? <Text style={styles.error}>{replyError}</Text> : null}
        <Button label={busy ? t('support.enviando') : t('support.enviarRespuesta')} primary busy={busy} disabled={tooShort} onPress={() => void send()} />
      </Panel>
    </>
  )
}

const styles = StyleSheet.create({
  body: { gap: 14, padding: 16, paddingBottom: 40 },
  intro: { fontFamily: theme.fonts.serif, fontSize: 17, lineHeight: 24, color: theme.colors.ink },
  text: { flexShrink: 1, fontFamily: theme.fonts.ui, fontSize: 15, lineHeight: 21, color: theme.colors.ink },
  hint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  ok: { fontFamily: theme.fonts.ui, fontSize: 15, lineHeight: 21, color: theme.colors.success },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger },
  textarea: { minHeight: 140 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { gap: 6, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  pressed: { opacity: 0.75 },
  rowTitle: { fontFamily: theme.fonts.uiSemiBold, fontSize: 16, color: theme.colors.ink },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  badge: { fontFamily: theme.fonts.uiMedium, fontSize: 12, color: theme.colors.inkDim, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeHot: { color: theme.colors.goldBright, borderColor: theme.colors.gold },
  ticketTitle: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.ink },
  message: { gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  fromTeam: { borderColor: theme.colors.gold, backgroundColor: theme.colors.surface, marginRight: 24 },
  fromMe: { borderColor: theme.colors.border, backgroundColor: theme.colors.panel, marginLeft: 24 },
  author: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, color: theme.colors.inkDim },
  authorTeam: { color: theme.colors.goldBright },
})
