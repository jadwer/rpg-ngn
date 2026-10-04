'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'

/**
 * Cinco estrellas y la reseña del mundo (docs/26, H6), en la pantalla de fin.
 * Trae la que ya habia dado quien mira; guardar otra la cambia.
 */
export function RatingForm({ client, tableId }: { client: ApiClient; tableId: string | number }) {
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
    <div className="rating-form">
      <div className="stars" role="radiogroup" aria-label={t('ending.rateLabel')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n}`} className={`star${n <= stars ? ' on' : ''}`} onClick={() => (setStars(n), setSaved(false))}>
            ★
          </button>
        ))}
      </div>
      {stars > 0 ? (
        <>
          <textarea className="textarea" rows={3} maxLength={1000} placeholder={t('ending.reviewLabel')} value={review} onChange={(e) => (setReview(e.target.value), setSaved(false))} />
          <p className="hint">{t('ending.reviewHint')}</p>
          <button type="button" className="btn small" disabled={busy} onClick={() => void save()}>
            {busy ? <span className="spinner" aria-hidden /> : null}
            {t('ending.rateSave')}
          </button>
        </>
      ) : null}
      {saved ? <p className="ok">{t('ending.rateSaved')}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
