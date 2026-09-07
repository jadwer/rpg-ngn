import { ApiError, type ApiClient, type TableMember, type TableSummary } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import type { LoadedPack } from '@rpg-ngn/content'
import { blocksFromApi, groupBlocks, packSpeakerResolver, turnProgress, type ViewMode } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BlockGroups } from '../../components/BlockGroups'
import { DmPanel } from '../../components/DmPanel'
import { NarratorBanner } from '../../components/NarratorBanner'
import { TtsBar } from '../../components/TtsBar'
import { TurnPanel } from '../../components/TurnPanel'
import { useTts } from '../../hooks/useTts'
import { useTableState } from '../../online/useTableState'
import { sessionList } from '../../pack/offline'
import { onlineSheetEntries } from '../../sheets/entries'
import { hasSpanishVoice } from '../../speech/expoSpeechEngine'
import { theme } from '../../theme'
import { SheetsModal } from '../SheetsModal'

interface Props {
  client: ApiClient
  table: TableSummary
  me: TableMember
  /** Pack empaquetado si coincide con el de la mesa; sin el no hay retratos ni nombres. */
  pack: LoadedPack | null
  onBack: () => void
  onUnauthorized: () => void
}

/**
 * La mesa en linea: polling del estado, las dos vistas sobre los bloques del
 * DM, cuadro de respuesta, cierre de turno, mando del DM y fichas con el
 * estado vivo de las proyecciones.
 */
export function TableScreen({ client, table, me, pack, onBack, onUnauthorized }: Props) {
  const campaignId = table.campaignId
  const { snapshot, connection, error, refresh } = useTableState(client, table.id, onUnauthorized)

  const [mode, setMode] = useState<ViewMode>('narrative')
  const [autoRead, setAutoRead] = useState(false)
  const [sheetsOpen, setSheetsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [spanishVoice, setSpanishVoice] = useState<boolean | null>(null)
  const [projections, setProjections] = useState<{ seq: number | null; own: CharacterState | undefined; world: Record<string, CharacterState> | undefined }>({ seq: null, own: undefined, world: undefined })

  const resolver = useMemo(() => packSpeakerResolver(pack), [pack])
  const envelopes = snapshot?.envelopes ?? EMPTY
  const blocks = useMemo(() => blocksFromApi(envelopes, resolver), [envelopes, resolver])
  const groups = useMemo(() => groupBlocks(blocks, mode), [blocks, mode])
  const tts = useTts(blocks, { autoRead })

  const turn = snapshot?.turn ?? null
  const viewer = useMemo(() => ({ role: me.role, characterId: me.characterId }), [me.role, me.characterId])
  const progress = useMemo(() => turnProgress(turn, viewer), [turn, viewer])
  const nameOf = useCallback((id: string) => pack?.characters.get(id)?.name ?? id, [pack])

  const scrollRef = useRef<ScrollView>(null)
  useEffect(() => {
    if (blocks.length > 0) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
  }, [blocks.length])

  useEffect(() => {
    let alive = true
    void hasSpanishVoice().then((value) => {
      if (alive) setSpanishVoice(value)
    })
    return () => {
      alive = false
    }
  }, [])

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

  const respond = (text: string) => (turn ? act(() => client.respond(turn.id, text).then(() => undefined), 'No se pudo enviar la respuesta.') : Promise.resolve(false))
  const closeTurn = (force: boolean) => {
    if (turn) void act(() => client.closeTurn(turn.id, force).then(() => undefined), 'No se pudo cerrar el turno.')
  }
  const openSession = (code: string, worldTime: string | null) => {
    if (campaignId) void act(() => client.openSession(campaignId, code, worldTime ?? undefined).then(() => undefined), 'No se pudo abrir la sesión.')
  }
  const closeSession = (cliffhanger: string | null) => {
    if (!campaignId) return
    void act(async () => {
      const open = (await client.listSessions(campaignId)).find((s) => s.status === 'open')
      if (!open) throw new Error('No hay sesión abierta que cerrar.')
      await client.closeSession(open.id, cliffhanger ?? undefined)
    }, 'No se pudo cerrar la sesión.')
  }

  /** Fichas con estado vivo: la propia desde player:<id>, las ajenas desde world. Se piden al abrir el modal. */
  const openSheets = () => {
    setSheetsOpen(true)
    if (!campaignId) return
    const own = me.characterId ? client.playerProjection(campaignId, me.characterId).then((p) => p.projection.character, () => undefined) : Promise.resolve(undefined)
    const world = client.worldProjection(campaignId).then((p) => ({ seq: p.seq, characters: p.projection.characters }), () => null)
    void Promise.all([own, world]).then(([mine, w]) => setProjections({ seq: w?.seq ?? null, own: mine, world: w?.characters }))
  }
  const entries = useMemo(
    () => (pack ? onlineSheetEntries({ pack, sessionCode: snapshot?.session?.code ?? null, members: table.members, viewerCharacterId: me.characterId, own: projections.own, world: projections.world }) : []),
    [pack, snapshot?.session?.code, table.members, me.characterId, projections],
  )

  const suggestedCode = useMemo(() => (pack ? (sessionList(pack).find((s) => s.status === 'planned')?.id ?? '001') : '001'), [pack])
  const connectionNotice = connection === 'offline' ? 'Sin conexión con el servidor; reintentando...' : error

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Mesas</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {table.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {snapshot?.session ? `${pack?.sessions.get(snapshot.session.code)?.title ?? `Sesión ${snapshot.session.code}`}` : connection === 'loading' ? 'Conectando...' : 'Sin sesión abierta'}
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
        <TtsBar tts={tts} autoRead={{ value: autoRead, onChange: setAutoRead }} />
        <NarratorBanner localSpeaking={tts.state.status === 'speaking'} spanishVoice={spanishVoice} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {blocks.length === 0 ? <Text style={styles.empty}>{snapshot?.session ? 'El DM todavía no ha narrado. Cuando la mesa cierre el primer turno, la narración aparece aquí.' : 'Cuando el DM abra la sesión, el primer turno aparece aquí.'}</Text> : null}
        <BlockGroups groups={groups} currentBlockId={tts.currentBlockId} onPressBlock={(id) => tts.start(id)} />
      </ScrollView>

      {me.role === 'dm' ? <DmPanel session={snapshot?.session ?? null} suggestedCode={suggestedCode} busy={busy} onOpenSession={openSession} onCloseSession={closeSession} /> : null}
      <TurnPanel turn={turn} progress={progress} nameOf={nameOf} busy={busy} notice={notice} onRespond={respond} onClose={closeTurn} />

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
  link: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.accent },
  titles: { flex: 1, alignItems: 'center' },
  title: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.gold, textAlign: 'center' },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim, textAlign: 'center' },
  sheetsButton: { borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  sheetsText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.gold },
  connection: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.accent, backgroundColor: theme.colors.warning, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 12 },
  toolbar: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' },
  segment: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: theme.colors.panel },
  segmentActive: { backgroundColor: theme.colors.gold },
  segmentText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.gold },
  segmentTextActive: { color: theme.colors.panel },
  content: { padding: 16, paddingBottom: 24 },
  empty: { fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 22, color: theme.colors.inkDim, fontStyle: 'italic', textAlign: 'center', paddingVertical: 24 },
})
