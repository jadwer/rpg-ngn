import { t } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { theme } from '../theme'
import { Button } from './Button'

/** Cinco estrellas y la reseña del mundo (docs/26, H6), como la web. */
export function RatingForm({ client, tableId }: { client: ApiClient; tableId: string }) {
  const [stars, setStars] = useState(0)
  const [review, setReview] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    client.tableRating(tableId).then(
      (mine) => {
        if (!alive || !mine) return
        setStars(mine.stars)
        setReview(mine.review ?? '')
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [client, tableId])

  const save = async () => {
    if (stars === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      await client.rateTable(tableId, stars, review.trim() || null)
      setSaved(true)
    } catch {
      setError(t('ending.rateFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel={t('ending.rateLabel')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => (setStars(n), setSaved(false))} accessibilityRole="radio" accessibilityState={{ checked: stars === n }} hitSlop={6}>
            <Text style={[styles.star, n <= stars && styles.starOn]}>★</Text>
          </Pressable>
        ))}
      </View>
      {stars > 0 ? (
        <>
          <TextInput value={review} onChangeText={(v) => (setReview(v), setSaved(false))} multiline maxLength={1000} placeholder={t('ending.reviewLabel')} placeholderTextColor={theme.colors.inkFaint} style={styles.input} />
          <Text style={styles.hint}>{t('ending.reviewHint')}</Text>
          <Button label={t('ending.rateSave')} small busy={busy} onPress={() => void save()} />
        </>
      ) : null}
      {saved ? <Text style={styles.ok}>{t('ending.rateSaved')}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 34, color: theme.colors.border },
  starOn: { color: theme.colors.goldBright },
  input: { alignSelf: 'stretch', minHeight: 72, fontFamily: theme.fonts.serif, fontSize: 16, color: theme.colors.ink, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 8, padding: 10, textAlignVertical: 'top' },
  hint: { fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.inkDim, textAlign: 'center' },
  ok: { fontFamily: theme.fonts.uiMedium, fontSize: 13, color: theme.colors.success },
  error: { fontFamily: theme.fonts.ui, fontSize: 13, color: theme.colors.danger },
})
