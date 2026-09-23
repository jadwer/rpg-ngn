import { ApiError, type ApiClient } from '@rpg-ngn/api-client'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/Button'
import { CreditsPanel } from '../../components/CreditsPanel'
import { DeleteAccount } from '../../components/DeleteAccount'
import { Field } from '../../components/Field'
import { OwnKeysPanel } from '../../components/OwnKeysPanel'
import type { StoredUser } from '../../online/storage'
import { theme } from '../../theme'

interface Props {
  client: ApiClient
  user: StoredUser
  /** El servidor con el que habla la app; de ahi sale la web para recargar. */
  serverUrl: string
  /** El nombre cambio: el padre lo recuerda y lo pinta. */
  onUserChanged: (user: StoredUser) => void
  onBack: () => void
  onUnauthorized: () => void
  /** La cuenta se borro: limpiar la sesion local, sin llamar a la API. */
  onDeleted: () => void
}

/**
 * Perfil, como `/perfil` en la web: cambiar el nombre visible
 * (`PATCH /api/v1/profile`) y la contraseña (`PATCH /api/v1/profile/password`,
 * pide la actual). El correo se muestra pero no se edita (cambiarlo exige
 * verificarlo).
 */
export function ProfileScreen({ client, user, serverUrl, onUserChanged, onBack, onUnauthorized, onDeleted }: Props) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [nameBusy, setNameBusy] = useState(false)
  const [nameNotice, setNameNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passBusy, setPassBusy] = useState(false)
  const [passNotice, setPassNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const fail = (caught: unknown, set: (n: { ok: boolean; text: string }) => void) => {
    if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
    else set({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
  }

  const saveName = async () => {
    setNameBusy(true)
    setNameNotice(null)
    try {
      const emailChanged = email.trim() !== user.email
      const updated = await client.updateProfile({ name, email })
      onUserChanged({ id: updated.id, name: updated.name, email: updated.email })
      setNameNotice({
        ok: true,
        text: emailChanged ? 'Guardado. Tu correo nuevo está sin verificar: entra con él la próxima vez.' : 'Guardado.',
      })
    } catch (caught) {
      fail(caught, setNameNotice)
    } finally {
      setNameBusy(false)
    }
  }

  const mismatch = confirmation.length > 0 && password !== confirmation
  const canChange = !passBusy && current.length > 0 && password.length >= 8 && confirmation.length > 0 && !mismatch
  const savePassword = async () => {
    if (!canChange) return
    setPassBusy(true)
    setPassNotice(null)
    try {
      await client.changePassword(current, password, confirmation)
      setCurrent('')
      setPassword('')
      setConfirmation('')
      setPassNotice({ ok: true, text: 'Contraseña cambiada.' })
    } catch (caught) {
      fail(caught, setPassNotice)
    } finally {
      setPassBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.link}>‹ Mesas</Text>
        </Pressable>
        <Text style={styles.title}>Tu perfil</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Cuenta</Text>
          <Field label="Nombre" value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={80} />
          <Field
            label="Correo"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={255}
            hint="Con él entras a la mesa. Si lo cambias, el nuevo empieza sin verificar."
          />
          {nameNotice ? <Text style={[styles.notice, nameNotice.ok ? styles.ok : styles.error]}>{nameNotice.text}</Text> : null}
          <View style={styles.actions}>
            <Button label="Guardar cuenta" primary busy={nameBusy} disabled={!name.trim() || !email.trim() || (name.trim() === user.name && email.trim() === user.email)} onPress={() => void saveName()} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Contraseña</Text>
          <Field label="Contraseña actual" value={current} onChangeText={setCurrent} secureTextEntry textContentType="password" />
          <Field label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" hint="Al menos 8 caracteres." />
          <Field label="Repite la nueva" value={confirmation} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" onSubmitEditing={() => void savePassword()} />
          {mismatch ? <Text style={styles.error}>Las contraseñas no coinciden.</Text> : null}
          {passNotice ? <Text style={[styles.notice, passNotice.ok ? styles.ok : styles.error]}>{passNotice.text}</Text> : null}
          <View style={styles.actions}>
            <Button label="Cambiar contraseña" primary busy={passBusy} disabled={!canChange} onPress={() => void savePassword()} />
          </View>
        </View>

        <CreditsPanel client={client} serverUrl={serverUrl} onUnauthorized={onUnauthorized} />

        <OwnKeysPanel client={client} onUnauthorized={onUnauthorized} />

        <DeleteAccount client={client} onDeleted={onDeleted} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.panel, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  link: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.nebula, minWidth: 64 },
  spacer: { minWidth: 64 },
  title: { flex: 1, fontFamily: theme.fonts.serifSemiBold, fontSize: 16, color: theme.colors.ink, textAlign: 'center', letterSpacing: 0.2 },
  form: { padding: 16, paddingBottom: 48, gap: 16 },
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 14, gap: 12 },
  label: { fontFamily: theme.fonts.uiMedium, fontSize: 12, letterSpacing: 0.2, color: theme.colors.inkDim },
  block: { gap: 4 },
  fieldLabel: { fontFamily: theme.fonts.uiMedium, fontSize: 12, letterSpacing: 0.2, color: theme.colors.inkDim },
  static: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.inkDim },
  notice: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.45)', backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning, fontFamily: theme.fonts.ui, fontSize: 13 },
  actions: { alignItems: 'flex-start' },
})
