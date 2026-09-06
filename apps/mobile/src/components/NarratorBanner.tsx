import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { useNarrator } from '../state/narrator'
import { theme } from '../theme'

/**
 * Bandera de narrador (docs/09). La fila con el switch siempre esta; el
 * aviso solo cuando nadie narra (ni este telefono ni otro) y no se descarto.
 */
export function NarratorBanner({ localSpeaking, spanishVoice }: { localSpeaking: boolean; spanishVoice: boolean | null }) {
  const narrator = useNarrator()
  const narrating = narrator.someoneNarrating || localSpeaking
  const showWarning = !narrating && !narrator.dismissed

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{localSpeaking ? 'Este teléfono está narrando' : 'Alguien más está narrando'}</Text>
        <Switch
          value={narrator.someoneNarrating}
          onValueChange={narrator.setSomeoneNarrating}
          disabled={localSpeaking}
          trackColor={{ true: theme.colors.gold, false: theme.colors.border }}
          thumbColor={theme.colors.panel}
        />
      </View>
      {showWarning ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>Nadie está narrando en voz alta. Toca Leer para narrar desde aquí o activa el interruptor si otro teléfono ya lo hace.</Text>
          <Pressable onPress={narrator.dismiss}>
            <Text style={styles.dismiss}>Jugamos leyendo, ocultar</Text>
          </Pressable>
        </View>
      ) : null}
      {narrator.dismissed && !narrating ? (
        <Pressable onPress={narrator.restore}>
          <Text style={styles.dismiss}>Volver a avisar si nadie narra</Text>
        </Pressable>
      ) : null}
      {spanishVoice === false ? <Text style={styles.voiceHint}>No hay voz en español instalada: descárgala en los ajustes de texto a voz del teléfono para narrar sin conexión.</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.inkDim },
  warning: { backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, padding: 10, gap: 6 },
  warningText: { fontFamily: theme.fonts.serif, fontSize: 14, lineHeight: 20, color: theme.colors.ink },
  dismiss: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.accent, textDecorationLine: 'underline' },
  voiceHint: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.accent },
})
