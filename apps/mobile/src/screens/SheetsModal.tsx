import { characterSheet } from '@rpg-ngn/ui-logic'
import { useState, type ReactNode } from 'react'
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { Portrait } from '../components/Portrait'
import { Sheet } from '../components/Sheet'
import { abilityModifier } from '../pack/offline'
import type { SheetEntry } from '../sheets/entries'
import { theme } from '../theme'
import { SheetHeader } from '../components/SheetHeader'

/**
 * Fichas de toda la party como modal sobre la narracion (docs/09, "Fichas").
 * Recibe las entradas ya decididas (`sheets/entries.ts`): que se ve de cada
 * personaje, quien lo juega y su estado vivo, venga del log reducido o de
 * las proyecciones de la API.
 */
interface Props {
  visible: boolean
  onClose: () => void
  entries: SheetEntry[]
  /** Pie del modal: de donde sale el estado (sesion offline, seq de la API). */
  footer?: string | undefined
  /** Retratos de un pack que la app no lleva dentro: URL de la API. */
  portraitUriOf?: ((path: string | null | undefined) => string | null) | undefined
  /** Quien es tu personaje (la personalidad escrita), debajo de tu propia ficha (docs/18, D-UX-7). */
  persona?: ReactNode
}

export function SheetsModal({ visible, onClose, entries, footer, portraitUriOf, persona }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? entries.find((e) => e.character.id === selectedId) : undefined
  const sheet = selected ? characterSheet(selected.character, { visibility: selected.visibility, state: selected.state, modifier: abilityModifier }) : null

  const close = () => {
    setSelectedId(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent onRequestClose={selected ? () => setSelectedId(null) : close}>
      {/* Sin la barra de estado, que tapaba la cabecera (26-09). */}
      <StatusBar hidden />
      <View style={styles.modal}>
        <SheetHeader title={selected ? selected.character.name : 'La party'} onClose={close} back={selected ? { label: 'Fichas', onPress: () => setSelectedId(null) } : undefined} />

        {sheet ? (
          <Sheet sheet={sheet} portraitUri={portraitUriOf?.(sheet.portrait)} footer={selected?.mine && persona ? persona : undefined} />
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {entries.map(({ character, slot, visibility, muted, mine }) => (
              <Pressable key={character.id} onPress={() => setSelectedId(character.id)} style={({ pressed }) => [styles.card, slot.kind === 'free' && styles.cardFree, mine && styles.cardMine, pressed && styles.pressed]}>
                <Portrait path={character.portrait} uri={portraitUriOf?.(character.portrait)} name={character.name} size={96} muted={muted} />
                <Text style={styles.cardName}>{character.name}</Text>
                <Text style={styles.cardSub}>{`${character.race}\n${character.class}`}</Text>
                <Text style={styles.cardRoles}>{character.roles.join(' / ')}</Text>
                {slot.kind === 'taken' ? <Text style={[styles.tag, mine && styles.tagMine]}>{mine ? 'Tú' : slot.player}</Text> : null}
                {slot.kind === 'free' ? <Text style={[styles.tag, styles.tagFree]}>{visibility.veiled ? 'Libre, sin memoria' : 'Libre'}</Text> : null}
              </Pressable>
            ))}
            {footer ? <Text style={styles.footer}>{footer}</Text> : null}
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: theme.colors.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, paddingBottom: 40 },
  card: { width: '47%', flexGrow: 1, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 10, alignItems: 'center', gap: 3 },
  cardFree: { borderColor: theme.colors.borderSoft },
  cardMine: { borderColor: theme.colors.accentBright },
  pressed: { opacity: 0.8 },
  cardName: { fontFamily: theme.fonts.serifSemiBold, fontSize: 17, color: theme.colors.ink, marginTop: 6 },
  cardSub: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.inkDim, textAlign: 'center' },
  cardRoles: { fontFamily: theme.fonts.uiMedium, fontSize: 11, color: theme.colors.inkDim, textAlign: 'center', letterSpacing: 0.2 },
  tag: { fontFamily: theme.fonts.uiMedium, fontSize: 12, color: theme.colors.inkDim, backgroundColor: theme.colors.panel3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6, overflow: 'hidden' },
  tagFree: { color: '#bbf7d0', backgroundColor: 'rgba(34, 197, 94, 0.14)' },
  tagMine: { color: '#ffffff', backgroundColor: 'rgba(124, 58, 237, 0.45)' },
  footer: { width: '100%', fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkDim, textAlign: 'center', marginTop: 12, letterSpacing: 0.2 },
})
