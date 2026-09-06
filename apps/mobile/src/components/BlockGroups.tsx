import { proseExcerpt, type DialogueGroup, type ProseGroup, type RollGroup, type SystemGroup, type ViewGroup } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
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
}

export function BlockGroups({ groups, currentBlockId, onPressBlock }: Props) {
  return (
    <View style={styles.list}>
      {groups.map((group) => {
        switch (group.kind) {
          case 'prose':
            return <Prose key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
          case 'dialogue':
            return <Dialogue key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
          case 'roll':
            return <Roll key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
          case 'system':
            return <System key={group.id} group={group} currentBlockId={currentBlockId} onPressBlock={onPressBlock} />
        }
      })}
    </View>
  )
}

type GroupProps<G> = { group: G; currentBlockId: string | null; onPressBlock?: ((blockId: string) => void) | undefined }

function Prose({ group, currentBlockId, onPressBlock }: GroupProps<ProseGroup>) {
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
          <Text style={styles.paragraph}>{block.text}</Text>
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

function Dialogue({ group, currentBlockId, onPressBlock }: GroupProps<DialogueGroup>) {
  return (
    <View style={styles.dialogue}>
      {group.blocks.map((block) => (
        <Pressable key={block.id} onPress={() => onPressBlock?.(block.id)} style={[styles.line, block.id === currentBlockId && styles.current]}>
          <Portrait path={block.speaker.portrait} name={block.speaker.name} size={52} />
          <View style={styles.bubble}>
            <Text style={styles.speaker}>{block.speaker.name}</Text>
            <Text style={styles.lineText}>{block.text}</Text>
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
      {block.actor ? <Portrait path={block.actor.portrait} name={block.actor.name} size={30} /> : <View style={styles.rollSpacer} />}
      <View style={styles.rollBody}>
        <Text style={styles.rollLabel}>{block.label}</Text>
        <Text style={styles.rollText}>{block.text}</Text>
      </View>
      <View style={styles.die}>
        <Text style={styles.dieText}>{block.result}</Text>
      </View>
    </Pressable>
  )
}

function System({ group, currentBlockId, onPressBlock }: GroupProps<SystemGroup>) {
  const { block } = group
  return (
    <Pressable onPress={() => onPressBlock?.(block.id)} style={[styles.system, block.id === currentBlockId && styles.current]}>
      {block.title ? <Text style={styles.systemTitle}>{block.title}</Text> : null}
      {block.text ? <Text style={styles.systemText}>{block.text}</Text> : null}
      {block.items.map((item, index) => (
        <View key={index} style={styles.item}>
          <Text style={styles.bullet}>{'•'}</Text>
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  current: { backgroundColor: theme.colors.highlight, borderColor: theme.colors.gold },
  prose: { gap: 4 },
  paragraphBox: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, borderWidth: 1, borderColor: 'transparent' },
  paragraph: { fontFamily: theme.fonts.serif, fontSize: 18, lineHeight: 27, color: theme.colors.ink },
  excerpt: { borderLeftWidth: 3, borderLeftColor: theme.colors.border, paddingLeft: 10, paddingVertical: 2 },
  excerptText: { fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 21, color: theme.colors.inkDim, fontStyle: 'italic' },
  excerptMore: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.gold, marginTop: 2 },
  dialogue: { gap: 8 },
  line: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: 'transparent' },
  bubble: { flex: 1, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 10 },
  speaker: { fontFamily: theme.fonts.display, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.gold, marginBottom: 2 },
  lineText: { fontFamily: theme.fonts.serif, fontSize: 17, lineHeight: 24, color: theme.colors.ink },
  roll: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 8 },
  rollSpacer: { width: 30 },
  rollBody: { flex: 1 },
  rollLabel: { fontFamily: theme.fonts.display, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.inkDim },
  rollText: { fontFamily: theme.fonts.serif, fontSize: 15, color: theme.colors.ink },
  die: { minWidth: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: theme.colors.panel },
  dieText: { fontFamily: theme.fonts.display, fontSize: 17, fontWeight: '700', color: theme.colors.accent },
  system: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 12, gap: 6 },
  systemTitle: { fontFamily: theme.fonts.display, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.gold },
  systemText: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 23, color: theme.colors.ink },
  item: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  bullet: { color: theme.colors.gold, fontSize: 16, lineHeight: 22 },
  itemText: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 22, color: theme.colors.ink },
})
