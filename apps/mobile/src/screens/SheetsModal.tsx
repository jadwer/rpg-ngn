import type { Session } from '@rpg-ngn/content'
import { characterSheet, characterSlot, characterVisibility, everPlayed } from '@rpg-ngn/ui-logic'
import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Portrait } from '../components/Portrait'
import { Sheet } from '../components/Sheet'
import { abilityModifier, type OfflineCampaign } from '../pack/offline'
import { theme } from '../theme'

/**
 * Fichas de toda la party como modal sobre la narracion (docs/09, "Fichas").
 * La regla de que se ve de cada personaje la decide ui-logic segun la sesion.
 */
interface Props {
  visible: boolean
  onClose: () => void
  campaign: OfflineCampaign
  session: Session
}

export function SheetsModal({ visible, onClose, campaign, session }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const played = useMemo(() => everPlayed(campaign.pack.sessions.values()), [campaign])
  const characters = useMemo(() => campaign.pack.manifest.characters.map((id) => campaign.pack.characters.get(id)).filter((c) => !!c), [campaign])

  const selected = selectedId ? campaign.pack.characters.get(selectedId) : undefined
  const sheet = selected
    ? characterSheet(selected, {
        visibility: characterVisibility(session, selected, played),
        state: campaign.state.world.characters[selected.id],
        modifier: abilityModifier,
      })
    : null

  const close = () => {
    setSelectedId(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={selected ? () => setSelectedId(null) : close}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Pressable onPress={selected ? () => setSelectedId(null) : close} hitSlop={10}>
            <Text style={styles.headerLink}>{selected ? '‹ Fichas' : 'Cerrar'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{selected ? selected.name : 'La party'}</Text>
          <Pressable onPress={close} hitSlop={10}>
            <Text style={styles.headerLink}>{selected ? 'Cerrar' : ''}</Text>
          </Pressable>
        </View>

        {sheet ? (
          <Sheet sheet={sheet} />
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {characters.map((character) => {
              const slot = characterSlot(session, character.id)
              const veiled = characterVisibility(session, character, played).veiled
              const muted = slot.kind === 'absent' && session.status === 'planned' && (session.availableCharacters?.length ?? 0) > 0
              return (
                <Pressable key={character.id} onPress={() => setSelectedId(character.id)} style={({ pressed }) => [styles.card, slot.kind === 'free' && styles.cardFree, pressed && styles.pressed]}>
                  <Portrait path={character.portrait} name={character.name} size={96} muted={muted} />
                  <Text style={styles.cardName}>{character.name}</Text>
                  <Text style={styles.cardSub}>{`${character.race}\n${character.class}`}</Text>
                  <Text style={styles.cardRoles}>{character.roles.join(' / ')}</Text>
                  {slot.kind === 'taken' ? <Text style={styles.tag}>{slot.player}</Text> : null}
                  {slot.kind === 'free' ? <Text style={[styles.tag, styles.tagFree]}>{veiled ? 'disponible, sin memoria' : 'disponible'}</Text> : null}
                </Pressable>
              )
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.panel },
  headerLink: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.accent, minWidth: 56 },
  headerTitle: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, paddingBottom: 40 },
  card: { width: '47%', flexGrow: 1, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius, padding: 10, alignItems: 'center', gap: 3 },
  cardFree: { borderColor: theme.colors.gold },
  pressed: { opacity: 0.8 },
  cardName: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.gold, marginTop: 6 },
  cardSub: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, textAlign: 'center' },
  cardRoles: { fontFamily: theme.fonts.serif, fontSize: 11, color: theme.colors.inkDim, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  tag: { fontFamily: theme.fonts.serif, fontSize: 11, color: theme.colors.inkDim, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  tagFree: { color: theme.colors.gold },
})
