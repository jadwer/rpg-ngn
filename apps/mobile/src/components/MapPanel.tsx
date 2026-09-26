import { packMapUrl, type PackMapView } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import { currentMapIndex, mapEdges, mapView, whereEveryoneIs } from '@rpg-ngn/ui-logic'
import { useMemo, useRef, useState } from 'react'
import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View, type GestureResponderEvent } from 'react-native'
import { theme } from '../theme'

/**
 * El mapa de la mesa en el telefono, con la misma idea que en la web: la
 * imagen que dibujo el creador del pack, los lugares posados encima por
 * coordenadas en porcentaje y quien esta en cada uno. No es un tablero
 * tactico; nadie se coloca en una casilla.
 *
 * En la mesa solo vive la linea plegada (en partida manda la narracion) y el
 * mapa se abre a pantalla completa, igual que en escritorio.
 *
 * Los caminos se dibujan con vistas rotadas en vez de SVG: para segmentos
 * rectos el resultado es exacto y evita meter `react-native-svg`, que es un
 * modulo nativo, solo para esto.
 */
interface Props {
  baseUrl: string
  packId: string
  /** Todos los mapas del pack; el que se enseña lo decide `currentMapIndex`. */
  maps: readonly PackMapView[]
  /** Fichas vivas por id, de la proyeccion de mundo que la mesa ya pide. */
  world: Record<string, CharacterState> | undefined
  party: readonly string[]
  viewerCharacterId: string | null
  nameOf: (id: string) => string
  /** Retrato de un personaje, ya como URI absoluta; null si no hay. */
  portraitOf: (id: string) => string | null
  /** Abierto desde la barra del juego; sin estas dos, el panel pinta su propia fila para abrirse. */
  open?: boolean | undefined
  onClose?: (() => void) | undefined
}

/**
 * El lienzo ocupa el ancho disponible (hasta 900, en tablet) y no mas alto
 * que dos tercios de la pantalla. El alto sale de la proporcion real de la
 * imagen: los mapas son 3:2 (o 2:3 la mina) y un lienzo cuadrado con `cover`
 * los recortaba, con lo que los porcentajes caian fuera de sitio. La web hace
 * lo mismo con `fit-content` mas `object-fit: contain`.
 */
const ZOOM_MAX = 4

/** Los dedos en pantalla: cuantos, su centro y la distancia entre los dos primeros. */
function fingers(e: GestureResponderEvent): { count: number; cx: number; cy: number; dist: number } {
  const touches = e.nativeEvent.touches
  const [a, b] = touches
  if (!a) return { count: 0, cx: 0, cy: 0, dist: 0 }
  if (!b) return { count: touches.length, cx: a.pageX, cy: a.pageY, dist: 0 }
  return { count: touches.length, cx: (a.pageX + b.pageX) / 2, cy: (a.pageY + b.pageY) / 2, dist: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) }
}

/**
 * Zoom del mapa (Gabino, 26-09): pellizco con dos dedos, arrastre con uno
 * (o con dos a la vez), y botones. Sin modulo nativo nuevo.
 *
 * El lienzo se queda con el gesto desde el primer toque y lee los dedos de
 * cada evento; cada vez que cambia cuantos hay toma de nuevo la referencia.
 * Con PanResponder (v10 y v11) el pellizco con dos dedos a la vez no
 * arrancaba hasta levantar uno y volver a ponerlo.
 */
function useZoom(width: number, height: number) {
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 })
  const zRef = useRef(z)
  zRef.current = z
  const base = useRef({ s: 1, x: 0, y: 0, count: 0, cx: 0, cy: 0, dist: 0 })

  const clamp = (s: number, x: number, y: number) => {
    const scale = Math.min(ZOOM_MAX, Math.max(1, s))
    const mx = ((scale - 1) * width) / 2
    const my = ((scale - 1) * height) / 2
    return { s: scale, x: Math.min(mx, Math.max(-mx, x)), y: Math.min(my, Math.max(-my, y)) }
  }
  const rebase = (e: GestureResponderEvent) => {
    base.current = { ...zRef.current, ...fingers(e) }
  }
  const move = (e: GestureResponderEvent) => {
    const now = fingers(e)
    const b = base.current
    if (now.count !== b.count) return rebase(e)
    if (now.count >= 2 && b.dist > 0) {
      const s = (b.s * now.dist) / b.dist
      const k = Math.min(ZOOM_MAX, Math.max(1, s)) / b.s
      setZ(clamp(s, b.x * k + (now.cx - b.cx), b.y * k + (now.cy - b.cy)))
    } else if (now.count === 1 && b.s > 1) {
      setZ(clamp(b.s, b.x + (now.cx - b.cx), b.y + (now.cy - b.cy)))
    }
  }

  const handlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: rebase,
    onResponderStart: rebase,
    onResponderMove: move,
    onResponderEnd: rebase,
  }

  const step = (factor: number) => setZ((cur) => clamp(cur.s * factor, cur.x * factor, cur.y * factor))
  const reset = () => setZ({ s: 1, x: 0, y: 0 })
  return { z, handlers, zoomIn: () => step(1.5), zoomOut: () => step(1 / 1.5), reset }
}

