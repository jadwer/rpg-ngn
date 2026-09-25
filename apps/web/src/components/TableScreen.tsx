'use client'

import { ApiError, memberOf, packMapUrl, packPortraitUrl, randomKey, type ApiClient, type PackCharacter, type PackNpc, type PackMapView, type PackSheets, type TableSummary, type TableViewer } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import type { LoadedPack } from '@rpg-ngn/content'
import { blocksForSeat, countdown, diceModeOf, blocksFromApi, characterNameFrom, emptyTableText, freeCharacters, freeRemoteCharacters, groupBlocks, hostOf, latestNarrationStart, latestRecap, latestSceneImage, withoutImages, narratorLabel, narratorsToFlag, remoteCharacterNames, seats, seatsSummary, sheetSourceFrom, sheetSourceOf, speakerResolverFor, startCard, suggestedSessionCode, tableSubtitle, tableTitle, takenCharacters, turnLine, turnProgress, waitingPhrase, type ViewMode } from '@rpg-ngn/ui-logic'
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { sheetEntries } from '../lib/sheets'
import { useNarrator } from '../lib/narrator'
import { storage, type StoredUser } from '../lib/storage'
import { useTableState } from '../lib/useTableState'
import { useTts } from '../lib/useTts'
import { Blocks } from './Blocks'
import { CharacterPicker } from './CharacterPicker'
import { ChroniclePanel } from './ChroniclePanel'
import { Drawer } from './Drawer'
import { GameBar, type GamePanel } from './GameBar'
import { HostPanel } from './HostPanel'
import { InviteLink } from './InviteLink'
import { InvitePanel } from './InvitePanel'
import { MapPanel } from './MapPanel'
import { PersonaPanel } from './PersonaPanel'
import { PlayersPanel } from './PlayersPanel'
import { RemoteCharacterPicker } from './RemoteCharacterPicker'
import { SheetsPanel } from './SheetsPanel'
import { RecapOverlay } from './RecapOverlay'
import { SystemMenu } from './SystemMenu'
import { TtsBar } from './TtsBar'
import { TurnPanel } from './TurnPanel'

interface Props {
  client: ApiClient
  table: TableSummary
  user: StoredUser
  pack: LoadedPack | null
  /** Nombres de personaje cuando la mesa juega un pack que la web no trae. */
  remoteNames?: Readonly<Record<string, string>>
  onTableChanged: () => void
  onUnauthorized: () => void
  onLogout?: (() => void) | undefined
}

const EMPTY_IDEAS: string[] = []
const EMPTY: never[] = []

/** Cada cuanto se renueva "escribiendo" mientras se teclea; la API lo caduca a los 8 s. */
const TYPING_EVERY_MS = 4000

/**
 * La mesa (docs/18, D-UX-6): el menu del sitio arriba a la izquierda, la
 * barra del juego (fichas, mapa, jugadores, anfitrion, mas) al pie en el
 * telefono y en la cabecera en escritorio, la narracion en medio y el cuadro
 * de respuesta abajo. Todo lo demas se abre bajo demanda. Polling del estado,
 * cuenta atras cancelable del cierre, "escribiendo", voz y modo pantalla.
 */
