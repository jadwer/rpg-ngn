import { language, t } from '@rpg-ngn/i18n'
import { createApiClient, normalizeBaseUrl, type ApiClient, type BlessingState } from '@rpg-ngn/api-client'
import { blessingDaysText, blessingDue } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Modal, StatusBar, StyleSheet, Text, View } from 'react-native'
import { storage } from '../online/storage'
import { theme } from '../theme'
import { Button } from './Button'

/** Cada cuanto se pregunta si ya hay turnos: a las 3 am aparece en menos de un minuto. */
const POLL_MS = 60_000

/** Un cliente con la sesion guardada en este momento; null si no hay sesion. */
async function savedClient(): Promise<ApiClient | null> {
  const [url, token] = await Promise.all([storage.serverUrl(), storage.token()])
  if (!token) return null
  return createApiClient({ baseUrl: normalizeBaseUrl(url), tokenProvider: () => token, locale: () => language() })
}

/**
 * El aviso diario de la Bendicion del bardo (Gabino, 30-09), igual que en la
 * web: a pantalla completa encima de lo que se este haciendo en cuanto hay
 * turnos por recoger, y solo se cierra con "Recoger" (el boton de atras de
 * Android no lo cierra). Se revisa cada minuto y al volver a la app. Vive en
 * la raiz, asi que tambien sale en Inicio y leyendo sin conexion; toma la
 * sesion guardada en cada vuelta, sin depender de la pantalla abierta.
 */
export function BlessingGate() {
  const [state, setState] = useState<BlessingState | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const check = useCallback(async () => {
    const client = await savedClient()
    if (!client) {
      setState(null)
      return
    }
    try {
      setState(await client.blessing())
    } catch {
      // Sin red o sesion caducada: se vuelve a intentar en la siguiente vuelta.
    }
  }, [])

  useEffect(() => {
    void check()
    const interval = setInterval(() => void check(), POLL_MS)
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void check()
    })
    return () => {
      clearInterval(interval)
      sub.remove()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [check])

  const collect = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const client = await savedClient()
      if (!client) {
        setState(null)
        return
      }
      const turns = state?.turnsPerDay ?? 0
      const next = await client.claimBlessing()
      setDone(turns)
      timer.current = setTimeout(() => {
        setDone(null)
        setState(next)
      }, 1600)
    } catch {
      // Un 409 es que ya se recogio (en la web o en otro telefono): se vuelve a leer.
      setError(t('blessing.collectFailed'))
      await check()
    } finally {
      setBusy(false)
    }
  }

  const visible = state !== null && (blessingDue(state) || done !== null)
  if (!state) return null

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <StatusBar barStyle="light-content" />
      <View style={styles.screen} accessibilityViewIsModal>
        <View style={styles.card}>
          <Text style={styles.kicker}>{t('blessing.kicker')}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {t('blessing.title')}
          </Text>
          {state.theme ? <Text style={styles.theme}>{t('blessing.theme', { name: state.theme.name })}</Text> : null}
          <Text style={styles.turns}>{t('blessing.todayTurns', { n: state.turnsPerDay })}</Text>
          {done !== null ? (
            <Text style={styles.done} accessibilityLiveRegion="polite">
              {t('blessing.collected', { n: done })}
            </Text>
          ) : (
            <>
              <Text style={styles.days}>{blessingDaysText(state)}</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label={t('blessing.collect')} primary busy={busy} onPress={() => void collect()} />
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: theme.colors.bg },
  card: { gap: 14, padding: 26, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.gold, backgroundColor: theme.colors.panel },
  kicker: { fontFamily: theme.fonts.uiSemiBold, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.goldBright, textAlign: 'center' },
  title: { fontFamily: theme.fonts.display, fontSize: 28, color: theme.colors.ink, textAlign: 'center' },
  theme: { fontFamily: theme.fonts.serifItalic, fontSize: 18, color: theme.colors.goldBright, textAlign: 'center' },
  turns: { fontFamily: theme.fonts.serifSemiBold, fontSize: 22, color: theme.colors.ink, textAlign: 'center' },
  days: { fontFamily: theme.fonts.ui, fontSize: 15, color: theme.colors.inkDim, textAlign: 'center' },
  done: { fontFamily: theme.fonts.serifSemiBold, fontSize: 20, color: theme.colors.success, textAlign: 'center' },
  error: { fontFamily: theme.fonts.ui, fontSize: 14, color: theme.colors.danger, textAlign: 'center' },
})