export function MapPanel({ baseUrl, packId, maps, world, party, viewerCharacterId, nameOf, portraitOf, open: openProp, onClose }: Props) {
  const [openSelf, setOpenSelf] = useState(false)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : openSelf
  const setOpen = (value: boolean) => (controlled ? (value ? undefined : onClose?.()) : setOpenSelf(value))
  // Igual que en la web: el elegido a mano, o el que toque por donde esta la gente.
  const [chosen, setChosen] = useState<number | null>(null)
  // Proporcion ancho/alto de la imagen cargada; 3:2 hasta saberla.
  const [aspect, setAspect] = useState(1.5)
  const screen = useWindowDimensions()
  const ANCHO = Math.min(screen.width - 32, 900, screen.height * 0.55 * aspect)
  const ALTO = ANCHO / aspect
  const zoom = useZoom(ANCHO, ALTO)
  const index = chosen ?? currentMapIndex(maps, world, party, viewerCharacterId)
  const map = maps[index] ?? null
  const view = useMemo(() => mapView(map, world, party), [map, world, party])
  const edges = useMemo(() => (view ? mapEdges(view.pins) : []), [view])

  if (!view) return null

  const path = packMapUrl(packId, view.map.image)
  const src = path ? `${baseUrl}${path}` : null
  const resumen = whereEveryoneIs(view, nameOf)

  return (
    <>
      {controlled ? null : (
        <Pressable style={({ pressed }) => [styles.head, pressed && styles.pressed]} onPress={() => setOpen(true)}>
          <Text style={styles.headTitle}>{`Mapa: ${view.map.name}`}</Text>
          <Text style={styles.headSub}>{resumen}</Text>
          <Text style={styles.headLink}>abrir</Text>
        </Pressable>
      )}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={styles.headerLink}>Cerrar</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{view.map.name}</Text>
            <Text style={styles.headerLink} />
          </View>

          {/* Sin ScrollView: en Android el scroll nativo se quedaba con el arrastre antes que el zoom (v10). El mapa cabe en la pantalla. */}
          <View style={styles.body}>
            {maps.length > 1 ? (
              <View style={styles.selector}>
                {maps.map((m, i) => (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      setChosen(i)
                      zoom.reset()
                    }}
                    style={[styles.pestana, i === index && styles.pestanaActiva]}>
                    <Text style={[styles.pestanaTexto, i === index && styles.pestanaTextoActivo]}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.resumen}>{resumen}</Text>

            {/* Los botones van fuera del lienzo: dentro, arrastrar desde ellos movia el mapa. */}
            <View style={{ width: ANCHO, height: ALTO }}>
            <View style={[styles.lienzo, { width: ANCHO, height: ALTO }]} {...zoom.handlers}>
              <View style={{ width: ANCHO, height: ALTO, transform: [{ translateX: zoom.z.x }, { translateY: zoom.z.y }, { scale: zoom.z.s }] }}>
              {src ? (
                <Image
                  source={{ uri: src }}
                  style={{ width: ANCHO, height: ALTO }}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source
                    if (width && height) setAspect(width / height)
                  }}
                />
              ) : null}

              {edges.map((e) => {
                const x1 = (e.from.x / 100) * ANCHO
                const y1 = (e.from.y / 100) * ALTO
                const x2 = (e.to.x / 100) * ANCHO
                const y2 = (e.to.y / 100) * ALTO
                const largo = Math.hypot(x2 - x1, y2 - y1)
                const angulo = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
                // El trazo se ancla en su punto medio, que es donde React
                // Native rota, asi que se centra restando medio largo.
                const base = { left: (x1 + x2) / 2 - largo / 2, top: (y1 + y2) / 2, width: largo, transform: [{ rotate: `${angulo}deg` }] }
                return (
                  <View key={`${e.from.id}-${e.to.id}`} pointerEvents="none">
                    <View style={[styles.caminoSombra, base]} />
                    <View style={[styles.camino, base]} />
                  </View>
                )
              })}

              {view.pins.map((pin) => (
                <View key={pin.id} style={[styles.pin, { left: (pin.x / 100) * ANCHO, top: (pin.y / 100) * ALTO }]} pointerEvents="none">
                  <View style={[styles.punto, pin.who.length > 0 && styles.puntoConGente]} />
                  {pin.who.length > 0 ? (
                    <View style={styles.gente}>
                      {pin.who.map((id) => {
                        const retrato = portraitOf(id)
                        return retrato ? (
                          <Image key={id} source={{ uri: retrato }} style={styles.retrato} />
                        ) : (
                          <View key={id} style={styles.inicial}>
                            <Text style={styles.inicialTexto}>{nameOf(id).slice(0, 1)}</Text>
                          </View>
                        )
                      })}
                    </View>
                  ) : null}
                  <Text style={styles.etiqueta} numberOfLines={1}>
                    {pin.name}
                  </Text>
                </View>
              ))}
              </View>
            </View>
              <View style={styles.zoomBar}>
                <Pressable onPress={zoom.zoomIn} style={styles.zoomBtn} accessibilityRole="button" accessibilityLabel="Acercar">
                  <Text style={styles.zoomText}>+</Text>
                </Pressable>
                <Pressable onPress={zoom.zoomOut} style={styles.zoomBtn} accessibilityRole="button" accessibilityLabel="Alejar">
                  <Text style={styles.zoomText}>−</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.nota}>Pellizca para acercar y arrastra para moverte por el mapa.</Text>

            {view.offMap.length > 0 ? <Text style={styles.nota}>{`De camino o fuera de escena: ${view.offMap.map(nameOf).join(', ')}.`}</Text> : null}
            {view.map.description ? (
              <Text style={styles.nota} numberOfLines={3}>
                {view.map.description}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  head: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 10, gap: 2 },
  pressed: { opacity: 0.8 },
  headTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 15, color: theme.colors.ink, letterSpacing: 0.2 },
  headSub: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  headLink: { fontFamily: theme.fonts.uiMedium, fontSize: 11, color: theme.colors.nebula, letterSpacing: 0.2 },

  modal: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.panel },
  headerLink: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.nebula, minWidth: 56 },
  headerTitle: { fontFamily: theme.fonts.serifSemiBold, fontSize: 18, color: theme.colors.ink, letterSpacing: 0.2 },
  body: { flex: 1, padding: 16, gap: 12, alignItems: 'center' },
  resumen: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.ink, alignSelf: 'stretch' },
  selector: { flexDirection: 'row', gap: 6, alignSelf: 'stretch', flexWrap: 'wrap' },
  pestana: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  pestanaActiva: { borderColor: theme.colors.accentBright, backgroundColor: theme.colors.panel3 },
  pestanaTexto: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  pestanaTextoActivo: { color: '#ffffff' },

  zoomBar: { position: 'absolute', right: 8, bottom: 8, gap: 6 },
  zoomBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 15, 20, 0.8)', borderWidth: 1, borderColor: theme.colors.border },
  zoomText: { fontFamily: theme.fonts.uiSemiBold, fontSize: 20, color: theme.colors.ink, lineHeight: 22 },
  lienzo: { borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, overflow: 'hidden', backgroundColor: theme.colors.panel2 },

  // Dos trazos: uno oscuro debajo, o las lineas claras se pierden sobre el
  // marmol de la imagen (misma razon que en la web).
  caminoSombra: { position: 'absolute', height: 3, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  camino: { position: 'absolute', height: 1, backgroundColor: theme.colors.gold, opacity: 0.85 },

  pin: { position: 'absolute', alignItems: 'center', marginLeft: -40, marginTop: -6, width: 80 },
  punto: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.6)', backgroundColor: theme.colors.inkFaint },
  puntoConGente: { backgroundColor: theme.colors.goldBright, width: 12, height: 12, borderRadius: 6 },
  gente: { flexDirection: 'row', gap: 2, marginTop: 2 },
  retrato: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.accentBright },
  inicial: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.accentBright, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.panel },
  inicialTexto: { fontFamily: theme.fonts.uiSemiBold, fontSize: 12, color: theme.colors.gold },
  etiqueta: { fontFamily: theme.fonts.ui, fontSize: 10, color: theme.colors.ink, textAlign: 'center', marginTop: 2, textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowRadius: 3 },

  nota: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim, alignSelf: 'stretch' },
})
