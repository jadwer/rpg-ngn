import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { theme } from '../../theme'

interface Props {
  initialUrl: string
  busy: boolean
  /** Aviso previo (sesion caducada) o error del ultimo intento. */
  notice: string | null
  onLogin: (serverUrl: string, email: string, password: string) => void
  onBack: () => void
}

/** URL del servidor (editable, se recuerda) y login por token. */
export function ConnectScreen({ initialUrl, busy, notice, onLogin, onBack }: Props) {
  const [serverUrl, setServerUrl] = useState(initialUrl)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const canSubmit = serverUrl.trim().length > 0 && email.trim().length > 0 && password.length > 0 && !busy

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Inicio</Text>
        </Pressable>
        <Text style={styles.title}>Entrar a la mesa</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="Servidor" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.100.16:8000" hint="La IP de la laptop que corre la API, en la misma red Wi-Fi." />
        <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" placeholder="jaz@example.com" />
        <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" onSubmitEditing={() => canSubmit && onLogin(serverUrl, email, password)} />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Button label="Entrar" primary busy={busy} disabled={!canSubmit} onPress={() => onLogin(serverUrl, email, password)} />
        <Text style={styles.foot}>El token se guarda en el almacén seguro del teléfono y caduca solo.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.panel, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  link: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.accent, minWidth: 64 },
  spacer: { minWidth: 64 },
  title: { flex: 1, fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.gold, textAlign: 'center', letterSpacing: 1 },
  form: { padding: 20, gap: 16 },
  notice: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.accent, backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 8, padding: 10 },
  foot: { fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.inkDim, textAlign: 'center', marginTop: 8 },
})
