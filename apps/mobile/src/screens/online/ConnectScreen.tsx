import { useState } from 'react'
import { ImageBackground, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { PUBLIC_SERVER_URL } from '../../online/storage'
import { LogoVertical } from '../../components/Brand'
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HERO: ImageSourcePropType = require('../../../assets/hero-movil.webp')

/**
 * URL del servidor (editable, se recuerda) y login por token; enlaces a crear
 * cuenta y recuperar contraseña. Desde el 26-09 sobre el arte de la portada,
 * con el formulario en un panel: la version lisa se veia demasiado sencilla.
 */
export function ConnectScreen({ initialUrl, busy, notice, onLogin, onRegister, onForgot, onBack }: Props) {
  const [serverUrl, setServerUrl] = useState(initialUrl)
  // El servidor no se enseña salvo que no sea el de siempre: quien entra a
  // jugar no tiene por que decidir contra que API habla.
  const [showServer, setShowServer] = useState(initialUrl !== PUBLIC_SERVER_URL)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const canSubmit = serverUrl.trim().length > 0 && email.trim().length > 0 && password.length > 0 && !busy
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ImageBackground source={HERO} style={StyleSheet.absoluteFill} resizeMode="cover">
        <View style={styles.veil} />
      </ImageBackground>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Inicio</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <LogoVertical height={150} color="#f1f0fb" />
          <Text style={styles.motto}>WORLDS BORN FROM IMAGINATION</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.title}>Entrar a la mesa</Text>
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
          <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" placeholder="tu@correo.com" />
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
        </View>
        <Text style={styles.foot}>Tu sesión queda guardada en el almacén seguro del teléfono, así no tienes que entrar cada vez.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 10, paddingTop: 4, paddingBottom: 8 },
  motto: {
    fontFamily: theme.fonts.display,
    fontSize: 10,
    letterSpacing: 3,
    color: '#f1f0fb',
    textAlign: 'center',
  },
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 15, 20, 0.62)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  link: {
    fontFamily: theme.fonts.ui,
    fontSize: 16,
    color: '#f1f0fb',
    minWidth: 64,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
  panel: {
    gap: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.45)',
    backgroundColor: 'rgba(15, 18, 30, 0.86)',
  },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: 22,
    color: theme.colors.ink,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  form: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  notice: {
    fontFamily: theme.fonts.ui,
    fontSize: 14,
    color: theme.colors.goldBright,
    backgroundColor: theme.colors.warning,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
  },
  links: { gap: 8, alignItems: 'center' },
  linkText: {
    fontFamily: theme.fonts.ui,
    fontSize: 14,
    color: theme.colors.nebula,
    textDecorationLine: 'underline',
  },
  foot: {
    fontFamily: theme.fonts.ui,
    fontSize: 13,
    color: theme.colors.ink,
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
})
