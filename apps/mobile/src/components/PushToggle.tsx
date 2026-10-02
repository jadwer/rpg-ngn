import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'
import { disablePush, enablePush, pushState, type PushState } from '../online/push'
import { theme } from '../theme'
import { Button } from './Button'
import { SectionTitle } from './Panel'

const HINTS = {
  loading: 'mobile.push.off',
  on: 'mobile.push.on',
  off: 'mobile.push.off',
  blocked: 'mobile.push.blocked',
  unavailable: 'mobile.push.unavailable',
} as const

/** Avisos en Perfil, como el interruptor de Mi cuenta en la web. */
export function PushToggle({ client, onUnauthorized }: { client: ApiClient; onUnauthorized: () => void }) {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void pushState().then(setState)
    // Si los activa en los ajustes del telefono y vuelve, se refleja.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void pushState().then(setState)
    })
    return () => sub.remove()
  }, [])

  const toggle = async () => {
    setBusy(true)
    setError(null)
    try {
      setState(state === 'on' ? await disablePush(client) : await enablePush(client))
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.card}>
      <SectionTitle>{t('pushToggle.avisos')}</SectionTitle>
      <Text style={styles.hint}>{t(HINTS[state])}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {state === 'on' || state === 'off' ? (
        <View style={styles.actions}>
          <Button label={state === 'on' ? t('mobile.push.stop') : t('mobile.push.start')} primary={state === 'off'} busy={busy} onPress={() => void toggle()} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 14, gap: 10 },
  hint: { fontFamily: theme.fonts.ui, fontSize: 14, lineHeight: 20, color: theme.colors.inkDim },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
  actions: { alignItems: 'flex-start' },
})
