import { createApiClient, normalizeBaseUrl } from '@rpg-ngn/api-client'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { theme } from '../../theme'

interface Props {
  initialUrl: string
  onBack: () => void
}

/**
 * Olvide mi contraseña, como `/recuperar` en la web: pide a la API el correo
 * de recuperacion (`POST /api/auth/forgot-password`). Solo llega si el
 * servidor tiene correo configurado, y la pantalla lo dice. La API responde
 * lo mismo exista o no la cuenta.
 */
export function ForgotPasswordScreen({ initialUrl, onBack }: Props) {
  const [serverUrl, setServerUrl] = useState(initialUrl)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = !busy && serverUrl.trim().length > 0 && email.trim().length > 0

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const api = createApiClient({ baseUrl: normalizeBaseUrl(serverUrl), tokenProvider: () => null })
      setDone(await api.forgotPassword(email))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Entrar</Text>
        </Pressable>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {done ? (
          <>
            <Text style={styles.body}>{done}</Text>
            <Text style={styles.hint}>Si este servidor no tiene correo configurado, pídele al anfitrión de tu mesa que te ayude.</Text>
            <Button label="Volver a entrar" onPress={onBack} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>Escribe tu correo y, si el servidor tiene el correo configurado, te llegará un enlace para cambiar la contraseña.</Text>
            <Field label="Servidor" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://IP-de-la-laptop:8010" />
            <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoFocus onSubmitEditing={() => void submit()} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Enviar enlace" primary busy={busy} disabled={!canSubmit} onPress={() => void submit()} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.panel, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  link: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.goldBright, minWidth: 64 },
  spacer: { minWidth: 64 },
  title: { flex: 1, fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.gold, textAlign: 'center', letterSpacing: 1 },
  form: { padding: 20, gap: 16 },
  body: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 22, color: theme.colors.ink },
  hint: { fontFamily: theme.fonts.serifItalic, fontSize: 14, lineHeight: 19, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.danger },
})
