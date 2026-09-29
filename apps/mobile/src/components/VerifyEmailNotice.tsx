import { ApiError, type ApiClient } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { Panel } from './Panel'

/**
 * Aviso de correo sin confirmar, con el boton para pedir el enlace otra vez.
 * Confirmarlo es lo que hace falta para crear mesas; entrar a la de alguien
 * no lo pide. El enlace abre la web, que confirma y avisa. Con el correo
 * confirmado no se ve.
 */
export function VerifyEmailNotice({ client }: { client: ApiClient }) {
  const [verified, setVerified] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    client
      .profile()
      .then((p) => alive && setVerified(p.emailVerified))
      .catch(() => alive && setVerified(true))
    return () => {
      alive = false
    }
  }, [client])

  if (verified !== false) return null

  const resend = async () => {
    setBusy(true)
    setNotice(null)
    try {
      setNotice({ ok: true, text: await client.resendVerification() })
    } catch (caught) {
      const text = caught instanceof ApiError && caught.status === 429 ? 'Ya te lo enviamos hace un momento: espera un minuto y revisa también el correo no deseado.' : caught instanceof Error ? caught.message : String(caught)
      setNotice({ ok: false, text })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Confirma tu correo">
      <Text style={styles.text}>Para crear mesas y ser anfitrión hace falta confirmar tu correo. Para entrar a la mesa de alguien, no.</Text>
      {notice ? <Text style={[styles.text, notice.ok ? styles.ok : styles.error]}>{notice.text}</Text> : null}
      <View style={styles.actions}>
        <Button label="Enviarme el enlace otra vez" primary busy={busy} onPress={() => void resend()} />
      </View>
    </Panel>
  )
}

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.ink, marginBottom: 8 },
  ok: { color: theme.colors.success },
  error: { color: theme.colors.danger },
  actions: { flexDirection: 'row' },
})
