import { ApiError, type ApiClient, type OwnKey } from '@rpg-ngn/api-client'
import { keyConsole, ownKeyLabel, ownKeyProblem, ownKeyStatus, removeOwnKeyWarning } from '@rpg-ngn/ui-logic'
import { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'
import { Field } from './Field'

interface Props {
  client: ApiClient
  onUnauthorized: () => void
}

/**
 * Clave propia del usuario (BYOK), igual que en la web: quien trae su clave
 * narra con ella y sus mesas dejan de gastar cupo.
 *
 * La credencial se manda una vez y no vuelve; del servidor solo llegan las
 * ultimas cuatro letras. El campo se vacia en cuanto se guarda, que en un
 * telefono importa mas todavia.
 */
export function OwnKeysPanel({ client, onUnauthorized }: Props) {
  const [keys, setKeys] = useState<OwnKey[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [credential, setCredential] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(() => {
    void client.listOwnKeys().then(setKeys, (caught: unknown) => {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
    })
  }, [client, onUnauthorized])

  useEffect(load, [load])

  const save = async (preset: string) => {
    const problema = ownKeyProblem(credential)
    if (problema) return setNotice({ ok: false, text: problema })

    setBusy(true)
    setNotice(null)
    try {
      const { keys: actualizadas, message } = await client.saveOwnKey(preset, credential.trim())
      setKeys(actualizadas)
      setNotice({ ok: true, text: message })
      setCredential('')
      setEditing(null)
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
      else setNotice({ ok: false, text: caught instanceof Error ? caught.message : String(caught) })
    } finally {
      setBusy(false)
    }
  }

  const remove = (key: OwnKey) => {
    Alert.alert('Quitar la clave', removeOwnKeyWarning(key), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          setBusy(true)
          void client.deleteOwnKey(key.preset).then(
            ({ keys: actualizadas, message }) => {
              setKeys(actualizadas)
              setNotice({ ok: true, text: message })
              setBusy(false)
            },
            (caught: unknown) => {
              if (caught instanceof ApiError && caught.isUnauthorized) onUnauthorized()
              else setNotice({ ok: false, text: 'No se pudo borrar la clave.' })
              setBusy(false)
            },
          )
        },
      },
    ])
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Tu propia clave de IA</Text>
      <Text style={styles.hint}>Si pones tu clave, tus mesas narran con ella y no gastan del cupo gratuito: le pagas los tokens directamente al proveedor. Se guarda cifrada y no vuelve a mostrarse.</Text>

      {keys.map((key) => (
        <View key={key.preset} style={styles.row}>
          <Text style={styles.provider}>{ownKeyLabel(key)}</Text>
          <Text style={styles.status}>{ownKeyStatus(key)}</Text>

          {editing === key.preset ? (
            <>
              <Field
                label="Clave"
                value={credential}
                onChangeText={setCredential}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                hint={keyConsole(key.preset) ? `La sacas en ${keyConsole(key.preset)}` : undefined}
                onSubmitEditing={() => void save(key.preset)}
              />
              <View style={styles.actions}>
                <Button label={busy ? 'Comprobando' : 'Guardar'} primary busy={busy} onPress={() => void save(key.preset)} />
                <Button
                  label="Cancelar"
                  disabled={busy}
                  onPress={() => {
                    setEditing(null)
                    setCredential('')
                  }}
                />
              </View>
            </>
          ) : (
            <View style={styles.actions}>
              <Button
                label={key.configured ? 'Cambiar clave' : 'Poner mi clave'}
                disabled={busy}
                onPress={() => {
                  setEditing(key.preset)
                  setCredential('')
                  setNotice(null)
                }}
              />
              {key.configured ? <Button label="Quitar" disabled={busy} onPress={() => remove(key)} /> : null}
            </View>
          )}
        </View>
      ))}

      {notice ? <Text style={[styles.notice, notice.ok ? styles.ok : styles.error]}>{notice.text}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: theme.radius, padding: 14, gap: 12 },
  label: { fontFamily: theme.fonts.display, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.inkDim },
  hint: { fontFamily: theme.fonts.serif, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  row: { gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 },
  provider: { fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.ink },
  status: { fontFamily: theme.fonts.serif, fontSize: 13, lineHeight: 18, color: theme.colors.inkDim },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  notice: { fontFamily: theme.fonts.serif, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 8, padding: 8 },
  ok: { color: '#bbf7d0', borderColor: 'rgba(34, 197, 94, 0.45)', backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  error: { color: theme.colors.danger, borderColor: theme.colors.accentBright, backgroundColor: theme.colors.warning },
})
