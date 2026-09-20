import { cleanPersona, PERSONA_MAX, PERSONA_TEMPLATE } from '@rpg-ngn/ui-logic'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

interface Props {
  characterName: string
  /** Lo guardado en el servidor; null si no ha escrito nada. */
  saved: string | null
  busy: boolean
  /** Guarda; resuelve true si el servidor lo acepto. */
  onSave: (persona: string | null) => Promise<boolean>
}

/**
 * La personalidad del personaje, escrita por su jugador (misma logica que la
 * web): el arquetipo viene del pack, quien es lo decide quien lo juega. Solo
 * la ven el jugador y el DM. Abierto cuando no hay nada escrito.
 */
export function PersonaPanel({ characterName, saved, busy, onSave }: Props) {
  const [expanded, setExpanded] = useState(saved === null)
  const [text, setText] = useState(saved ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setText((current) => (current.trim() === '' || current === saved ? (saved ?? '') : current))
  }, [saved])

  const dirty = (cleanPersona(text).persona ?? null) !== saved

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.head} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Text style={styles.title}>{`Tu personaje: ${characterName}`}</Text>
        <Text style={styles.state}>{saved ? 'Personalidad escrita' : 'Escribe cómo es'}</Text>
        <Text style={styles.toggle}>{expanded ? 'ocultar' : 'mostrar'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.hint}>El pack pone el arquetipo; quién es lo decides tú. Solo lo ven tú y el DM. Responde a lo que quieras de esto:</Text>
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v)
              setError(null)
              setDone(false)
            }}
            placeholder={PERSONA_TEMPLATE}
            placeholderTextColor={theme.colors.inkFaint}
            multiline
            textAlignVertical="top"
            maxLength={PERSONA_MAX + 50}
            style={styles.input}
          />
          <View style={styles.row}>
            <Button
              label="Guardar"
              primary
              small
              busy={busy}
              disabled={!dirty}
              onPress={() => {
                const cleaned = cleanPersona(text)
                if (cleaned.error) {
                  setError(cleaned.error)
                  return
                }
                void onSave(cleaned.persona).then((ok) => setDone(ok))
              }}
            />
            <Text style={[styles.hint, styles.counter]}>{error ?? (done ? 'Guardado: el DM lo lee desde el próximo turno.' : `${text.trim().length}/${PERSONA_MAX}`)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.colors.panel, borderTopWidth: 1, borderColor: theme.colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  title: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.goldBright },
  state: { flex: 1, fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  toggle: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim },
  body: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  hint: { fontFamily: theme.fonts.serifItalic, fontSize: 13, color: theme.colors.inkDim },
  input: { minHeight: 130, fontFamily: theme.fonts.serif, fontSize: 15, lineHeight: 21, color: theme.colors.ink, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counter: { flex: 1 },
})
