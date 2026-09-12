import { nobodyNarrates, readingLanguageLabel, voiceLineSummary } from '@rpg-ngn/ui-logic'
import { useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import type { Tts } from '../hooks/useTts'
import { useNarrator } from '../state/narrator'
import { theme } from '../theme'
import { VoicePicker } from './VoicePicker'

interface Props {
  tts: Tts
  /** Online: ofrecer "leer lo nuevo". */
  autoRead?: boolean | undefined
}

/**
 * La voz en una sola linea plegable para que la narracion ocupe la pantalla
 * (pasada tras la partida del 2026-09-11). Plegada: Leer o los controles de
 * la lectura en curso y un resumen de quien narra. Desplegada: siguiente,
 * la voz elegida, el idioma de lectura, leer lo nuevo, la bandera de
 * narrador (docs/09) y, una sola vez por telefono, el aviso de que no hay
 * voz en el idioma. El resumen y la bandera vienen de ui-logic, como en la
 * web.
 */
export function TtsBar({ tts, autoRead = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const narrator = useNarrator()
  const { state } = tts
  const active = state.status === 'speaking' || state.status === 'paused'
  const localSpeaking = state.status === 'speaking'
  const narrating = narrator.flag.someoneNarrating || localSpeaking
  const nobodyWarns = nobodyNarrates(narrator.flag, localSpeaking)
  const summary = voiceLineSummary({ state, nativePause: tts.nativePause, error: tts.error, narrator: narrator.flag, autoRead: autoRead ? tts.autoRead : null })

  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
        {!active ? <Small label="Leer" primary onPress={() => tts.start()} disabled={tts.count === 0} /> : null}
        {state.status === 'speaking' ? <Small label="Pausa" onPress={tts.pause} /> : null}
        {state.status === 'paused' ? <Small label="Seguir" primary onPress={tts.resume} /> : null}
        {active ? <Small label="Parar" onPress={tts.stop} /> : null}
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.summary} accessibilityRole="button" accessibilityState={{ expanded }} hitSlop={6}>
          <Text style={[styles.summaryText, summary.warn && styles.summaryWarn]} numberOfLines={1}>
            {summary.text}
          </Text>
          <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.panel}>
          <View style={styles.row}>
            {active ? <Small label="Siguiente" onPress={tts.next} /> : null}
            <Small label={tts.voice ? `Voz: ${shortName(tts.voice.name)}` : 'Voz del sistema'} onPress={() => setPickerOpen(true)} />
            <Small label={readingLanguageLabel(tts.settings.lang)} onPress={() => setPickerOpen(true)} />
            <Text style={styles.rate}>{`${tts.settings.rate.toFixed(2)}x`}</Text>
          </View>

          {autoRead ? (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Leer lo nuevo desde este teléfono</Text>
              <Switch value={tts.autoRead} onValueChange={tts.setAutoRead} trackColor={{ true: theme.colors.gold, false: theme.colors.border }} thumbColor={theme.colors.ink} />
            </View>
          ) : null}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{localSpeaking ? 'Este teléfono está narrando' : 'Otro teléfono ya narra'}</Text>
            <Switch value={narrator.flag.someoneNarrating} onValueChange={narrator.setSomeoneNarrating} disabled={localSpeaking} trackColor={{ true: theme.colors.gold, false: theme.colors.border }} thumbColor={theme.colors.ink} />
          </View>

          {nobodyWarns ? (
            <View style={styles.noticeRow}>
              <Text style={styles.notice}>Nadie narra en voz alta: toca Leer aquí o marca que otro teléfono ya lo hace.</Text>
              <Pressable onPress={narrator.dismiss} hitSlop={6}>
                <Text style={styles.link}>Jugamos leyendo</Text>
              </Pressable>
            </View>
          ) : null}
          {narrator.flag.dismissed && !narrating ? (
            <Pressable onPress={narrator.restore} hitSlop={6}>
              <Text style={styles.link}>Volver a avisar si nadie narra</Text>
            </Pressable>
          ) : null}

          {tts.noVoiceInLanguage ? (
            <View style={styles.noticeRow}>
              <Text style={styles.notice}>{`Este teléfono no tiene voz en ${readingLanguageLabel(tts.settings.lang).toLowerCase()}: la lectura sonará en otro idioma o no sonará. Se instala en los ajustes de texto a voz.`}</Text>
              <Pressable onPress={tts.dismissVoiceNotice} hitSlop={6}>
                <Text style={styles.link}>Entendido</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <VoicePicker visible={pickerOpen} tts={tts} onClose={() => setPickerOpen(false)} />
    </View>
  )
}

/** Android nombra las voces `es-mx-x-mxa-local`; para la linea plegada basta el ultimo tramo util. */
function shortName(name: string): string {
  const trimmed = name.replace(/-local$|-network$/i, '')
  return trimmed.length > 18 ? `${trimmed.slice(0, 17)}…` : trimmed
}

function Small({ label, onPress, primary = false, disabled = false }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, primary && styles.primary, disabled && styles.disabled, pressed && !disabled && styles.pressed]} accessibilityRole="button">
      <Text style={[styles.buttonText, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, minHeight: 30 },
  summaryText: { flexShrink: 1, fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkDim, textAlign: 'right' },
  summaryWarn: { color: theme.colors.goldBright },
  chevron: { color: theme.colors.gold, fontSize: 13 },
  panel: { gap: 8, paddingTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rate: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.inkDim },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  switchLabel: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.inkDim },
  noticeRow: { gap: 4 },
  notice: { fontFamily: theme.fonts.serif, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  link: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.goldBright, textDecorationLine: 'underline' },
  button: { borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: theme.colors.panel, minHeight: 30, justifyContent: 'center' },
  primary: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  buttonText: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.gold, letterSpacing: 0.5 },
  primaryText: { color: theme.colors.onAccent },
})
