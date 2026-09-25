import { facesOf, keptFace, proseExcerpt, type DialogueGroup, type ImageGroup, type ProseGroup, type RollGroup, type SystemGroup, type ViewGroup } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { DICE_FACES } from '../generated/dice'
import { theme } from '../theme'
import { Portrait } from './Portrait'

/**
 * Pinta los grupos que ui-logic decide para la vista activa. Tocar un bloque
 * pide leerlo en voz alta desde ahi; el bloque en curso va resaltado.
 */
interface Props {
  groups: ViewGroup[]
  currentBlockId: string | null
  onPressBlock?: (blockId: string) => void
  /** Servidor de la API: las ilustraciones llegan con ruta relativa. */
  assetBase?: string
  /** Pantalla de lectura: letra grande para leer de lejos o proyectar. */
  large?: boolean
}

export function BlockGroups({ groups, currentBlockId, onPressBlock, assetBase = '', large = false }: Props) {
  return (
    <View style={styles.list}>
      {groups.map((group) => {
        switch (group.kind) {
          case 'prose':
            return <Prose key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} large={large} />
          case 'dialogue':
            return <Dialogue key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} large={large} />
          case 'roll':
            return <Roll key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
          case 'system':
            return <System key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
          case 'image':
            return <Scene key={group.id} group={group} assetBase={assetBase} />
        }
      })}
    </View>
  )
}

type GroupProps<G> = { group: G; currentBlockId: string | null; onPressBlock?: ((blockId: string) => void) | undefined; large?: boolean }

