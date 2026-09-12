import type { Character } from '@rpg-ngn/content'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Portrait } from './Portrait'

interface Props {
  characters: readonly Character[]
  /** Personajes que ya juega alguien (no se pueden elegir), con el nombre de quien. */
  taken?: ReadonlyMap<string, string> | undefined
  value: string | null
  onChange: (characterId: string | null) => void
  /** Permite dejarlo sin personaje (anfitrion que solo mira). */
  allowNone?: boolean | undefined
}

/** Selector de personaje con retrato, la misma cuadricula que las fichas en modal. */
export function CharacterPicker({ characters, taken, value, onChange, allowNone = false }: Props) {
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {allowNone ? (
        <Pressable onPress={() => onChange(null)} style={({ pressed }) => [styles.card, value === null && styles.selected, pressed && styles.pressed]} accessibilityRole="radio" accessibilityState={{ selected: value === null }}>
          <View style={styles.none}>
            <Text style={styles.noneMark}>?</Text>
          </View>
          <Text style={styles.name}>Sin personaje</Text>
          <Text style={styles.sub}>Solo miras y diriges la mesa</Text>
        </Pressable>
      ) : null}
      {characters.map((character) => {
        const owner = taken?.get(character.id) ?? null
        const selected = value === character.id
        return (
          <Pressable key={character.id} onPress={() => onChange(character.id)} disabled={!!owner} style={({ pressed }) => [styles.card, selected && styles.selected, owner && styles.taken, pressed && !owner && styles.pressed]} accessibilityRole="radio" accessibilityState={{ selected, disabled: !!owner }}>
            <Portrait path={character.portrait} name={character.name} size={72} muted={!!owner} />
            <Text style={[styles.name, selected && styles.nameSelected]}>{character.name}</Text>
            <Text style={styles.sub}>{`${character.race}, ${character.class}`}</Text>
            <Text style={[styles.tag, owner && styles.tagTaken]}>{owner ? `lo juega ${owner}` : character.roles.join(' / ')}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '31%', flexGrow: 1, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 8, alignItems: 'center', gap: 2 },
  selected: { borderColor: theme.colors.gold, backgroundColor: theme.colors.panel2 },
  taken: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
  none: { width: 72, height: 72, borderRadius: 14, backgroundColor: theme.colors.panel2, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  noneMark: { fontFamily: theme.fonts.display, fontSize: 30, color: theme.colors.inkDim },
  name: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.gold, marginTop: 4, textAlign: 'center' },
  nameSelected: { color: theme.colors.goldBright },
  sub: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim, textAlign: 'center' },
  tag: { fontFamily: theme.fonts.serif, fontSize: 10, color: theme.colors.inkFaint, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  tagTaken: { color: theme.colors.inkDim, textTransform: 'none' },
})
