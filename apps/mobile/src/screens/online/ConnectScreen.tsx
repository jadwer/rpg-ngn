import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { PUBLIC_SERVER_URL } from '../../online/storage'
import { theme } from '../../theme'

interface Props {
  initialUrl: string
  busy: boolean
  /** Aviso previo (sesion caducada) o error del ultimo intento. */
  notice: string | null
  onLogin: (serverUrl: string, email: string, password: string) => void
  /** Crear cuenta y recuperar contraseña, con el servidor que este escrito. */
  onRegister: (serverUrl: string) => void
  onForgot: (serverUrl: string) => void
  onBack: () => void
}

/** URL del servidor (editable, se recuerda) y login por token; enlaces a crear cuenta y recuperar contraseña. */
export function ConnectScreen({ initialUrl, busy, notice, onLogin, onRegister, onForgot, onBack }: Props) {
  const [serverUrl, setServerUrl] = useState(initialUrl)
  // El servidor no se enseña salvo que no sea el de siempre: quien entra a
  // jugar no tiene por que decidir contra que API habla.
  const [showServer, setShowServer] = useState(initialUrl !== PUBLIC_SERVER_URL)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const canSubmit = serverUrl.trim().length > 0 && email.trim().length > 0 && password.length > 0 && !busy

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Inicio</Text>
        </Pressable>
        <Text style={styles.title}>Entrar a la mesa</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {showServer ? (
          <Field
            label="Servidor"
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={PUBLIC_SERVER_URL}
            hint="Déjalo como está salvo que juegues contra otro servidor."
          />
        ) : null}
        <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" placeholder="jaz@example.com" />
        <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" onSubmitEditing={() => canSubmit && onLogin(serverUrl, email, password)} />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <Button label="Entrar" primary busy={busy} disabled={!canSubmit} onPress={() => onLogin(serverUrl, email, password)} />
        <View style={styles.links}>
          <Pressable onPress={() => onForgot(serverUrl)} hitSlop={6} disabled={busy}>
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
          {!showServer ? (
            <Pressable onPress={() => setShowServer(true)} hitSlop={6} disabled={busy}>
              <Text style={styles.linkText}>Cambiar servidor</Text>
            </Pressable>
          ) : null}
          <Text style={styles.foot}>
            ¿Todavía no tienes cuenta?{' '}
            <Text style={styles.linkText} onPress={() => onRegister(serverUrl)}>
              Créala aquí
            </Text>
            , toma un minuto.
          </Text>
        </View>
        <Text style={styles.foot}>Tu sesión queda guardada en el almacén seguro del teléfono, así no tienes que entrar cada vez.</Text>
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
  notice: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.goldBright, backgroundColor: theme.colors.warning, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10 },
  links: { gap: 8, alignItems: 'center' },
  linkText: { fontFamily: theme.fonts.serif, fontSize: 14, color: theme.colors.goldBright, textDecorationLine: 'underline' },
  foot: { fontFamily: theme.fonts.serif, fontSize: 13, color: theme.colors.inkDim, textAlign: 'center', marginTop: 4 },
})
