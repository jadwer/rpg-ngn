'use client'

import { ApiError, memberOf, randomKey, type ApiClient, type TableSummary, type TableViewer } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import type { LoadedPack } from '@rpg-ngn/content'
import { blocksFromApi, groupBlocks, packSpeakerResolver, turnProgress, type ViewMode } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { characterName } from '../lib/pack'
import { sheetEntries } from '../lib/sheets'
import { storage, type StoredUser } from '../lib/storage'
import { suggestedSessionCode } from '../lib/tableSetup'
import { useTableState } from '../lib/useTableState'
import { useTts } from '../lib/useTts'
import { Blocks } from './Blocks'
import { HostPanel } from './HostPanel'
import { SheetsPanel } from './SheetsPanel'
import { TtsBar } from './TtsBar'
import { statusLine, TurnPanel } from './TurnPanel'

interface Props {
  client: ApiClient
  table: TableSummary
  user: StoredUser
  pack: LoadedPack | null
  onTableChanged: () => void
  onUnauthorized: () => void
}

const EMPTY: never[] = []

/**
 * La mesa: polling del estado, las dos vistas sobre los bloques del DM,
 * cuadro de respuesta, cierre de turno, mando del anfitrion, fichas con el
 * estado vivo, voz y modo pantalla para compartir.
 */