function Prose({ group, currentBlockId, onPressBlock, large = false }: GroupProps<ProseGroup>) {
  const [expanded, setExpanded] = useState(false)
  const speakingHere = group.blocks.some((b) => b.id === currentBlockId)

  if (group.compressed && !expanded && !speakingHere) {
    const { excerpt, remaining } = proseExcerpt(group)
    return (
      <Pressable onPress={() => setExpanded(true)} style={styles.excerpt} accessibilityRole="button">
        <Text style={styles.excerptText}>
          {excerpt}
          {remaining > 0 ? <Text style={styles.excerptMore}>{`  (${remaining} más)`}</Text> : null}
        </Text>
      </Pressable>
    )
  }

  return (
    <View style={styles.prose}>
      {group.blocks.map((block) => (
        <Pressable key={block.id} onPress={() => onPressBlock?.(block.id)} style={[styles.paragraphBox, block.id === currentBlockId && styles.current]}>
          <Text style={[styles.paragraph, large && styles.paragraphLarge]}>{block.text}</Text>
        </Pressable>
      ))}
      {group.compressed ? (
        <Pressable onPress={() => setExpanded(false)}>
          <Text style={styles.excerptMore}>Comprimir</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function Dialogue({ group, currentBlockId, onPressBlock, large = false }: GroupProps<DialogueGroup>) {
  return (
    <View style={styles.dialogue}>
      {group.blocks.map((block) => (
        <Pressable key={block.id} onPress={() => onPressBlock?.(block.id)} style={[styles.line, block.id === currentBlockId && styles.current]}>
          <Portrait path={block.speaker.portrait} uri={block.speaker.portraitUri} name={block.speaker.name} size={52} />
          <View style={styles.bubble}>
            <Text style={styles.speaker}>{block.speaker.name}</Text>
            <Text style={[styles.lineText, large && styles.lineTextLarge]}>{block.text}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  )
}

function Roll({ group, currentBlockId, onPressBlock }: GroupProps<RollGroup>) {
  const { block } = group
  return (
    <Pressable onPress={() => onPressBlock?.(block.id)} style={[styles.roll, block.id === currentBlockId && styles.current]}>
      {block.actor ? <Portrait path={block.actor.portrait} uri={block.actor.portraitUri} name={block.actor.name} size={30} /> : <View style={styles.rollSpacer} />}
      <View style={styles.rollBody}>
        <Text style={styles.rollLabel}>{block.label}</Text>
        <Text style={styles.rollText}>{block.text}</Text>
      </View>
      <DiceFaces block={block} />
      <View style={styles.die}>
        <Text style={styles.dieText}>{block.result}</Text>
      </View>
    </Pressable>
  )
}

/** Las caras de la lamina de dados (d20, d8, d6); con ventaja o desventaja se atenua el dado que no cuenta. */
function DiceFaces({ block }: { block: RollGroup['block'] }) {
  const faces = facesOf(block)
  if (faces.length === 0) return null
  const kept = keptFace(block)
  return (
    <View style={styles.diceFaces}>
      {faces.map((face, index) => {
        const source = DICE_FACES[face.asset]
        if (!source) return null
        return <Image key={`${face.asset}-${index}`} source={source} style={[styles.diceFace, kept !== null && kept !== index && styles.diceDropped]} accessibilityLabel={`Dado ${face.value}`} />
      })}
    </View>
  )
}

function System({ group, currentBlockId, onPressBlock }: GroupProps<SystemGroup>) {
  const { block } = group
  return (
    <Pressable
      onPress={() => onPressBlock?.(block.id)}
      style={[styles.system, block.tone === 'action' && styles.systemAction, block.audience === 'host' && styles.systemHostOnly, block.id === currentBlockId && styles.current]}
    >
      {block.audience === 'host' ? <Text style={styles.hostTag}>Solo para ti, anfitrión</Text> : null}
      {block.title ? <Text style={styles.systemTitle}>{block.title}</Text> : null}
      {block.text ? <Text style={styles.systemText}>{block.text}</Text> : null}
      {block.detail ? <Text style={styles.systemDetail}>{block.detail}</Text> : null}
      {block.items.map((item, index) => (
        <View key={index} style={styles.item}>
          <Text style={styles.bullet}>{'•'}</Text>
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </Pressable>
  )
}

/** Ilustracion de la escena (E10a): ancho completo, 16:9. */
function Scene({ group, assetBase }: { group: ImageGroup; assetBase: string }) {
  const { block } = group
  const uri = /^https?:/.test(block.url) ? block.url : `${assetBase}${block.url}`
  return (
    <View style={styles.scene}>
      <Image source={{ uri }} style={styles.sceneImage} resizeMode="cover" accessibilityLabel={block.alt} />
      {block.caption ? <Text style={styles.sceneCaption}>{block.caption}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  paragraphLarge: { fontSize: 24, lineHeight: 35 },
  lineTextLarge: { fontSize: 22, lineHeight: 31 },
  scene: { marginVertical: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  sceneImage: { width: '100%', aspectRatio: 16 / 9 },
  sceneCaption: { paddingHorizontal: 12, paddingVertical: 8, fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  list: { gap: 10 },
  current: { backgroundColor: theme.colors.highlight, borderColor: theme.colors.accentBright },
  prose: { gap: 4 },
  paragraphBox: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, borderWidth: 1, borderColor: 'transparent' },
  paragraph: { fontFamily: theme.fonts.serif, fontSize: 18, lineHeight: 27, color: theme.colors.ink },
  excerpt: { borderLeftWidth: 3, borderLeftColor: theme.colors.border, paddingLeft: 10, paddingVertical: 2 },
  excerptText: { fontFamily: theme.fonts.serifItalic, fontSize: 15, lineHeight: 21, color: theme.colors.inkDim },
  excerptMore: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.cyan, marginTop: 2 },
  dialogue: { gap: 8 },
  line: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: 'transparent' },
  bubble: { flex: 1, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 10, padding: 10 },
  speaker: { fontFamily: theme.fonts.display, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.ink, marginBottom: 2 },
  lineText: { fontFamily: theme.fonts.serif, fontSize: 17, lineHeight: 24, color: theme.colors.ink },
  roll: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, padding: 8 },
  rollSpacer: { width: 30 },
  diceFaces: { flexDirection: 'row', gap: 6 },
  diceFace: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  diceDropped: { opacity: 0.35 },
  rollBody: { flex: 1 },
  rollLabel: { fontFamily: theme.fonts.display, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.inkDim },
  rollText: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink },
  die: { minWidth: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: theme.colors.panel },
  dieText: { fontFamily: theme.fonts.displayBold, fontSize: 17, color: theme.colors.ink },
  system: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 12, gap: 6 },
  systemTitle: { fontFamily: theme.fonts.display, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.ink },
  systemText: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 23, color: theme.colors.ink },
  systemAction: { borderLeftWidth: 3, borderLeftColor: theme.colors.accentBright },
  systemHostOnly: { opacity: 0.72 },
  hostTag: { fontFamily: theme.fonts.display, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: theme.colors.inkDim },
  systemDetail: { fontFamily: theme.fonts.serif, fontSize: 14, lineHeight: 20, color: theme.colors.inkDim },
  item: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  bullet: { color: theme.colors.gold, fontSize: 16, lineHeight: 22 },
  itemText: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 22, color: theme.colors.ink },
})
