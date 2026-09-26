import { createApiClient, normalizeBaseUrl } from '@rpg-ngn/api-client'
import { useState } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text } from 'react-native'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { PUBLIC_SERVER_URL } from '../../online/storage'
import { theme } from '../../theme'
import { SheetHeader } from '../../components/SheetHeader'

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
      <SheetHeader title="Recuperar contraseña" back={{ label: 'Entrar', onPress: onBack }} />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {done ? (
          <>
            <Text style={styles.body}>{done}</Text>
            <Text style={styles.hint}>Si no te llega en unos minutos, escríbele al anfitrión de tu mesa: él puede ayudarte a entrar.</Text>
            <Button label="Volver a entrar" onPress={onBack} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>Escribe tu correo y te llegará un enlace para poner una contraseña nueva.</Text>
            <Field label="Servidor" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder={PUBLIC_SERVER_URL} />
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
  form: { padding: 20, gap: 16 },
  body: { fontFamily: theme.fonts.ui, fontSize: 16, lineHeight: 22, color: theme.colors.ink },
  hint: { fontFamily: theme.fonts.ui, fontSize: 14, lineHeight: 19, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger },
})
