import { ApiError, packMapUrl, randomKey, type ApiClient, type PackMapView, type PackNpc, type PackSheets, type SessionSummary, type TableMember, type TableSummary, packPortraitUrl, type PackCharacter } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import type { LoadedPack } from '@rpg-ngn/content'
import { blocksForSeat, countdown, diceModeOf, blocksFromApi, characterNameFrom, emptyTableText, freeCharacters, freeRemoteCharacters, groupBlocks, hostOf, latestNarrationStart, latestRecap, latestSceneImage, withoutImages, narratorLabel, narratorsToFlag, seats, seatsSummary, sheetSourceFrom, sheetSourceOf, speakerResolverFor, startCard, suggestedSessionCode, tableSubtitle, takenCharacters, turnProgress, waitingPhrase, type ViewMode } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image, KeyboardAvoidingView, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { BlockGroups } from '../../components/BlockGroups'
import { Button } from '../../components/Button'
import { CharacterPicker } from '../../components/CharacterPicker'
import { ChroniclePanel } from '../../components/ChroniclePanel'
import { GameBar, type GamePanel } from '../../components/GameBar'
import { Icon, ICON } from '../../components/Icon'
import { GameSheet } from '../../components/GameSheet'
import { InviteLink } from '../../components/InviteLink'
import { InvitePanel } from '../../components/InvitePanel'
import { PlayersPanel } from '../../components/PlayersPanel'
import { SceneHero } from '../../components/SceneHero'
import { HostPanel } from '../../components/HostPanel'
import { RecapModal } from '../../components/RecapModal'
import { MapPanel } from '../../components/MapPanel'
import { PersonaPanel } from '../../components/PersonaPanel'
import { TtsBar } from '../../components/TtsBar'
import { TurnPanel } from '../../components/TurnPanel'
import { useTts } from '../../hooks/useTts'
import type { StoredUser } from '../../online/storage'
import { useTableState } from '../../online/useTableState'
import { useNarrator } from '../../state/narrator'
import { onlineSheetEntries } from '../../sheets/entries'
import { theme } from '../../theme'
import { SheetsModal } from '../SheetsModal'
import { webOriginOf } from '../../online/server-url'

