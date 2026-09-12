import type { RegisterInput } from '@rpg-ngn/api-client'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { theme } from '../../theme'

interface Props {
  initialUrl: string
  busy: boolean
  /** Error del ultimo intento, o el aviso de "verifica tu correo" cuando la API no devuelve token. */
  notice: string | null
  onRegister: (serverUrl: string, input: RegisterInput) => void
  onBack: () => void
}

/**
 * Crear cuenta, como `/crear-cuenta` en la web: nombre, correo, contraseña y
 * confirmacion. Usa `POST /api/auth/register` de atomo/auth en modo token;
 * con la verificacion de correo apagada en la API se entra directo a las
 * mesas, con ella encendida se muestra el aviso y se espera el enlace.
 */
export function RegisterScreen({ initialUrl, busy, notice, onRegister, onBack }: Props) {
  const [serverUrl, setServerUrl] = useState(initialUrl)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const mismatch = confirmation.length > 0 && password !== confirmation
  const tooShort = password.length > 0 && password.length < 8
  const canSubmit = !busy && serverUrl.trim().length > 0 && name.trim().length > 0 && email.trim().length > 0 && password.length >= 8 && confirmation.length > 0 && !mismatch

  const submit = () => {
    if (canSubmit) onRegister(serverUrl, { name, email, password, passwordConfirmation: confirmation })
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Entrar</Text>
        </Pressable>
        <Text style={styles.title}>Crear cuenta</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="Servidor" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://IP-de-la-laptop:8010" />
        <Field label="Tu nombre" value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholder="Como te verán en la mesa" maxLength={80} autoFocus />
        <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" hint="Al menos 8 caracteres." />
        <Field label="Repite la contraseña" value={confirmation} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" onSubmitEditing={submit} />
        {tooShort ? <Text style={styles.error}>La contraseña necesita al menos 8 caracteres.</Text> : null}
        {mismatch ? <Text style={styles.error}>Las contraseñas no coinciden.</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Button label="Crear cuenta" primary busy={busy} disabled={!canSubmit} onPress={submit} />
        <Text style={styles.foot}>Entras directo a tus mesas. Luego dile tu correo al anfitrión para que te invite.</Text>
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
  error: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.danger },
  notice: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.goldBright, backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10 },
  foot: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, textAlign: 'center', marginTop: 4 },
})
