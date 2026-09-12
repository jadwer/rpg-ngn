import { ApiError, randomKey, type ApiClient, type SessionSummary, type TableMember, type TableSummary } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import type { LoadedPack } from '@rpg-ngn/content'
import { blocksFromApi, characterName, emptyTableText, groupBlocks, packSpeakerResolver, suggestedSessionCode, tableSubtitle, turnProgress, type ViewMode } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { BlockGroups } from '../../components/BlockGroups'
import { Button } from '../../components/Button'
import { HostPanel } from '../../components/HostPanel'
import { TtsBar } from '../../components/TtsBar'
import { TurnPanel } from '../../components/TurnPanel'
import { useTts } from '../../hooks/useTts'
import type { StoredUser } from '../../online/storage'
import { useTableState } from '../../online/useTableState'
import { onlineSheetEntries } from '../../sheets/entries'
import { theme } from '../../theme'
import { SheetsModal } from '../SheetsModal'

interface Props {
  client: ApiClient
  table: TableSummary
  me: TableMember
  user: StoredUser
  /** Pack empaquetado si coincide con el de la mesa; sin el no hay retratos ni nombres. */
  pack: LoadedPack | null
  onBack: () => void
  /** La mesa cambio (invitacion nueva): que el padre la recargue. */
  onTableChanged: () => void
  onUnauthorized: () => void
}

/** A menos de esta distancia del final se considera que el usuario esta abajo y la narracion baja sola. */
const NEAR_BOTTOM = 160

/**
 * La mesa en linea: polling del estado, las dos vistas sobre los bloques del
 * DM, cuadro de respuesta, cierre de turno, mando del anfitrion y fichas con
 * el estado vivo de las proyecciones. El DM es la IA; el anfitrion es la
 * persona con el asiento `host` de la API.
 */