interface Props {
  client: ApiClient
  table: TableSummary
  me: TableMember
  user: StoredUser
  /** Pack empaquetado si coincide con el de la mesa; sin el no hay retratos ni nombres. */
  pack: LoadedPack | null
  /** Nombres de personaje cuando la mesa juega un pack que la app no trae. */
  remoteNames?: Readonly<Record<string, string>>
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
export function TableScreen({ client, table, me, user, pack, remoteNames = {}, onBack, onTableChanged, onUnauthorized }: Props) {
  const campaignId = table.campaignId
  const { snapshot, connection, error, refresh } = useTableState(client, table.id, onUnauthorized)
  const narrator = useNarrator()

  const [mode, setMode] = useState<ViewMode>('narrative')
  const [sheetsOpen, setSheetsOpen] = useState(false)
  // La hoja abierta de la barra del juego (docs/18, D-UX-6); las fichas llevan la suya.
  const [panel, setPanel] = useState<Exclude<GamePanel, 'sheets'> | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [worldTime, setWorldTime] = useState<string | null>(null)
  const [projections, setProjections] = useState<{ seq: number | null; own: CharacterState | undefined; world: Record<string, CharacterState> | undefined }>({ seq: null, own: undefined, world: undefined })
  const [existingSessions, setExistingSessions] = useState<SessionSummary[]>([])
  const [maps, setMaps] = useState<PackMapView[]>([])

  const envelopes = snapshot?.envelopes ?? EMPTY
  // Los personajes y NPC de un pack que la app no lleva dentro: nombres y caras.
  const [remote, setRemote] = useState<PackCharacter[]>([])
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
  const [remoteNpcs, setRemoteNpcs] = useState<PackNpc[]>([])
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
  // Con el pack empaquetado, nombres y caras salen de el; si no, de la API.
  const resolver = useMemo(() => {
    const uriOf = (path: string) => {
      const p = packPortraitUrl(table.packId, path)
      return p ? `${client.baseUrl}${p}` : null
    }
    return speakerResolverFor({ pack, characters: remote, npcs: remoteNpcs, portraitUriOf: uriOf })
  }, [pack, remote, remoteNpcs, table.packId, client.baseUrl])

  const allBlocks = useMemo(() => blocksFromApi(envelopes, resolver), [envelopes, resolver])

  const turn = snapshot?.turn ?? null
  const viewer = useMemo(() => ({ role: snapshot?.viewer.role ?? me.role, characterId: snapshot?.viewer.characterId ?? me.characterId }), [snapshot?.viewer.role, snapshot?.viewer.characterId, me.role, me.characterId])
  const isHost = viewer.role === 'host'
  const ownMember = table.members.find((m) => m.id === me.id) ?? me

  // Personalidad escrita por el jugador: solo si el pack la pide (La Mascarada).
  const [wantsPersona, setWantsPersona] = useState(false)
  // El nombre del mundo, para la cabecera de escena (la app solo lleva el piloto).
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

  // Los avisos tecnicos del motor solo los ve el anfitrion; a un jugador le estorban.
  const blocks = useMemo(() => blocksForSeat(allBlocks, isHost), [allBlocks, isHost])
  // "Anteriormente..." (E10c): solo si ya estaba al entrar, no si llega en vivo.
  const recap = useMemo(() => latestRecap(blocks), [blocks])
  const [recapAtEntry, setRecapAtEntry] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (recapAtEntry === undefined && snapshot?.caughtUp) setRecapAtEntry(recap?.id ?? null)
  }, [snapshot, recap, recapAtEntry])
  // La ultima ilustracion es el fondo de la escena y no un bloque entre el texto (como la web).
  const groups = useMemo(() => groupBlocks(withoutImages(blocks), mode), [blocks, mode])
  const sceneImage = useMemo(() => latestSceneImage(blocks), [blocks])
  const sceneUri = sceneImage ? (/^https?:/.test(sceneImage.url) ? sceneImage.url : `${client.baseUrl}${sceneImage.url}`) : null
  const [composing, setComposing] = useState(false)
  // Pantalla de lectura (como el modo pantalla de la web): solo la historia,
  // en grande, sin cabecera ni pie.
  const [screen, setScreen] = useState(false)
  const { height: windowHeight } = useWindowDimensions()
  // Cuanto de la pantalla es escena y cuanto texto: se arrastra la agarradera
  // del panel (Gabino, 25-09, "asi pueden ver la imagen o el texto que
  // quieran"). Fraccion del alto, entre 8% y 70%.
  const [veilRatio, setVeilRatio] = useState(0.4)
  // El gesto se crea una sola vez y lee el valor vivo por referencia: si se
  // recreaba en cada movimiento (dependia de veilRatio), el arrastre temblaba
  // y volvia a su sitio (APK v2, 25-09).
  const veilRatioRef = useRef(0.4)
  veilRatioRef.current = veilRatio
  const windowHeightRef = useRef(windowHeight)
  windowHeightRef.current = windowHeight
  const dragStartRef = useRef(0.4)
  const veilDrag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        // Que el ScrollView no se quede con el gesto a medio arrastre.
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          dragStartRef.current = veilRatioRef.current
        },
        onPanResponderMove: (_e, g) => {
          setVeilRatio(Math.min(0.7, Math.max(0.08, dragStartRef.current + g.dy / windowHeightRef.current)))
        },
      }),
    [],
  )
  const veilTop = Math.round(windowHeight * (composing ? Math.min(veilRatio, 0.12) : veilRatio))
  const tts = useTts(blocks, { autoRead: true })
  const pendingRoll = snapshot?.rolls?.pending ?? null
  const progress = useMemo(() => turnProgress(turn, viewer, pendingRoll), [turn, viewer, pendingRoll])
  const nameOf = useCallback((id: string) => characterNameFrom(pack, remoteNames, id), [pack, remoteNames])

  // Cuenta atras cancelable antes de narrar (docs/18, D-UX-6), igual que en la
  // web: cuando todos respondieron, cada cliente cuenta desde que lo vio y al
  // llegar a cero cierra una sola vez por turno. Cualquiera puede pedir un
  // momento (hold) y la mesa espera.
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
  const waiting = progress.narrating && turn ? waitingPhrase(turn.number, now) : null

  // "Escribiendo": se renueva cada 4 s mientras se teclea; la API lo caduca a los 8.
  const typingRef = useRef<{ on: boolean; last: number }>({ on: false, last: 0 })
  const notifyTyping = useCallback(
    (typing: boolean) => {
      const state = typingRef.current
      const at = Date.now()
      if (typing && state.on && at - state.last < 4000) return
      if (!typing && !state.on) return
      typingRef.current = { on: typing, last: at }
      void client.setTyping(table.id, typing).catch(() => undefined)
    },
    [client, table.id],
  )

  const rollFortune = useCallback(async () => (await client.rollFortune(table.id)).result, [client, table.id])
  // La tirada que pidio el DM: el numero lo pone el servidor y queda como la respuesta del turno.
  const rollTurnId = turn?.id ?? null
  // "Otras" ideas: las nuevas sustituyen a las del turno en el servidor; el sondeo las confirma.
  const moreIdeas = useCallback(async () => {
    if (rollTurnId === null) throw new Error('No hay turno abierto.')
    const { options } = await client.moreIdeas(rollTurnId)
    refresh()
    return options
  }, [client, rollTurnId, refresh])
  const rollRequested = useCallback(async () => {
    if (rollTurnId === null) throw new Error('No hay turno abierto.')
    const receipt = await client.rollRequested(rollTurnId)
    return { result: receipt.result, rolls: receipt.rolls }
  }, [client, rollTurnId])

  // Quien esta, quien escribe, quien respondio y quien se tuvo que ir.
  const seatList = useMemo(
    () => seats({ members: table.members, turn, typing: snapshot?.typing ?? EMPTY, narrators: snapshot?.narrators ?? EMPTY, away: snapshot?.away ?? EMPTY, viewerMemberId: ownMember.id, nameOf }),
    [table.members, turn, snapshot?.typing, snapshot?.narrators, snapshot?.away, ownMember.id, nameOf],
  )
  const seatsLine = seatsSummary(seatList)

  // Quien entra sin personaje lo elige aqui, entre los que queden libres; el
  // primero que llega se lo queda. Los de un pack remoto los da la API.
  const [choosing, setChoosing] = useState<string | null>(null)

  // Los mapas del pack, si trae alguno. Sin mapa no se pinta nada.
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


  const freeToPick = useMemo(() => {
    if (pack) return freeCharacters(pack, table.members)
    return freeRemoteCharacters(remote, table.members).map((c) => {
      const path = packPortraitUrl(table.packId, c.portrait)
      return { id: c.id, name: c.name, race: c.race, class: c.characterClass, roles: c.roles, portraitUri: path ? `${client.baseUrl}${path}` : null }
    })
  }, [pack, remote, table.members, table.packId, client.baseUrl])
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
  // El cuadro de respuesta se abre solo cuando quien lee bajo con el dedo
  // hasta el final; la carga y el autoscroll no cuentan (como la web).
  const userScrollRef = useRef(false)
  const [readToEnd, setReadToEnd] = useState(false)
  const lastYRef = useRef(0)
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
    const distance = contentSize.height - contentOffset.y - layoutMeasurement.height
    atBottomRef.current = distance < NEAR_BOTTOM
    // Solo al bajar leyendo: subir a buscar el inicio del turno no abre nada.
    const goingDown = contentOffset.y > lastYRef.current
    lastYRef.current = contentOffset.y
    if (userScrollRef.current && goingDown && distance < 40) setReadToEnd(true)
    if (atBottomRef.current) setBehind(false)
  }
  // Donde empieza lo nuevo: al llegar la narracion de un turno la vista se
  // queda al inicio de ella, no al final (Gabino, 25-09: se iba hasta abajo
  // y habia que subir a buscar donde empezaba la respuesta).
  const contentHeightRef = useRef(0)
  const anchoredRef = useRef(false)
  const onContentSizeChange = (_w: number, h: number) => {
    contentHeightRef.current = h
  }
  const turnId = turn?.id ?? null
  useEffect(() => {
    userScrollRef.current = false
    setReadToEnd(false)
  }, [turnId])
  // Mientras el director narra se prepara el ancla: el primer lote que llegue
  // despues se lee desde su inicio.
  useEffect(() => {
    if (progress.narrating) anchoredRef.current = false
  }, [progress.narrating])
  const firstLoadRef = useRef(true)
  const prevCountRef = useRef(0)
  useEffect(() => {
    if (blocks.length === 0) return
    // El efecto corre antes de que el ScrollView mida lo nuevo: la altura
    // guardada todavia es la de antes, que es justo donde empieza lo nuevo.
    const before = contentHeightRef.current
    if (blocks.length <= prevCountRef.current) {
      prevCountRef.current = blocks.length
      return
    }
    prevCountRef.current = blocks.length
    if (firstLoadRef.current) {
      firstLoadRef.current = false
      scrollToEnd()
      return
    }
    if (!atBottomRef.current) {
      setBehind(true)
      return
    }
    if (anchoredRef.current) return
    anchoredRef.current = true
    // Al inicio de lo nuevo, con un poco de lo anterior como contexto.
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, before - 48), animated: true }), 120)
  }, [blocks.length, scrollToEnd])

  // Bandera de narrador compartida: este telefono anuncia mientras lee (y
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
  const ownMemberId = snapshot?.viewer.memberId ?? Number(me.id)
  // `narrator` cambia de identidad en cada render (contexto); la referencia lo
  // mantiene fuera de las dependencias sin quedarse con una version vieja.
  const narratorRef = useRef(narrator)
  narratorRef.current = narrator
  useEffect(() => {
    const current = narratorRef.current
    current.setSomeoneNarrating(narratorsToFlag(narrators, ownMemberId, current.flag).someoneNarrating)
    current.setLabel(narratorLabel(narrators, ownMemberId, nameOf, 'teléfono'))
  }, [narrators, ownMemberId, nameOf])

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
  const holdTurn = (held: boolean) => {
    if (turn) void act(() => client.holdTurn(turn.id, held).then(() => undefined), 'No se pudo cambiar la espera.')
  }
  // Al llegar a cero se cierra una vez; si otro cliente llego antes, el 409 refresca.
  const autoClosedRef = useRef<number | null>(null)
  const closeTurnRef = useRef(closeTurn)
  closeTurnRef.current = closeTurn
  useEffect(() => {
    if (!cd.active || cd.remaining > 0 || !turn || busy) return
    if (autoClosedRef.current === turn.id) return
    autoClosedRef.current = turn.id
    closeTurnRef.current(false)
  }, [cd.active, cd.remaining, turn, busy])
  const openSession = (code: string, note: string | null) => {
    if (campaignId) void act(() => client.openSession(campaignId, code, note ?? undefined).then(() => undefined), 'No se pudo abrir la sesión.')
  }
  const closeSession = (cliffhanger: string | null) => {
    const session = snapshot?.session
    if (!session) return
    void act(() => client.closeSession(session.id, cliffhanger ?? undefined).then(() => undefined), 'No se pudo cerrar la sesión.')
  }

  /** Estado vivo: la ficha propia desde player:<id>, las ajenas desde world. */
  const pedirProyecciones = useCallback(() => {
    if (!campaignId) return
    const own = viewer.characterId ? client.playerProjection(campaignId, viewer.characterId).then((p) => p.projection.character, () => undefined) : Promise.resolve(undefined)
    const world = client.worldProjection(campaignId).then((p) => ({ seq: p.seq, characters: p.projection.characters }), () => null)
    void Promise.all([own, world]).then(([mine, w]) => setProjections({ seq: w?.seq ?? null, own: mine, world: w?.characters }))
  }, [client, campaignId, viewer.characterId])

  const openSheets = () => {
    setSheetsOpen(true)
    pedirProyecciones()
  }

  // Si la mesa tiene mapa hay que pedir el estado sin esperar a que nadie abra
  // las fichas: el mapa necesita saber donde esta cada uno. Pedirlo solo al
  // abrir el panel fue justo el fallo que dejaba el mapa web sin gente.
  useEffect(() => {
    if (maps.length === 0) return
    pedirProyecciones()
  }, [maps.length, pedirProyecciones, headSeq])
  // Fichas completas de un pack que la app no lleva dentro (E3): el mismo
  // panel para cualquier mundo, subido o instalado en el servidor.
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
  const entries = useMemo(
    () => (sheetSource ? onlineSheetEntries({ source: sheetSource, sessionCode, members: table.members, viewerCharacterId: viewer.characterId, own: projections.own, world: projections.world }) : []),
    [sheetSource, sessionCode, table.members, viewer.characterId, projections],
  )

  const suggestedCode = useMemo(() => suggestedSessionCode(pack, existingSessions), [pack, existingSessions])
  const connectionNotice = connection === 'offline' ? 'Sin conexión con el servidor; reintentando...' : error
  const sessionTitle = snapshot?.session ? (pack?.sessions.get(snapshot.session.code)?.title ?? `Sesión ${snapshot.session.code}`) : null
  const subtitle = tableSubtitle({ sessionTitle, loading: connection === 'loading', worldTime, turnNumber: turn?.number ?? null, pending: progress.pending.map(nameOf), narrating: progress.narrating })
  const emptyText = emptyTableText(!!snapshot?.session, isHost)
  const start = snapshot ? startCard({ hasSession: !!snapshot.session, host: isHost, hostName: hostOf(table)?.userName ?? null, nextCode: suggestedCode, firstSession: existingSessions.length === 0, dice: diceModeOf(table.settings) }) : null

  // Retratos de la API como URL completa: en el telefono no hay origen al que colgar una ruta.
  const absolutePortrait = useCallback(
    (path: string | null | undefined) => {
      const p = packPortraitUrl(table.packId, path)
      return p ? `${client.baseUrl}${p}` : null
    },
    [client.baseUrl, table.packId],
  )
  const portraitOf = useCallback(
    (id: string) => {
      const portrait = pack?.characters.get(id)?.portrait ?? remote.find((c) => c.id === id)?.portrait
      return absolutePortrait(portrait)
    },
    [pack, remote, absolutePortrait],
  )
  const setPresence = (memberId: string, present: boolean) => {
    void act(async () => {
      await client.setPresence(table.id, memberId, present)
      onTableChanged()
      refresh()
    }, 'No se pudo cambiar la presencia.')
  }
  const heroPath = maps[0] ? packMapUrl(table.packId, maps[0].image) : null
  const heroImage = heroPath ? `${client.baseUrl}${heroPath}` : null
  const gamePanels: GamePanel[] = ['sheets', ...(maps.length > 0 ? (['map'] as const) : []), 'players', ...(isHost ? (['host'] as const) : []), 'reading']

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={[styles.header, screen && styles.hidden]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.headerSide} accessibilityRole="button" accessibilityLabel="Volver a tus mesas">
          <Icon d={ICON.back} size={22} color={theme.colors.inkDim} />
        </Pressable>
        <View style={styles.titles}>
          <View style={styles.badge}>
            <Icon d={ICON.shield} size={18} color={theme.colors.nebula} />
          </View>
          <View style={styles.titleText}>
            <Text style={styles.title} numberOfLines={1}>
              {turn ? `Turno ${turn.number}` : table.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {turn ? (progress.narrating ? 'El director narra' : progress.complete ? 'Todos respondieron' : 'Fase de acciones') : subtitle}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            if (tts.state.status === 'speaking') tts.pause()
            else if (tts.state.status === 'paused') tts.resume()
            else tts.start(latestNarrationStart(blocks) ?? undefined)
          }}
          disabled={tts.count === 0}
          hitSlop={12}
          style={[styles.headerSide, styles.headerRight]}
          accessibilityRole="button"
          accessibilityLabel={tts.state.status === 'speaking' ? 'Pausar la narración' : tts.state.status === 'paused' ? 'Seguir la narración' : 'Escuchar la narración'}
        >
          <Icon d={tts.state.status === 'speaking' ? ICON.pause : tts.state.status === 'paused' ? ICON.play : ICON.speak} size={22} color={tts.state.status === 'speaking' || tts.state.status === 'paused' ? theme.colors.nebula : theme.colors.inkDim} />
        </Pressable>
      </View>

      {connectionNotice ? <Text style={styles.connection}>{connectionNotice}</Text> : null}


      <View style={styles.body}>
        {sceneUri ? (
          <>
            <Image source={{ uri: sceneUri }} style={styles.sceneBackdrop} resizeMode="cover" accessibilityLabel={sceneImage?.alt ?? 'Escena'} />
            {turn ? (
              <View style={styles.scenePill}>
                <Text style={styles.scenePillText}>{`Turno ${turn.number} · ${progress.narrating ? 'el director narra' : progress.complete ? 'todos respondieron' : 'fase de acciones'}`}</Text>
              </View>
            ) : null}
          </>
        ) : null}
        {sceneUri ? (
          <View {...veilDrag.panHandlers} style={[styles.veilHandle, { top: veilTop - 20 }]} accessibilityLabel="Arrastra para ver más escena o más texto" accessibilityRole="adjustable">
            <View style={styles.veilGrip} />
          </View>
        ) : null}
        <ScrollView
          ref={scrollRef}
          style={[styles.scroll, sceneUri ? [styles.sceneVeil, { marginTop: veilTop }] : null]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={onScroll}
          onContentSizeChange={onContentSizeChange}
          onScrollBeginDrag={() => {
            userScrollRef.current = true
          }}
          scrollEventThrottle={100}
        >
          {sceneUri ? null : <SceneHero
            image={heroImage}
            kicker={packName ?? table.name}
            title={sessionTitle ?? (snapshot?.session ? table.name : 'Sin sesión abierta')}
            when={worldTime}
            pill={turn ? `Turno ${turn.number} · ${progress.narrating ? 'el director narra' : progress.complete ? 'todos respondieron' : 'fase de acciones'}` : null}
          />}
          {blocks.length === 0 && connection !== 'loading' && !start ? <Text style={styles.empty}>{emptyText}</Text> : null}
          <BlockGroups groups={groups} currentBlockId={tts.currentBlockId} onPressBlock={(id) => tts.start(id)} assetBase={client.baseUrl} large={screen} />
          {start ? (
            <View style={styles.start}>
              <Text style={styles.startTitle}>{start.title}</Text>
              <Text style={styles.startText}>{start.text}</Text>
              {start.steps.map((step, i) => (
                <Text key={step} style={styles.startStep}>{`${i + 1}. ${step}`}</Text>
              ))}
              {start.action ? <Button label={start.action} primary busy={busy} onPress={() => openSession(suggestedCode, null)} /> : null}
              {start.action ? <Text style={styles.startHint}>Para otro código o una nota al DM, usa el mando del anfitrión de abajo.</Text> : null}
            </View>
          ) : null}
          {progress.narrating ? (
            <View style={styles.narrating}>
              <Text style={styles.narratingKicker}>EL DESTINO SE PREPARA</Text>
              <View style={styles.dots}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.dot, { opacity: (Math.floor(now / 400) % 3) === i ? 1 : 0.35 }]} />
                ))}
              </View>
              <Text style={styles.narratingText}>{waiting ?? 'La mesa está jugando.'}</Text>
            </View>
          ) : null}
        </ScrollView>
        {behind ? (
          <View style={styles.jump}>
            <Button label="Bajar a lo nuevo" primary small onPress={scrollToEnd} />
          </View>
        ) : null}
      </View>

      {viewer.characterId === null && snapshot !== null ? (
        <View style={styles.choose}>
          <Text style={styles.chooseLabel}>Elige tu personaje</Text>
          <Text style={styles.chooseHint}>Los que ya juega alguien no se pueden elegir: el primero que llega se lo queda. Sin personaje puedes leer, pero no responder.</Text>
          {pack || remote.length > 0 ? <CharacterPicker characters={freeToPick} taken={takenCharacters(table.members)} value={choosing} onChange={setChoosing} /> : <Text style={styles.chooseHint}>Cargando los personajes del pack...</Text>}
          <Button
            label="Jugar con este personaje"
            primary
            busy={busy}
            disabled={!choosing}
            onPress={() => {
              if (!choosing) return
              void act(async () => {
                await client.setOwnerCharacter(table.id, user.id, choosing)
                onTableChanged()
                refresh()
              }, 'No se pudo elegir el personaje.')
            }}
          />
        </View>
      ) : null}
      <RecapModal recap={recap} enabled={!!snapshot?.session && !!recap && recap.id === recapAtEntry} />
      {screen ? (
        <Pressable style={styles.screenExit} onPress={() => setScreen(false)} accessibilityRole="button" accessibilityLabel="Salir de la pantalla de lectura">
          <Text style={styles.screenExitText}>Salir de pantalla</Text>
        </Pressable>
      ) : null}
      {screen ? null : <TurnPanel turn={turn} progress={progress} nameOf={nameOf} busy={busy} notice={notice} hasCharacter={viewer.characterId !== null} diceMode={diceModeOf(table.settings)} countdown={cd} seatsLine={seatsLine} onRespond={respond} onClose={closeTurn} onHold={holdTurn} onTyping={notifyTyping} onFocusInput={scrollToEnd} fortunePending={snapshot?.fortune?.pending ?? false} onFortune={rollFortune} onRoll={rollRequested} onRolled={refresh} suggestions={snapshot?.suggestions ?? EMPTY_IDEAS} ideas={snapshot?.ideas ?? NO_IDEAS} onMoreIdeas={moreIdeas} autoOpen={readToEnd && !progress.narrating && tts.state.status !== 'speaking'} onComposingChange={setComposing} />}
      {screen ? null : <GameBar panels={gamePanels} active={sheetsOpen ? 'sheets' : panel} badges={{ host: isHost && snapshot !== null && !snapshot.session, players: (snapshot?.typing.length ?? 0) > 0 }} onOpen={(p) => (p === 'sheets' ? openSheets() : setPanel(p))} />}

      {maps.length > 0 ? (
        <MapPanel
          open={panel === 'map'}
          onClose={() => setPanel(null)}
          baseUrl={client.baseUrl}
          packId={table.packId}
          maps={maps}
          world={projections.world}
          party={table.members.map((m) => m.characterId).filter((id): id is string => !!id)}
          viewerCharacterId={viewer.characterId}
          nameOf={nameOf}
          portraitOf={(id) => {
            const portrait = pack?.characters.get(id)?.portrait ?? remote.find((c) => c.id === id)?.portrait
            const path = packPortraitUrl(table.packId, portrait)
            return path ? `${client.baseUrl}${path}` : null
          }}
        />
      ) : null}
      <GameSheet visible={panel === 'players'} title="Jugadores" onClose={() => setPanel(null)}>
        <PlayersPanel
          seats={seatList}
          portraitOf={portraitOf}
          ownPresent={ownMember.characterId && snapshot?.session ? ownMember.present !== false : null}
          isHost={isHost}
          busy={busy}
          onTogglePresence={() => setPresence(ownMember.id, ownMember.present === false)}
          onPresence={setPresence}
          invite={
            isHost ? (
              <>
                <InviteLink client={client} tableId={table.id} tableName={table.name} />
                <InvitePanel client={client} table={table} meId={user.id} pack={pack} onChanged={onTableChanged} onUnauthorized={onUnauthorized} hideMembers />
              </>
            ) : undefined
          }
        />
      </GameSheet>
      {isHost ? (
        <GameSheet visible={panel === 'host'} title="Anfitrión" onClose={() => setPanel(null)}>
                <HostPanel client={client} table={table} pack={pack} session={snapshot?.session ?? null} suggestedCode={suggestedCode} playedSessions={existingSessions} busy={busy} onOpenSession={openSession} onCloseSession={closeSession} onTableChanged={onTableChanged} onUnauthorized={onUnauthorized} />
        </GameSheet>
      ) : null}
      <GameSheet visible={panel === 'reading'} title="Lectura" onClose={() => setPanel(null)}>
        <Text style={styles.sheetLabel}>Vista</Text>
        <View style={styles.segmented}>
          <Segment label="Narrativa" active={mode === 'narrative'} onPress={() => setMode('narrative')} />
          <Segment label="Diálogo" active={mode === 'dialogue'} onPress={() => setMode('dialogue')} />
        </View>
        <Text style={styles.sheetLabel}>Voz</Text>
        <TtsBar tts={tts} autoRead collapsible={false} />
        <Text style={styles.sheetLabel}>Compartir la historia</Text>
        <ChroniclePanel client={client} tableId={table.id} webOrigin={webOriginOf(client.baseUrl)} />
        <Text style={styles.sheetLabel}>Pantalla</Text>
        <Button
          label="Pantalla de lectura"
          small
          onPress={() => {
            setPanel(null)
            setScreen(true)
          }}
        />
        <Text style={styles.screenHint}>Solo la historia, en grande, sin controles: para leer de lejos o proyectar.</Text>
      </GameSheet>

      <SheetsModal visible={sheetsOpen} onClose={() => setSheetsOpen(false)} entries={entries} footer={projections.seq !== null ? `Estado vivo de la mesa, seq ${projections.seq}` : 'Sin estado de la API todavía: fichas del pack'} portraitUriOf={pack ? undefined : absolutePortrait}
        persona={
          wantsPersona && viewer.characterId !== null && snapshot !== null ? (
            <PersonaPanel
          characterName={nameOf(viewer.characterId)}
          saved={snapshot.viewer?.persona ?? null}
          busy={busy}
          onSave={(persona) =>
            act(async () => {
              await client.setPersona(table.id, ownMember.id, persona)
              refresh()
            }, 'No se pudo guardar la personalidad.')
          }
        />
          ) : undefined
        }
      />
    </KeyboardAvoidingView>
  )
}