export function TableScreen({ client, table, user, pack, onTableChanged, onUnauthorized }: Props) {
  const campaignId = table.campaignId
  const { snapshot, connection, error, refresh } = useTableState(client, table.id, onUnauthorized)

  const [mode, setMode] = useState<ViewMode>('narrative')
  const [screen, setScreen] = useState(false)
  const [sheetsOpen, setSheetsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [worldTime, setWorldTime] = useState<string | null>(null)
  const [voiceNoticeDismissed, setVoiceNoticeDismissed] = useState(true)
  const [projections, setProjections] = useState<{ seq: number | null; own: CharacterState | undefined; world: Record<string, CharacterState> | undefined }>({ seq: null, own: undefined, world: undefined })
  const [existingCodes, setExistingCodes] = useState<Array<{ id: string; code: string; status: string; openedSeq: number | null; closedSeq: number | null }>>([])

  const resolver = useMemo(() => packSpeakerResolver(pack), [pack])
  const envelopes = snapshot?.envelopes ?? EMPTY
  const blocks = useMemo(() => blocksFromApi(envelopes, resolver), [envelopes, resolver])
  const groups = useMemo(() => groupBlocks(blocks, mode), [blocks, mode])
  const tts = useTts(blocks)

  const fallbackMember = memberOf(table, user.id)
  const viewer: TableViewer = snapshot?.viewer ?? { memberId: Number(fallbackMember?.id ?? 0), role: fallbackMember?.role ?? 'player', characterId: fallbackMember?.characterId ?? null }
  const isHost = viewer.role === 'dm'
  const turn = snapshot?.turn ?? null
  const progress = useMemo(() => turnProgress(turn, { role: viewer.role, characterId: viewer.characterId }), [turn, viewer.role, viewer.characterId])
  const nameOf = useCallback((id: string) => characterName(pack, id) ?? id, [pack])
  const headSeq = snapshot?.campaign.headSeq ?? 0
  const sessionCode = snapshot?.session?.code ?? null

  /** Clave de idempotencia estable por turno: reintentar el mismo envio no duplica. */
  const keyRef = useRef<{ turnId: number; key: string } | null>(null)
  if (turn && keyRef.current?.turnId !== turn.id) keyRef.current = { turnId: turn.id, key: `web-${turn.id}-${viewer.memberId}-${randomKey()}` }
  const idempotencyKey = keyRef.current?.key ?? ''

  useEffect(() => {
    setVoiceNoticeDismissed(storage.voiceNoticeSeen())
  }, [])

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

  // Fichas con estado vivo: la propia desde player:<id>, las ajenas desde world. Se piden al abrir y cuando avanza la campaña.
  useEffect(() => {
    if (!sheetsOpen || !campaignId) return
    let alive = true
    const own = viewer.characterId ? client.playerProjection(campaignId, viewer.characterId).then((p) => p.projection.character, () => undefined) : Promise.resolve(undefined)
    const world = client.worldProjection(campaignId).then((p) => ({ seq: p.seq, characters: p.projection.characters }), () => null)
    void Promise.all([own, world]).then(([mine, w]) => {
      if (alive) setProjections({ seq: w?.seq ?? null, own: mine, world: w?.characters })
    })
    return () => {
      alive = false
    }
  }, [client, campaignId, sheetsOpen, viewer.characterId, headSeq])

  // Sesiones previas de la campaña, para sugerir el codigo de la siguiente (solo el anfitrion abre).
  useEffect(() => {
    if (!isHost || !campaignId) return
    let alive = true
    void client.listSessions(campaignId).then(
      (list) => {
        if (alive) setExistingCodes(list)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, campaignId, isHost, sessionCode])

  // Tecla F alterna el modo pantalla; Esc lo cierra. No mientras se escribe.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      if (typing) return
      if (event.key === 'f' || event.key === 'F') setScreen((v) => !v)
      if (event.key === 'Escape') setScreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Autoscroll al bloque nuevo, con pausa si el usuario subio a leer.
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const [behind, setBehind] = useState(false)
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = distance < 160
    if (atBottomRef.current) setBehind(false)
  }
  const scrollToEnd = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    atBottomRef.current = true
    setBehind(false)
  }, [])
  const firstScrollRef = useRef(true)
  useEffect(() => {
    if (blocks.length === 0) return
    if (firstScrollRef.current) {
      firstScrollRef.current = false
      setTimeout(() => scrollToEnd(false), 30)
      return
    }
    if (atBottomRef.current) setTimeout(() => scrollToEnd(true), 30)
    else setBehind(true)
  }, [blocks.length, scrollToEnd])
  useEffect(() => {
    if (!tts.currentBlockId || !atBottomRef.current) return
    const el = scrollRef.current?.querySelector(`[data-block="${tts.currentBlockId}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [tts.currentBlockId])

  /** Errores de una accion: 401 al acceso, 409 refresca (el turno cambio), el resto se muestra. */
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

  const entries = useMemo(
    () => (pack ? sheetEntries({ pack, sessionCode, members: table.members, viewerCharacterId: viewer.characterId, own: projections.own, world: projections.world }) : []),
    [pack, sessionCode, table.members, viewer.characterId, projections],
  )
  const suggestedCode = useMemo(() => suggestedSessionCode(pack, existingCodes), [pack, existingCodes])

  const sessionTitle = snapshot?.session ? (pack?.sessions.get(snapshot.session.code)?.title ?? `Sesión ${snapshot.session.code}`) : null
  const connectionNotice = connection === 'offline' ? 'Sin conexión con el servidor; reintentando...' : error
  const showVoiceNotice = tts.supported && tts.voicesReady && tts.voices.length === 0 && !voiceNoticeDismissed
  const line = statusLine(turn, progress, nameOf)
  const emptyText = snapshot?.session ? 'El DM todavía no ha narrado. Cuando la mesa cierre el primer turno, la narración aparece aquí.' : isHost ? 'Abre la sesión desde el mando del anfitrión para que el DM presente la escena.' : 'Cuando el anfitrión abra la sesión, el primer turno aparece aquí.'

  return (
    <div className={`table${screen ? ' screen' : ''}`}>
      <header className="table-header hide-on-screen">
        <Link href="/mesas" className="btn ghost small">
          Mesas
        </Link>
        <div className="titles">
          <div className="title">{table.name}</div>
          <div className="subtitle">
            {sessionTitle ? <b>{sessionTitle}</b> : connection === 'loading' ? 'Conectando...' : 'Sin sesión abierta'}
            {worldTime ? <> &middot; {worldTime}</> : null}
            {turn ? (
              <>
                {' '}
                &middot; Turno {turn.number}
                {progress.pending.length > 0 && !progress.narrating ? <> &middot; faltan {progress.pending.map(nameOf).join(', ')}</> : null}
              </>
            ) : null}
          </div>
        </div>
        <div className="actions">
          <button type="button" className={`btn small${sheetsOpen ? ' active' : ''}`} onClick={() => setSheetsOpen((v) => !v)}>
            Fichas
          </button>
          <button type="button" className="btn small" onClick={() => setScreen(true)} title="Solo narrativa y diálogos, en grande (tecla F)">
            Pantalla
          </button>
        </div>
      </header>

      <div className="toolbar hide-on-screen">
        <div className="segmented" role="group" aria-label="Vista">
          <button type="button" aria-pressed={mode === 'narrative'} onClick={() => setMode('narrative')}>
            Narrativa
          </button>
          <button type="button" aria-pressed={mode === 'dialogue'} onClick={() => setMode('dialogue')}>
            Diálogo
          </button>
        </div>
        <TtsBar tts={tts} />
      </div>

      {connectionNotice ? <div className="notice-bar hide-on-screen">{connectionNotice}</div> : null}
      {showVoiceNotice ? (
        <div className="notice-bar soft hide-on-screen">
          Este navegador no tiene voces en español instaladas; la lectura sonará en otro idioma o no sonará.{' '}
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              storage.setVoiceNoticeSeen()
              setVoiceNoticeDismissed(true)
            }}
          >
            Entendido
          </button>
        </div>
      ) : null}

      <div className="table-body">
        <div className="scroll" ref={scrollRef} onScroll={onScroll}>
          <div className="blocks">
            {blocks.length === 0 && connection !== 'loading' ? <p className="empty">{emptyText}</p> : null}
            <Blocks groups={groups} currentBlockId={tts.currentBlockId} onPressBlock={(id) => tts.start(id)} />
            {progress.narrating ? (
              <div className="narrating">
                <span className="spinner" aria-hidden /> El DM está narrando...
              </div>
            ) : null}
          </div>
        </div>
        {behind ? (
          <button type="button" className="btn primary small jump" onClick={() => scrollToEnd(true)}>
            Bajar a lo nuevo
          </button>
        ) : null}
        {sheetsOpen && !screen ? <SheetsPanel entries={entries} footer={projections.seq !== null ? `Estado vivo de la mesa, seq ${projections.seq}` : 'Sin estado de la API todavía: fichas del pack'} onClose={() => setSheetsOpen(false)} /> : null}
      </div>

      <footer className="screen-foot">
        <span>{turn ? `Turno ${turn.number}: ${line}` : line}</span>
        <button type="button" className="btn ghost small" onClick={() => setScreen(false)}>
          Salir de pantalla <span className="k">F</span>
        </button>
      </footer>

      <div className="table-footer hide-on-screen">
        {isHost ? <HostPanel client={client} table={table} meId={user.id} pack={pack} session={snapshot?.session ?? null} suggestedCode={suggestedCode} busy={busy} onOpenSession={openSession} onCloseSession={closeSession} onTableChanged={onTableChanged} onUnauthorized={onUnauthorized} /> : null}
        <TurnPanel turn={turn} progress={progress} nameOf={nameOf} busy={busy} notice={notice} hasCharacter={viewer.characterId !== null} onRespond={respond} onClose={closeTurn} />
      </div>
    </div>
  )
}