export function TableScreen({ client, table, me, user, pack, onBack, onTableChanged, onUnauthorized }: Props) {
  const campaignId = table.campaignId
  const { snapshot, connection, error, refresh } = useTableState(client, table.id, onUnauthorized)

  const [mode, setMode] = useState<ViewMode>('narrative')
  const [sheetsOpen, setSheetsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [worldTime, setWorldTime] = useState<string | null>(null)
  const [projections, setProjections] = useState<{ seq: number | null; own: CharacterState | undefined; world: Record<string, CharacterState> | undefined }>({ seq: null, own: undefined, world: undefined })
  const [existingSessions, setExistingSessions] = useState<SessionSummary[]>([])

  const resolver = useMemo(() => packSpeakerResolver(pack), [pack])
  const envelopes = snapshot?.envelopes ?? EMPTY
  const blocks = useMemo(() => blocksFromApi(envelopes, resolver), [envelopes, resolver])
  const groups = useMemo(() => groupBlocks(blocks, mode), [blocks, mode])
  const tts = useTts(blocks, { autoRead: true })

  const turn = snapshot?.turn ?? null
  const viewer = useMemo(() => ({ role: snapshot?.viewer.role ?? me.role, characterId: snapshot?.viewer.characterId ?? me.characterId }), [snapshot?.viewer.role, snapshot?.viewer.characterId, me.role, me.characterId])
  const isHost = viewer.role === 'host'
  const progress = useMemo(() => turnProgress(turn, viewer), [turn, viewer])
  const nameOf = useCallback((id: string) => characterName(pack, id) ?? id, [pack])
  const sessionCode = snapshot?.session?.code ?? null
  const headSeq = snapshot?.campaign.headSeq ?? 0

  /** Clave de idempotencia estable por turno: reintentar el mismo envio no duplica. */
  const keyRef = useRef<{ turnId: number; key: string } | null>(null)
  if (turn && keyRef.current?.turnId !== turn.id) keyRef.current = { turnId: turn.id, key: `mobile-${turn.id}-${me.id}-${randomKey()}` }
  const idempotencyKey = keyRef.current?.key

  // Autoscroll al bloque nuevo, con pausa si el usuario subio a leer ("Bajar a lo nuevo", como en la web).
  const scrollRef = useRef<ScrollView>(null)
  const atBottomRef = useRef(true)
  const [behind, setBehind] = useState(false)
  const scrollToEnd = useCallback(() => {
    atBottomRef.current = true
    setBehind(false)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
  }, [])
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
    const distance = contentSize.height - contentOffset.y - layoutMeasurement.height
    atBottomRef.current = distance < NEAR_BOTTOM
    if (atBottomRef.current) setBehind(false)
  }
  useEffect(() => {
    if (blocks.length === 0 && !progress.narrating) return
    if (atBottomRef.current) scrollToEnd()
    else setBehind(true)
  }, [blocks.length, progress.narrating, scrollToEnd])

  // El momento del mundo vive en la proyeccion world; se refresca cuando avanza la campaña.
  useEffect(() => {
    if (!campaignId || !sessionCode) {
      setWorldTime(null)
      return
    }
    let alive = true
    void client.worldProjection(campaignId).then(
      (p) => {
        if (alive) setWorldTime(p.projection.worldTime)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, campaignId, sessionCode, headSeq])

  // Sesiones previas de la campaña, para sugerir el codigo de la siguiente (solo el anfitrion abre).
  useEffect(() => {
    if (!isHost || !campaignId) return
    let alive = true
    void client.listSessions(campaignId).then(
      (list) => {
        if (alive) setExistingSessions(list)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, campaignId, isHost, sessionCode])

  /** Errores de una accion: 401 al login, 409 refresca (el turno cambio), el resto se muestra. */
  const failed = (caught: unknown, fallback: string) => {
    if (caught instanceof ApiError) {
      if (caught.isUnauthorized) {
        onUnauthorized()
        return
      }
      if (caught.isConflict) refresh()
      setNotice(caught.message)
      return
    }
    setNotice(caught instanceof Error ? caught.message : fallback)
  }

  const act = async (action: () => Promise<void>, fallback: string): Promise<boolean> => {
    setBusy(true)
    setNotice(null)
    try {
      await action()
      refresh()
      return true
    } catch (caught) {
      failed(caught, fallback)
      return false
    } finally {
      setBusy(false)
    }
  }

  const respond = (text: string) => (turn ? act(() => client.respond(turn.id, text, idempotencyKey).then(() => undefined), 'No se pudo enviar la respuesta.') : Promise.resolve(false))
  const closeTurn = (force: boolean) => {
    if (turn) void act(() => client.closeTurn(turn.id, force).then(() => undefined), 'No se pudo cerrar el turno.')
  }
  const openSession = (code: string, note: string | null) => {
    if (campaignId) void act(() => client.openSession(campaignId, code, note ?? undefined).then(() => undefined), 'No se pudo abrir la sesión.')
  }
  const closeSession = (cliffhanger: string | null) => {
    const session = snapshot?.session
    if (!session) return
    void act(() => client.closeSession(session.id, cliffhanger ?? undefined).then(() => undefined), 'No se pudo cerrar la sesión.')
  }

  /** Fichas con estado vivo: la propia desde player:<id>, las ajenas desde world. Se piden al abrir el modal. */
  const openSheets = () => {
    setSheetsOpen(true)
    if (!campaignId) return
    const own = viewer.characterId ? client.playerProjection(campaignId, viewer.characterId).then((p) => p.projection.character, () => undefined) : Promise.resolve(undefined)
    const world = client.worldProjection(campaignId).then((p) => ({ seq: p.seq, characters: p.projection.characters }), () => null)
    void Promise.all([own, world]).then(([mine, w]) => setProjections({ seq: w?.seq ?? null, own: mine, world: w?.characters }))
  }
  const entries = useMemo(
    () => (pack ? onlineSheetEntries({ pack, sessionCode, members: table.members, viewerCharacterId: viewer.characterId, own: projections.own, world: projections.world }) : []),
    [pack, sessionCode, table.members, viewer.characterId, projections],
  )

  const suggestedCode = useMemo(() => suggestedSessionCode(pack, existingSessions), [pack, existingSessions])
  const connectionNotice = connection === 'offline' ? 'Sin conexión con el servidor; reintentando...' : error
  const sessionTitle = snapshot?.session ? (pack?.sessions.get(snapshot.session.code)?.title ?? `Sesión ${snapshot.session.code}`) : null
  const subtitle = tableSubtitle({ sessionTitle, loading: connection === 'loading', worldTime, turnNumber: turn?.number ?? null, pending: progress.pending.map(nameOf), narrating: progress.narrating })
  const emptyText = emptyTableText(!!snapshot?.session, isHost)

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Mesas</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {table.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Pressable onPress={openSheets} hitSlop={10} style={styles.sheetsButton}>
          <Text style={styles.sheetsText}>Fichas</Text>
        </Pressable>
      </View>

      {connectionNotice ? <Text style={styles.connection}>{connectionNotice}</Text> : null}

      <View style={styles.toolbar}>
        <View style={styles.segmented}>
          <Segment label="Narrativa" active={mode === 'narrative'} onPress={() => setMode('narrative')} />
          <Segment label="Diálogo" active={mode === 'dialogue'} onPress={() => setMode('dialogue')} />
        </View>
        <TtsBar tts={tts} autoRead />
      </View>

      <View style={styles.body}>
        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScroll={onScroll} scrollEventThrottle={100}>
          {blocks.length === 0 && connection !== 'loading' ? <Text style={styles.empty}>{emptyText}</Text> : null}
          <BlockGroups groups={groups} currentBlockId={tts.currentBlockId} onPressBlock={(id) => tts.start(id)} />
          {progress.narrating ? (
            <View style={styles.narrating}>
              <ActivityIndicator size="small" color={theme.colors.goldBright} />
              <Text style={styles.narratingText}>El DM está narrando...</Text>
            </View>
          ) : null}
        </ScrollView>
        {behind ? (
          <View style={styles.jump}>
            <Button label="Bajar a lo nuevo" primary small onPress={scrollToEnd} />
          </View>
        ) : null}
      </View>

      {isHost ? <HostPanel client={client} table={table} meId={user.id} pack={pack} session={snapshot?.session ?? null} loaded={snapshot !== null} suggestedCode={suggestedCode} busy={busy} onOpenSession={openSession} onCloseSession={closeSession} onTableChanged={onTableChanged} onUnauthorized={onUnauthorized} /> : null}
      <TurnPanel turn={turn} progress={progress} nameOf={nameOf} busy={busy} notice={notice} hasCharacter={viewer.characterId !== null} onRespond={respond} onClose={closeTurn} onFocusInput={scrollToEnd} />

      <SheetsModal visible={sheetsOpen} onClose={() => setSheetsOpen(false)} entries={entries} footer={projections.seq !== null ? `Estado vivo de la mesa, seq ${projections.seq}` : 'Sin estado de la API todavía: fichas del pack'} />
    </KeyboardAvoidingView>
  )
}

const EMPTY: never[] = []

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.panel, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  link: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.goldBright },
  titles: { flex: 1, alignItems: 'center' },
  title: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.gold, textAlign: 'center' },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim, textAlign: 'center' },
  sheetsButton: { borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  sheetsText: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.gold },
  connection: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.goldBright, backgroundColor: theme.colors.warning, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, overflow: 'hidden' },
  segment: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.colors.panel },
  segmentActive: { backgroundColor: theme.colors.gold },
  segmentText: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.gold },
  segmentTextActive: { color: theme.colors.bg },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  jump: { position: 'absolute', bottom: 12, alignSelf: 'center' },
  empty: { fontFamily: theme.fonts.serifItalic, fontSize: 15, lineHeight: 22, color: theme.colors.inkDim, textAlign: 'center', paddingVertical: 24 },
  narrating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  narratingText: { fontFamily: theme.fonts.serifItalic, fontSize: 15, color: theme.colors.goldBright },
})