const EMPTY_IDEAS: string[] = []
const NO_IDEAS = { more: 'none' as const, used: 0 }
const EMPTY: never[] = []

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  choose: { backgroundColor: theme.colors.panel, borderTopWidth: 1, borderColor: theme.colors.border, padding: 12, gap: 8 },
  chooseLabel: { fontFamily: theme.fonts.uiMedium, fontSize: 13, letterSpacing: 0.2, color: theme.colors.inkDim },
  chooseHint: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.inkDim },
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.bg },
  headerSide: { width: 36, alignItems: 'flex-start' },
  headerRight: { alignItems: 'flex-end' },
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124, 58, 237, 0.22)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.35)' },
  titleText: { alignItems: 'flex-start' },
  link: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.nebula },
  titles: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontFamily: theme.fonts.uiSemiBold, fontSize: 15, color: theme.colors.ink },
  subtitle: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.nebula },
  connection: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.goldBright, backgroundColor: theme.colors.warning, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 12 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' },
  sheetLabel: { fontFamily: theme.fonts.uiMedium, fontSize: 12, letterSpacing: 0.2, color: theme.colors.inkDim, marginTop: 6 },
  segment: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.colors.panel },
  segmentActive: { backgroundColor: theme.colors.accent },
  segmentText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 12, color: theme.colors.ink },
  segmentTextActive: { color: '#ffffff' },
  body: { flex: 1 },
  // Escena de fondo (E10a, Gabino 24-09): la imagen arriba y el texto en la
  // mitad de abajo sobre un velo negro con alfa, sin desenfoque ni sombras.
  sceneBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  scenePill: { position: 'absolute', top: 10, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(5, 5, 10, 0.6)' },
  scenePillText: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.ink },
  // Negro puro con alfa clarito (Gabino, 24-09): el texto va transparente encima.
  hidden: { display: 'none' },
  screenExit: { position: 'absolute', right: 14, bottom: 24, zIndex: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.5)' },
  screenExitText: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.ink },
  screenHint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  veilHandle: { position: 'absolute', left: 0, right: 0, height: 40, zIndex: 3, elevation: 3, alignItems: 'center', justifyContent: 'center' },
  veilGrip: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(229, 231, 255, 0.55)' },
  sceneVeil: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTopWidth: 1, borderColor: 'rgba(167, 139, 250, 0.35)' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  jump: { position: 'absolute', bottom: 12, alignSelf: 'center' },
  empty: { fontFamily: theme.fonts.ui, fontSize: 15, lineHeight: 22, color: theme.colors.inkDim, textAlign: 'center', paddingVertical: 24 },
  start: { marginVertical: 16, padding: 18, gap: 10, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.goldBright, borderRadius: theme.radius },
  startTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 20, color: theme.colors.ink, textAlign: 'center' },
  startText: { fontFamily: theme.fonts.ui, fontSize: 16, lineHeight: 23, color: theme.colors.ink, textAlign: 'center' },
  startStep: { fontFamily: theme.fonts.ui, fontSize: 14, lineHeight: 20, color: theme.colors.inkDim },
  startHint: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim, textAlign: 'center' },
  narrating: { alignItems: 'center', gap: 10, paddingVertical: 20, paddingHorizontal: 16, marginVertical: 10, borderRadius: theme.radius, backgroundColor: theme.colors.panel2 },
  narratingKicker: { fontFamily: theme.fonts.uiSemiBold, fontSize: 12, letterSpacing: 0.2, color: theme.colors.accentBright },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accentBright },
  narratingText: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.inkDim, textAlign: 'center' },
})
