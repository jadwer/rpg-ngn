import { packMapUrl, type PackMapView } from '@rpg-ngn/api-client'
import type { CharacterState } from '@rpg-ngn/core'
import { currentMapIndex, mapEdges, mapView, whereEveryoneIs } from '@rpg-ngn/ui-logic'
import { useMemo, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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
 * Ancho del lienzo. El alto sale de la proporcion real de la imagen: los mapas
 * son 3:2 (o 2:3 la mina) y un lienzo cuadrado con `cover` los recortaba, con
 * lo que los porcentajes caian fuera de sitio. La web hace lo mismo con
 * `fit-content` mas `object-fit: contain`.
 */
const ANCHO = 320

export function MapPanel({ baseUrl, packId, maps, world, party, viewerCharacterId, nameOf, portraitOf, open: openProp, onClose }: Props) {
  const [openSelf, setOpenSelf] = useState(false)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : openSelf
  const setOpen = (value: boolean) => (controlled ? (value ? undefined : onClose?.()) : setOpenSelf(value))
  // Igual que en la web: el elegido a mano, o el que toque por donde esta la gente.
  const [chosen, setChosen] = useState<number | null>(null)
  // Proporcion ancho/alto de la imagen cargada; 3:2 hasta saberla.
  const [aspect, setAspect] = useState(1.5)
  const index = chosen ?? currentMapIndex(maps, world, party, viewerCharacterId)
  const map = maps[index] ?? null
  const view = useMemo(() => mapView(map, world, party), [map, world, party])
  const edges = useMemo(() => (view ? mapEdges(view.pins) : []), [view])

  if (!view) return null

  const path = packMapUrl(packId, view.map.image)
  const src = path ? `${baseUrl}${path}` : null
  const resumen = whereEveryoneIs(view, nameOf)
  const ALTO = ANCHO / aspect

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

          <ScrollView contentContainerStyle={styles.body}>
            {maps.length > 1 ? (
              <View style={styles.selector}>
                {maps.map((m, i) => (
                  <Pressable key={m.id} onPress={() => setChosen(i)} style={[styles.pestana, i === index && styles.pestanaActiva]}>
                    <Text style={[styles.pestanaTexto, i === index && styles.pestanaTextoActivo]}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.resumen}>{resumen}</Text>

            <View style={[styles.lienzo, { width: ANCHO, height: ALTO }]}>
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

            {view.offMap.length > 0 ? <Text style={styles.nota}>{`De camino o fuera de escena: ${view.offMap.map(nameOf).join(', ')}.`}</Text> : null}
            {view.map.description ? <Text style={styles.nota}>{view.map.description}</Text> : null}
          </ScrollView>
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
  body: { padding: 16, paddingBottom: 40, gap: 12, alignItems: 'center' },
  resumen: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.ink, alignSelf: 'stretch' },
  selector: { flexDirection: 'row', gap: 6, alignSelf: 'stretch', flexWrap: 'wrap' },
  pestana: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  pestanaActiva: { borderColor: theme.colors.accentBright, backgroundColor: theme.colors.panel3 },
  pestanaTexto: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  pestanaTextoActivo: { color: '#ffffff' },

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
