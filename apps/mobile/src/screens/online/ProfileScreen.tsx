import { t, type Language } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient } from '@rpg-ngn/api-client'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/Button'
import { CreditsPanel } from '../../components/CreditsPanel'
import { DeleteAccount } from '../../components/DeleteAccount'
import { Field } from '../../components/Field'
import { OwnKeysPanel } from '../../components/OwnKeysPanel'
import { PushToggle } from '../../components/PushToggle'
import type { StoredUser } from '../../online/storage'
import { Backdrop } from '../../components/Backdrop'
import { PageHeader } from '../../components/PageHeader'
import { theme } from '../../theme'
import { SectionTitle } from '../../components/Panel'
import { VerifyEmailNotice } from '../../components/VerifyEmailNotice'
import { SupportSheet, type SupportView } from '../../components/SupportSheet'
import { RadioRow } from '../../components/RadioRow'
import { useLanguage } from '../../state/language'

interface Props {
  client: ApiClient
  user: StoredUser
  /** El nombre cambio: el padre lo recuerda y lo pinta. */
  onUserChanged: (user: StoredUser) => void
  onBack: () => void
  onUnauthorized: () => void
  /** La cuenta se borro: limpiar la sesion local, sin llamar a la API. */
  onDeleted: () => void
  /** Cerrar sesion en este telefono (antes estaba en la lista de mesas). */
  onLogout: () => void
  /** El pase de descubridor y la coleccion. */
  onSeason: () => void
}

/**
 * Perfil, como `/perfil` en la web: cambiar el nombre visible
 * (`PATCH /api/v1/profile`) y la contraseña (`PATCH /api/v1/profile/password`,
 * pide la actual). El correo se muestra pero no se edita (cambiarlo exige
 * verificarlo).
 */
export function ProfileScreen({ client, user, onUserChanged, onBack, onUnauthorized, onDeleted, onLogout, onSeason }: Props) {
  const [name, setName] = useState(user.name)
  const [support, setSupport] = useState<SupportView | null>(null)
  const { lang, choose, languages } = useLanguage()
  const pickLanguage = (l: Language) => {
    if (l === lang) return
    // La cuenta guarda la preferencia para los correos; si falla, el telefono ya la recuerda.
    client.updateProfile({ locale: l }).catch(() => undefined)
    choose(l)
  }
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
        text: emailChanged ? t('play.savedEmailUnverified') : t('play.saved'),
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
      setPassNotice({ ok: true, text: t('play.passwordChanged') })
    } catch (caught) {
      fail(caught, setPassNotice)
    } finally {
      setPassBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <PageHeader
        back={t('play.tablesBack')}
        onBack={onBack}
        right={
          <Pressable onPress={onLogout} hitSlop={10} accessibilityRole="button">
            <Text style={styles.link}>{t('shell.logout')}</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Backdrop />
        <View style={styles.form}>
        <Text style={styles.pageTitle}>{t('mobile.profileScreen.tuPerfil')}</Text>
        <Text style={styles.subtitle}>{t('mobile.profileScreen.tuCuentaTusCreditos')}</Text>
        <VerifyEmailNotice client={client} />
        <View style={styles.card}>
          <SectionTitle>{t('profilePage.cuenta')}</SectionTitle>
          <Field label={t('profilePage.nombre')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={80} />
          <Field
            label={t('profilePage.correo')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={255}
            hint={t('profilePage.conElEntrasA')}
          />
          {nameNotice ? <Text style={[styles.notice, nameNotice.ok ? styles.ok : styles.error]}>{nameNotice.text}</Text> : null}
          <View style={styles.actions}>
            <Button label={t('mobile.profileScreen.guardarCuenta')} primary busy={nameBusy} disabled={!name.trim() || !email.trim() || (name.trim() === user.name && email.trim() === user.email)} onPress={() => void saveName()} />
          </View>
        </View>

        <View style={styles.card}>
          <SectionTitle>{t('common.language')}</SectionTitle>
          {languages.map((l) => (
            <RadioRow key={l} label={t(`common.languages.${l}`)} selected={lang === l} onSelect={() => pickLanguage(l)} />
          ))}
        </View>

        <View style={styles.card}>
          <SectionTitle>{t('profilePage.contrasena')}</SectionTitle>
          <Field label={t('profilePage.contrasenaActual')} value={current} onChangeText={setCurrent} secureTextEntry textContentType="password" />
          <Field label={t('profilePage.nuevaContrasena')} value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" hint={t('profilePage.alMenos8Caracteres')} />
          <Field label={t('profilePage.repiteLaNueva')} value={confirmation} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" onSubmitEditing={() => void savePassword()} />
          {mismatch ? <Text style={styles.error}>{t('profilePage.lasContrasenasNoCoinciden')}</Text> : null}
          {passNotice ? <Text style={[styles.notice, passNotice.ok ? styles.ok : styles.error]}>{passNotice.text}</Text> : null}
          <View style={styles.actions}>
            <Button label={t('profilePage.cambiarContrasena')} primary busy={passBusy} disabled={!canChange} onPress={() => void savePassword()} />
          </View>
        </View>

        <View style={styles.card}>
          <SectionTitle>{t('seasonPage.temporada')}</SectionTitle>
          <Text style={styles.cardText}>{t('seasonPage.loQueGanasEn')}</Text>
          <View style={styles.actions}>
            <Button label={t('seasonPage.paseDeDescubridor')} onPress={onSeason} />
          </View>
        </View>

        <CreditsPanel client={client} onUnauthorized={onUnauthorized} />

        <PushToggle client={client} onUnauthorized={onUnauthorized} />

        <OwnKeysPanel client={client} onUnauthorized={onUnauthorized} />

        <View style={styles.card}>
          <SectionTitle>{t('support.soporte')}</SectionTitle>
          <Text style={styles.cardText}>{t('support.soporteTexto')}</Text>
          <View style={[styles.actions, styles.stacked]}>
            <Button label={t('support.reportarUnProblema')} primary onPress={() => setSupport({ name: 'new' })} />
            <Button label={t('support.misReportes')} onPress={() => setSupport({ name: 'list' })} />
          </View>
        </View>

        <DeleteAccount client={client} onDeleted={onDeleted} />
        </View>
      </ScrollView>
      <SupportSheet client={client} view={support} onView={setSupport} screen="/perfil" onUnauthorized={onUnauthorized} />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  link: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.nebula },
  scroll: { paddingBottom: 48 },
  form: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, gap: 16 },
  pageTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8 },
  subtitle: { fontFamily: theme.fonts.serif, fontSize: 17, color: theme.colors.ink, marginTop: -10, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
  card: { backgroundColor: 'rgba(17, 22, 34, 0.9)', borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 14, gap: 12 },
  // Titulo de seccion con la letra de titulos, no la del texto (Gabino, 26-09).
  block: { gap: 4 },
  fieldLabel: { fontFamily: theme.fonts.uiMedium, fontSize: 12, letterSpacing: 0.2, color: theme.colors.inkDim },
  static: { fontFamily: theme.fonts.ui, fontSize: 16, color: theme.colors.inkDim },
  notice: { fontFamily: theme.fonts.ui, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.45)', backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning, fontFamily: theme.fonts.ui, fontSize: 13 },
  actions: { alignItems: 'flex-start' },
  stacked: { gap: 10 },
  cardText: { fontFamily: theme.fonts.ui, fontSize: 15, lineHeight: 21, color: theme.colors.inkDim },
})