export function TableScreen({ client, table, user, pack, remoteNames = {}, onTableChanged, onUnauthorized, onLogout }: Props) {
  const campaignId = table.campaignId
  const { snapshot, connection, error, refresh } = useTableState(client, table.id, onUnauthorized)
  const narrator = useNarrator()

  const [mode, setMode] = useState<ViewMode>('narrative')
  const [screen, setScreen] = useState(false)
  const [panel, setPanel] = useState<GamePanel | null>(null)
  const sheetsOpen = panel === 'sheets'
  const togglePanel = (next: GamePanel) => setPanel((current) => (current === next ? null : next))

  // Los paneles entran en el historial del navegador: en el telefono "atras"
  // cierra el panel en vez de sacar de la mesa, y "adelante" lo reabre. Abrir
  // apila una entrada; cambiar de panel la sustituye; cerrar desde el boton la
  // retira con back(), y el popstate que provoca deja el estado como esta.
  const panelRef = useRef<GamePanel | null>(null)
  useEffect(() => {
    const previous = panelRef.current
    panelRef.current = panel
    const state = window.history.state as { rpgPanel?: GamePanel } | null
    if (panel && !previous) window.history.pushState({ ...(state ?? {}), rpgPanel: panel }, '')
    else if (panel && previous && panel !== previous) window.history.replaceState({ ...(state ?? {}), rpgPanel: panel }, '')
    else if (!panel && previous && state?.rpgPanel) window.history.back()
  }, [panel])
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const state = event.state as { rpgPanel?: GamePanel } | null
      setPanel(state?.rpgPanel ?? null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [worldTime, setWorldTime] = useState<string | null>(null)
  const [voiceNoticeDismissed, setVoiceNoticeDismissed] = useState(true)
  const [projections, setProjections] = useState<{ seq: number | null; own: CharacterState | undefined; world: Record<string, CharacterState> | undefined }>({ seq: null, own: undefined, world: undefined })
  const [existingCodes, setExistingCodes] = useState<Array<{ id: string; code: string; status: string; openedSeq: number | null; closedSeq: number | null }>>([])

  // Quien entra sin personaje lo elige aqui, entre los que queden libres; el
  // primero que llega se lo queda. Los de un pack remoto los da la API.
  const [choosing, setChoosing] = useState<string | null>(null)
  const [remote, setRemote] = useState<PackCharacter[]>([])
  // Los NPC del pack remoto, para que hablen con cara: la web solo lleva el piloto.
  const [remoteNpcs, setRemoteNpcs] = useState<PackNpc[]>([])
  useEffect(() => {
    if (pack) return
    let alive = true
    void client.listPackCharacters(table.packId, table.packVersion).then(
      (result) => {
        if (alive) setRemote(result)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, pack, table.packId, table.packVersion])
  const remoteNamesAll = useMemo(() => ({ ...remoteNames, ...remoteCharacterNames(remote) }), [remoteNames, remote])

  // El mapa del pack, si trae alguno: la imagen y los lugares posados.
  const [maps, setMaps] = useState<PackMapView[]>([])
  useEffect(() => {
    let alive = true
    void client.listPackMaps(table.packId, table.packVersion).then(
      (result) => {
        if (alive) setMaps(result)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, table.packId, table.packVersion])

  // Si el pack de esta mesa pide personalidad escrita por el jugador (La
  // Mascarada). No todos: en el piloto la ficha ya trae bio y meta, y pedir
  // un texto mas antes de jugar estorba (mesas del 20-09).
  const [wantsPersona, setWantsPersona] = useState(false)
  // El nombre del pack, para la cabecera de escena (la web solo lleva el piloto).
  const [packName, setPackName] = useState<string | null>(pack?.manifest.name ?? null)
  useEffect(() => {
    let alive = true
    void client.listPacks().then(
      (packs) => {
        if (!alive) return
        const mine = packs.find((p) => p.id === table.packId)
        setWantsPersona(mine?.playerPersona === true)
        if (mine?.name) setPackName(mine.name)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, table.packId])

  useEffect(() => {
    if (pack) return
    let alive = true
    void client.listPackNpcs(table.packId, table.packVersion).then(
      (result) => {
        if (alive) setRemoteNpcs(result)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, pack, table.packId, table.packVersion])
  // Fichas completas y sesiones de un pack que la web no lleva dentro (E3):
  // con esto el panel de fichas es el mismo para cualquier mundo, subido o
  // privado del servidor. Antes, en esos packs, el panel salia vacio.
  const [remoteSheets, setRemoteSheets] = useState<PackSheets | null>(null)
  useEffect(() => {
    if (pack) return
    let alive = true
    void client.listPackSheets(table.packId, table.packVersion).then(
      (result) => {
        if (alive) setRemoteSheets(result)
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, pack, table.packId, table.packVersion])
  const sheetSource = useMemo(() => (pack ? sheetSourceOf(pack) : remoteSheets ? sheetSourceFrom(remoteSheets) : null), [pack, remoteSheets])

  const resolver = useMemo(
    () => speakerResolverFor({ pack, characters: remote, npcs: remoteNpcs, portraitUriOf: (path) => packPortraitUrl(table.packId, path) }),
    [pack, remote, remoteNpcs, table.packId],
  )
  const envelopes = snapshot?.envelopes ?? EMPTY
  const allBlocks = useMemo(() => blocksFromApi(envelopes, resolver), [envelopes, resolver])

  const fallbackMember = memberOf(table, user.id)
  const viewer: TableViewer = snapshot?.viewer ?? { memberId: Number(fallbackMember?.id ?? 0), role: fallbackMember?.role ?? 'player', characterId: fallbackMember?.characterId ?? null }
  const isHost = viewer.role === 'host'
  const ownMember = table.members.find((m) => String(m.id) === String(viewer.memberId)) ?? fallbackMember ?? null

  // Los avisos tecnicos del motor solo los ve el anfitrion; a un jugador le
  // estorban. Y el modo pantalla es un asiento, no un estilo: lo que se
  // comparte por OBS es lo que veria un jugador, y eso vale tambien para la
  // voz. Antes se escondian con CSS y el TTS los leia igual en directo.
  const blocks = useMemo(() => blocksForSeat(allBlocks, isHost && !screen), [allBlocks, isHost, screen])
  // "Anteriormente..." (E10c): solo si ya estaba al entrar, no si llega en vivo.
  const recap = useMemo(() => latestRecap(blocks), [blocks])
  const [recapAtEntry, setRecapAtEntry] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (recapAtEntry === undefined && snapshot?.caughtUp) setRecapAtEntry(recap?.id ?? null)
  }, [snapshot, recap, recapAtEntry])
  // La ultima ilustracion es el fondo de la escena y no un bloque entre el texto.
  const groups = useMemo(() => groupBlocks(withoutImages(blocks), mode), [blocks, mode])
  const sceneImage = useMemo(() => latestSceneImage(blocks), [blocks])
  const tts = useTts(blocks)

  // Entrar en pantalla corta la lectura en curso: la cola que ya sonaba puede
  // llevar un bloque de anfitrion, y `useTts` no adopta la cola nueva hasta
  // terminar la actual. Es un acto explicito (tecla F), asi que no corta nada
  // que el anfitrion no haya decidido.
  const ttsRef = useRef(tts)
  ttsRef.current = tts
  useEffect(() => {
    if (screen) ttsRef.current.stop()
  }, [screen])
  const turn = snapshot?.turn ?? null
  const progress = useMemo(() => turnProgress(turn, { role: viewer.role, characterId: viewer.characterId }), [turn, viewer.role, viewer.characterId])
  const nameOf = useCallback((id: string) => characterNameFrom(pack, remoteNamesAll, id), [pack, remoteNamesAll])
  const headSeq = snapshot?.campaign.headSeq ?? 0
  const sessionCode = snapshot?.session?.code ?? null

  // Cuenta atras del cierre (D-UX-3). Arranca cuando ESTE cliente ve el turno
  // completo (`completedAt` cambia) o cuando se reanuda tras una espera, con
  // su propio reloj: un reloj desviado no cierra antes de tiempo. Al llegar a
  // cero cierra una sola vez por turno; si otro cliente llego antes, el 409
  // refresca y ya esta.
  const completedKey = turn && turn.status === 'open' ? `${turn.id}:${turn.completedAt ?? ''}:${turn.held ? 'espera' : 'corre'}` : null
  const [startedAt, setStartedAt] = useState<{ key: string; at: number } | null>(null)
  useEffect(() => {
    if (!completedKey || !turn?.completedAt) {
      setStartedAt(null)
      return
    }
    setStartedAt((current) => (current?.key === completedKey ? current : { key: completedKey, at: Date.now() }))
  }, [completedKey, turn?.completedAt])
  const [now, setNow] = useState(() => Date.now())
  const cd = countdown({ turn, progress, startedAt: startedAt?.key === completedKey ? startedAt.at : null, now, nameOf })
  const ticking = cd.active || progress.narrating
  useEffect(() => {
    if (!ticking) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [ticking])
  const autoClosedRef = useRef<number | null>(null)
  const closeTurnRef = useRef<(force: boolean) => void>(() => undefined)
  useEffect(() => {
    if (!cd.active || cd.remaining > 0 || !turn || busy) return
    if (autoClosedRef.current === turn.id) return
    autoClosedRef.current = turn.id
    closeTurnRef.current(false)
  }, [cd.active, cd.remaining, turn, busy])

  // "Escribiendo": se renueva cada 4 s mientras se teclea y se suelta al
  // enviar o vaciar el cuadro. Si el navegador se cierra a media frase, la
  // API lo caduca sola.
  const typingRef = useRef<{ on: boolean; last: number }>({ on: false, last: 0 })
  const notifyTyping = useCallback(
    (typing: boolean) => {
      const state = typingRef.current
      const at = Date.now()
      if (typing && state.on && at - state.last < TYPING_EVERY_MS) return
      if (!typing && !state.on) return
      typingRef.current = { on: typing, last: at }
      void client.setTyping(table.id, typing).catch(() => undefined)
    },
    [client, table.id],
  )

  const rollFortune = useCallback(async () => (await client.rollFortune(table.id)).result, [client, table.id])

  const seatList = useMemo(
    () => seats({ members: table.members, turn, typing: snapshot?.typing ?? EMPTY, narrators: snapshot?.narrators ?? EMPTY, away: snapshot?.away ?? EMPTY, viewerMemberId: viewer.memberId, nameOf }),
    [table.members, turn, snapshot?.typing, snapshot?.narrators, snapshot?.away, viewer.memberId, nameOf],
  )
  const seatsLine = seatsSummary(seatList)

  /** Clave de idempotencia estable por turno: reintentar el mismo envio no duplica. */
  const keyRef = useRef<{ turnId: number; key: string } | null>(null)
  if (turn && keyRef.current?.turnId !== turn.id) keyRef.current = { turnId: turn.id, key: `web-${turn.id}-${viewer.memberId}-${randomKey()}` }
  const idempotencyKey = keyRef.current?.key ?? ''

  useEffect(() => {
    setVoiceNoticeDismissed(storage.voiceNoticeSeen())
  }, [])

  // Bandera de narrador compartida: este dispositivo anuncia mientras lee (y
  // refresca el anuncio, que caduca solo), y refleja a quien lea en otro.
  const speaking = tts.state.status === 'speaking'
  useEffect(() => {
    if (!speaking) return
    let alive = true
    const announce = () => {
      void client.setNarrating(table.id, true).catch(() => undefined)
    }
    announce()
    const timer = setInterval(() => {
      if (alive) announce()
    }, 12_000)
    return () => {
      alive = false
      clearInterval(timer)
      void client.setNarrating(table.id, false).catch(() => undefined)
    }
  }, [client, table.id, speaking])

  const narrators = snapshot?.narrators ?? EMPTY
  // `narrator` cambia de identidad en cada render (contexto); la referencia lo
  // mantiene fuera de las dependencias sin quedarse con una version vieja.
  const narratorRef = useRef(narrator)
  narratorRef.current = narrator
  useEffect(() => {
    const current = narratorRef.current
    current.setSomeoneNarrating(narratorsToFlag(narrators, viewer.memberId, current.flag).someoneNarrating)
    current.setLabel(narratorLabel(narrators, viewer.memberId, nameOf))
  }, [narrators, viewer.memberId, nameOf])

  // Titulo de la pestaña con el nombre de la mesa (y la sesion, si hay).
  useEffect(() => {
    const previous = document.title
    document.title = tableTitle(table.name, sessionCode)
    return () => {
      document.title = previous
    }
  }, [table.name, sessionCode])

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

  // Fichas con estado vivo: la propia desde player:<id>, las ajenas desde
  // world. Se piden al abrir las fichas y cuando avanza la campaña, y
  // tambien si la mesa tiene mapa, porque de ahi sale donde esta cada uno:
  // sin esto el mapa decia "nadie situado" aunque el DM hubiera movido a
  // alguien (21-09).
  useEffect(() => {
    if ((!sheetsOpen && maps.length === 0) || !campaignId) return
    let alive = true
    const own = viewer.characterId ? client.playerProjection(campaignId, viewer.characterId).then((p) => p.projection.character, () => undefined) : Promise.resolve(undefined)
    const world = client.worldProjection(campaignId).then((p) => ({ seq: p.seq, characters: p.projection.characters }), () => null)
    void Promise.all([own, world]).then(([mine, w]) => {
      if (alive) setProjections({ seq: w?.seq ?? null, own: mine, world: w?.characters })
    })
    return () => {
      alive = false
    }
  }, [client, campaignId, sheetsOpen, maps.length, viewer.characterId, headSeq])

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

  // Tecla F alterna el modo pantalla; Esc cierra pantalla y paneles. No mientras se escribe.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      if (typing) return
      if (event.key === 'f' || event.key === 'F') setScreen((v) => !v)
      if (event.key === 'Escape') {
        setScreen(false)
        setPanel(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Autoscroll al bloque nuevo, con pausa si el usuario subio a leer.
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const [behind, setBehind] = useState(false)
  // El cuadro de respuesta se abre solo cuando quien lee bajo con el dedo o
  // la rueda hasta el final. La carga y el autoscroll no cuentan: llegan al
  // final sin que nadie haya leido nada.
  const userScrollRef = useRef(false)
  const [readToEnd, setReadToEnd] = useState(false)
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = distance < 160
    if (userScrollRef.current && distance < 40) setReadToEnd(true)
    if (atBottomRef.current) setBehind(false)
  }
  const markUserScroll = () => {
    userScrollRef.current = true
  }
  // Turno nuevo, lectura nueva: el cuadro vuelve a plegarse hasta leer lo que paso.
  const turnId = turn?.id ?? null
  useEffect(() => {
    userScrollRef.current = false
    setReadToEnd(false)
  }, [turnId])
  const scrollToEnd = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    atBottomRef.current = true
    setBehind(false)
  }, [])
  const firstScrollRef = useRef(true)
  // Al llegar la narracion de un turno la vista se queda al inicio de ella,
  // no al final (Gabino, 25-09): el primer bloque nuevo arriba del panel.
  const prevCountRef = useRef(0)
  const anchoredRef = useRef(false)
  useEffect(() => {
    const before = prevCountRef.current
    prevCountRef.current = blocks.length
    if (blocks.length === 0) return
    if (firstScrollRef.current) {
      firstScrollRef.current = false
      setTimeout(() => scrollToEnd(false), 30)
      return
    }
    if (blocks.length <= before) return
    if (!atBottomRef.current) {
      setBehind(true)
      return
    }
    if (anchoredRef.current) return
    anchoredRef.current = true
    const firstNew = blocks[before]?.id
    setTimeout(() => {
      const el = firstNew ? scrollRef.current?.querySelector(`[data-block="${firstNew}"]`) : null
      if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' })
      else scrollToEnd(true)
    }, 30)
  }, [blocks, scrollToEnd])
  // Cuando el director empieza a narrar, lo siguiente que llegue es lo nuevo.
  useEffect(() => {
    if (progress.narrating) anchoredRef.current = false
  }, [progress.narrating])
  // Al entrar o salir del modo pantalla cambia la altura: se vuelve al final.
  useEffect(() => {
    const timer = setTimeout(() => scrollToEnd(false), 50)
    return () => clearTimeout(timer)
  }, [screen, scrollToEnd])
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
  closeTurnRef.current = closeTurn
  const holdTurn = (held: boolean) => {
    if (turn) void act(() => client.holdTurn(turn.id, held).then(() => undefined), 'No se pudo cambiar la espera.')
  }
  const togglePresence = () => {
    if (!ownMember) return
    void act(async () => {
      await client.setPresence(table.id, ownMember.id, ownMember.present === false)
      onTableChanged()
      refresh()
    }, 'No se pudo cambiar tu presencia.')
  }
  /** El anfitrion marca ausente (o presente) a quien se fue sin avisar. */
  const setMemberPresence = (memberId: string, present: boolean) => {
    void act(async () => {
      await client.setPresence(table.id, memberId, present)
      onTableChanged()
      refresh()
    }, 'No se pudo cambiar la presencia.')
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
    () => (sheetSource ? sheetEntries({ source: sheetSource, sessionCode, members: table.members, viewerCharacterId: viewer.characterId, own: projections.own, world: projections.world }) : []),
    [sheetSource, sessionCode, table.members, viewer.characterId, projections],
  )
  const suggestedCode = useMemo(() => suggestedSessionCode(pack, existingCodes), [pack, existingCodes])

  const sessionTitle = snapshot?.session ? (pack?.sessions.get(snapshot.session.code)?.title ?? `Sesión ${snapshot.session.code}`) : null
  const connectionNotice = connection === 'offline' ? 'Sin conexión con el servidor; reintentando...' : error
  const showVoiceNotice = tts.supported && tts.voicesReady && tts.voices.length === 0 && !voiceNoticeDismissed
  const line = turnLine(turn, progress, nameOf)
  const emptyText = emptyTableText(!!snapshot?.session, isHost)
  const start = snapshot ? startCard({ hasSession: !!snapshot.session, host: isHost, hostName: hostOf(table)?.userName ?? null, nextCode: suggestedCode, firstSession: existingCodes.length === 0, dice: diceModeOf(table.settings) }) : null
  const subtitle = tableSubtitle({ sessionTitle, loading: connection === 'loading', worldTime, turnNumber: turn?.number ?? null, pending: progress.pending.map(nameOf), narrating: progress.narrating })
  const waiting = progress.narrating && turn ? waitingPhrase(turn.number, now) : null
  const portraitOf = (id: string) => {
    const local = pack?.characters.get(id)?.portrait
    if (local) return `/packs/pilot/${local}`
    return packPortraitUrl(table.packId, remote.find((c) => c.id === id)?.portrait)
  }
  // La imagen de escena arriba de la narracion, como en el borrador de diseño
  // (docs/14): mientras el pack no traiga imagen por escena, su mapa.
  const heroImage = maps[0] ? packMapUrl(table.packId, maps[0].image) : null
  const heroStyle = heroImage ? ({ '--hero': `url("${heroImage}")` } as CSSProperties) : undefined
  // Con una ilustracion, la escena ocupa la mesa de fondo y el texto se lee
  // encima, en la mitad de abajo, sobre vidrio ahumado (Gabino, 24-09).
  const sceneUrl = sceneImage?.url ?? null
  // El borde del panel de texto se arrastra (Gabino, 25-09): quien juega
  // decide cuanto ve de escena y cuanto de texto. En pixeles desde arriba del
  // cuerpo de la mesa, entre el 8% y el 75% de su alto.
  const bodyRef = useRef<HTMLDivElement>(null)
  const [veilTop, setVeilTop] = useState<number | null>(null)
  const startVeilDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const body = bodyRef.current
    if (!body) return
    event.preventDefault()
    const rect = body.getBoundingClientRect()
    const move = (e: PointerEvent) => setVeilTop(Math.round(Math.min(rect.height * 0.75, Math.max(rect.height * 0.08, e.clientY - rect.top))))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const gameBar = (placement: 'bottom' | 'header') => <GameBar placement={placement} active={panel} onSelect={togglePanel} hasMap={maps.length > 0} isHost={isHost} playersSummary={seatsLine} />

  return (
    <div className={`table${screen ? ' screen' : ''}${sceneUrl ? ' has-scene' : ''}`}>
      <RecapOverlay tableId={table.id} recap={recap} enabled={!!snapshot?.session && !!recap && recap.id === recapAtEntry && !screen} />
      <header className="table-header hide-on-screen">
        <SystemMenu user={user} onLogout={onLogout} />
        <div className="titles">
          <div className="title">{table.name}</div>
          <div className="subtitle" title={subtitle}>
            {sessionTitle ? <b>{sessionTitle}</b> : null}
            {sessionTitle ? subtitle.slice(sessionTitle.length) : subtitle}
          </div>
        </div>
        <button
          type="button"
          className={`narrate-btn${tts.state.status === 'speaking' || tts.state.status === 'paused' ? ' on' : ''}`}
          disabled={tts.count === 0}
          onClick={() => {
            if (tts.state.status === 'speaking') tts.pause()
            else if (tts.state.status === 'paused') tts.resume()
            else tts.start(latestNarrationStart(blocks) ?? undefined)
          }}
          aria-label={tts.state.status === 'speaking' ? 'Pausar la narración' : tts.state.status === 'paused' ? 'Seguir la narración' : 'Escuchar la narración'}
          title={tts.state.status === 'speaking' ? 'Pausar' : tts.state.status === 'paused' ? 'Seguir' : 'Escuchar la narración'}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d={tts.state.status === 'speaking' ? 'M8 5v14M16 5v14' : tts.state.status === 'paused' ? 'M7 5l12 7-12 7z' : 'M4 10v4h3l4 4V6L7 10zM15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11'} />
          </svg>
        </button>
        {gameBar('header')}
      </header>

      {connectionNotice ? <div className="notice-bar hide-on-screen">{connectionNotice}</div> : null}

      <div className="table-body" ref={bodyRef} style={veilTop !== null ? ({ '--veil-top': `${veilTop}px` } as CSSProperties) : undefined}>
        {sceneUrl ? (
          <>
            <div key={sceneUrl} className="scene-backdrop" style={{ backgroundImage: `url("${sceneUrl}")` }} role="img" aria-label={sceneImage?.alt ?? 'Escena'} />
            <div className="scene-caption hide-on-screen">
              {turn ? (
                <span className="pill">
                  <b>Turno {turn.number}</b> {progress.narrating ? 'el director narra' : progress.complete ? 'todos respondieron' : 'fase de acciones'}
                </span>
              ) : null}
            </div>
          </>
        ) : null}
        {sceneUrl ? (
          <div
            className="veil-grip hide-on-screen"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Arrastra para ver más escena o más texto"
            onPointerDown={startVeilDrag}
          >
            <span />
          </div>
        ) : null}
        <div className="scroll" ref={scrollRef} onScroll={onScroll} onWheel={markUserScroll} onTouchMove={markUserScroll}>
          <div className="blocks">
            <section className="scene-hero hide-on-screen" style={heroStyle} aria-label="Escena">
              {turn ? (
                <span className="pill">
                  <b>Turno {turn.number}</b> {progress.narrating ? 'el director narra' : progress.complete ? 'todos respondieron' : 'fase de acciones'}
                </span>
              ) : null}
              <div className="kicker">{packName ?? table.name}</div>
              <h2>{sessionTitle ?? (snapshot?.session ? table.name : 'Sin sesión abierta')}</h2>
              {worldTime ? <p className="when">{worldTime}</p> : null}
            </section>
            {blocks.length === 0 && connection !== 'loading' && !start ? <p className="empty">{emptyText}</p> : null}
            <Blocks groups={groups} currentBlockId={tts.currentBlockId} onPressBlock={(id) => tts.start(id)} />
            {start ? (
              <section className="start-card hide-on-screen" aria-label="Inicio de la partida">
                <h2>{start.title}</h2>
                <p>{start.text}</p>
                <ol>
                  {start.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {start.action ? (
                  <button type="button" className="btn primary big" disabled={busy} onClick={() => openSession(suggestedCode, null)}>
                    {start.action}
                  </button>
                ) : null}
                {start.action ? <p className="hint">Para elegir otro código o dejarle una nota al DM, abre Anfitrión en la barra del juego.</p> : null}
              </section>
            ) : null}
            {/* La espera se ve en el pie, que siempre esta a la vista; aqui solo el modo pantalla, que no tiene pie. */}
            {progress.narrating && screen ? (
              <div className="narrating">
                <span className="spinner" aria-hidden /> {waiting ?? 'El director narra...'}
              </div>
            ) : null}
          </div>
        </div>
        {behind ? (
          <button type="button" className="btn primary small jump" onClick={() => scrollToEnd(true)}>
            Bajar a lo nuevo
          </button>
        ) : null}
        {sheetsOpen && !screen ? (
          <SheetsPanel
            entries={entries}
            footer={projections.seq !== null ? `Estado vivo de la mesa, seq ${projections.seq}` : 'Sin estado de la API todavía: fichas del pack'}
            portraitUriOf={pack ? undefined : (path) => packPortraitUrl(table.packId, path)}
            persona={
              wantsPersona && viewer.characterId !== null && snapshot !== null ? (
                <PersonaPanel
                  characterName={nameOf(viewer.characterId)}
                  saved={snapshot.viewer?.persona ?? null}
                  busy={busy}
                  onSave={(persona) =>
                    act(async () => {
                      await client.setPersona(table.id, viewer.memberId, persona)
                      refresh()
                    }, 'No se pudo guardar la personalidad.')
                  }
                />
              ) : undefined
            }
            onClose={() => setPanel(null)}
          />
        ) : null}
        {panel === 'players' && !screen ? (
          <PlayersPanel
            seats={seatList}
            portraitOf={portraitOf}
            ownPresent={ownMember && ownMember.characterId && snapshot?.session ? ownMember.present !== false : null}
            isHost={isHost}
            busy={busy}
            onTogglePresence={togglePresence}
            onPresence={setMemberPresence}
            invite={
              isHost ? (
                <>
                  {/* El enlace primero: es la via rapida y la que no pide amistad. */}
                  <InviteLink client={client} tableId={table.id} />
                  <InvitePanel client={client} table={table} meId={user.id} pack={pack} onChanged={onTableChanged} onUnauthorized={onUnauthorized} />
                </>
              ) : undefined
            }
            onClose={() => setPanel(null)}
          />
        ) : null}
        {panel === 'host' && isHost && !screen ? (
          <Drawer title="Anfitrión" onClose={() => setPanel(null)} className="host-drawer">
            <HostPanel embedded client={client} table={table} pack={pack} session={snapshot?.session ?? null} loaded={snapshot !== null} suggestedCode={suggestedCode} playedSessions={existingCodes} busy={busy} onOpenSession={openSession} onCloseSession={closeSession} onTableChanged={onTableChanged} onUnauthorized={onUnauthorized} />
          </Drawer>
        ) : null}
        {panel === 'more' && !screen ? (
          <Drawer title="Lectura" onClose={() => setPanel(null)} className="more-drawer">
            <div className="stack">
              <div className="label" style={{ marginTop: 0 }}>
                Vista
              </div>
              <div className="segmented" role="group" aria-label="Vista" style={{ alignSelf: 'flex-start' }}>
                <button type="button" aria-pressed={mode === 'narrative'} onClick={() => setMode('narrative')}>
                  Narrativa
                </button>
                <button type="button" aria-pressed={mode === 'dialogue'} onClick={() => setMode('dialogue')}>
                  Diálogo
                </button>
              </div>
              <div className="label">Voz</div>
              <TtsBar tts={tts} />
              {showVoiceNotice ? (
                <p className="hint">
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
                </p>
              ) : null}
              <div className="label">Compartir la historia</div>
              <ChroniclePanel client={client} tableId={table.id} />
              <div className="label">Pantalla</div>
              <div className="row">
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    setPanel(null)
                    setScreen(true)
                  }}
                >
                  Modo pantalla
                </button>
                <span className="hint">Solo narrativa y diálogos, en grande, para compartir o proyectar (tecla F).</span>
              </div>
            </div>
          </Drawer>
        ) : null}
        {maps.length > 0 ? <MapPanel packId={table.packId} maps={maps} world={projections.world} party={table.members.map((m) => m.characterId).filter((id): id is string => !!id)} viewerCharacterId={viewer.characterId} nameOf={nameOf} portraitOf={portraitOf} open={panel === 'map' && !screen} onOpenChange={(v) => setPanel(v ? 'map' : null)} showLine={false} /> : null}
      </div>

      <footer className="screen-foot">
        <span>{line}</span>
        <button type="button" className="btn ghost small" onClick={() => setScreen(false)}>
          Salir de pantalla <span className="k">F</span>
        </button>
      </footer>

      <div className="table-footer hide-on-screen">
        {viewer.characterId === null && snapshot !== null ? (
          <section className="card stack" aria-label="Elige tu personaje">
            <div className="label" style={{ marginTop: 0 }}>
              Elige tu personaje
            </div>
            <p className="hint">Los que ya juega alguien no se pueden elegir: el primero que llega se lo queda. Sin personaje puedes leer, pero no responder.</p>
            {pack ? (
              <CharacterPicker characters={freeCharacters(pack, table.members)} taken={takenCharacters(table.members)} value={choosing} onChange={setChoosing} />
            ) : remote.length > 0 ? (
              <RemoteCharacterPicker packId={table.packId} characters={freeRemoteCharacters(remote, table.members)} taken={takenCharacters(table.members)} value={choosing} onChange={setChoosing} />
            ) : (
              <p className="hint">Cargando los personajes del pack...</p>
            )}
            <div className="row">
              <button
                type="button"
                className="btn primary"
                disabled={!choosing || busy}
                onClick={() => {
                  if (!choosing) return
                  void act(async () => {
                    await client.setOwnerCharacter(table.id, user.id, choosing)
                    onTableChanged()
                    refresh()
                  }, 'No se pudo elegir el personaje.')
                }}
              >
                Jugar con este personaje
              </button>
            </div>
          </section>
        ) : null}
        <TurnPanel turn={turn} progress={progress} nameOf={nameOf} busy={busy} notice={notice} hasCharacter={viewer.characterId !== null} diceMode={diceModeOf(table.settings)} countdown={cd} waiting={waiting} onRespond={respond} onClose={closeTurn} onHold={holdTurn} onTyping={notifyTyping} fortunePending={snapshot?.fortune?.pending ?? false} onFortune={rollFortune} outOfTurns={viewer.role === 'host' && snapshot?.quota?.remainingTurns === 0} suggestions={snapshot?.suggestions ?? EMPTY_IDEAS} autoOpen={readToEnd && !progress.narrating && tts.state.status !== 'speaking'} />
      </div>
      {gameBar('bottom')}
    </div>
  )
}
