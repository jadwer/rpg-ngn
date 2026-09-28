import { packArtUrl, type PackOption } from '@rpg-ngn/api-client'
import { packSummaryText, worldTags } from '@rpg-ngn/ui-logic'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'

/**
 * Un mundo para elegir al crear la mesa, con su portada como en Mesas y
 * Explorar mundos. Antes era un radio con "El té que nadie probó (campaña)"
 * y nada mas (27-09).
 */
export function WorldOption({ world, baseUrl, selected, onSelect }: { world: PackOption; baseUrl: string; selected: boolean; onSelect: () => void }) {
  const cover = packArtUrl(world.id, world.catalog?.cover)
  const tags = worldTags(world.catalog)
  return (
    <Pressable onPress={onSelect} style={({ pressed }) => [styles.card, selected && styles.cardOn, pressed && styles.pressed]} accessibilityRole="radio" accessibilityState={{ selected }}>
      <View style={styles.cover}>{cover ? <Image source={{ uri: `${baseUrl}${cover}` }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={styles.letter}>{world.name.charAt(0)}</Text>}</View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>
          {world.name}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {tags.length > 0 ? tags.join(' · ') : packSummaryText(world)}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, overflow: 'hidden', paddingRight: 14 },
  cardOn: { borderColor: theme.colors.accentBright, backgroundColor: 'rgba(124, 58, 237, 0.14)' },
  pressed: { opacity: 0.8 },
  cover: { width: 76, height: 76, backgroundColor: theme.colors.panel2, alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: theme.fonts.display, fontSize: 28, color: theme.colors.inkFaint },
  text: { flex: 1, gap: 3, paddingVertical: 10 },
  name: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.ink },
  sub: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.inkFaint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: theme.colors.accentBright },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accentBright },
})
