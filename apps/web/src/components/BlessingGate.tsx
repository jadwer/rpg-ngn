'use client'

import { t } from '@rpg-ngn/i18n'
import type { BlessingState } from '@rpg-ngn/api-client'
import { blessingDaysText, blessingDue } from '@rpg-ngn/ui-logic'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../lib/session'

/** Cada cuanto se pregunta si ya hay turnos: a las 3 am aparece en menos de un minuto. */
const POLL_MS = 60_000

/**
 * El aviso diario de la Bendicion del bardo (Gabino, 30-09): a pantalla
 * completa y encima de lo que se este haciendo, incluso a media mesa, en
 * cuanto hay turnos por recoger. Solo se cierra con "Recoger". Muestra el
 * tema de la temporada y cuantos dias quedan. Montado una vez en el layout.
 */
export function BlessingGate() {
  const { client, user } = useSession()
  // La presentacion de una cronica se graba en pantalla completa: el aviso no la tapa (02-10).
  const recording = (usePathname() ?? '').endsWith('/presentacion')
  const [state, setState] = useState<BlessingState | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const check = useCallback(async () => {
    if (!client) return
    try {
      setState(await client.blessing())
    } catch {
      // Sin red o sin sesion: se vuelve a intentar en la siguiente vuelta.
    }
  }, [client])

  useEffect(() => {
    if (!client || !user) {
      setState(null)
      return
    }
    void check()
    const timer = window.setInterval(() => void check(), POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [client, user, check])

  const collect = async () => {
    if (!client || busy) return
    setBusy(true)
    setError(null)
    try {
      const turns = state?.turnsPerDay ?? 0
      const next = await client.claimBlessing()
      setDone(turns)
      window.setTimeout(() => {
        setDone(null)
        setState(next)
      }, 1600)
    } catch {
      // Un 409 es que ya se recogio (en otra pestaña): se vuelve a leer.
      setError(t('blessing.collectFailed'))
      await check()
    } finally {
      setBusy(false)
    }
  }

  if (recording || !state || (!blessingDue(state) && done === null)) return null

  return (
    <div className="blessing-gate" role="dialog" aria-modal="true" aria-labelledby="blessing-title">
      <div className="blessing-card">
        <p className="blessing-kicker">{t('blessing.kicker')}</p>
        <h2 id="blessing-title">{t('blessing.title')}</h2>
        {state.theme ? <p className="blessing-theme">{t('blessing.theme', { name: state.theme.name })}</p> : null}
        <p className="blessing-turns">{t('blessing.todayTurns', { n: state.turnsPerDay })}</p>
        {done !== null ? (
          <p className="blessing-done" role="status">
            {t('blessing.collected', { n: done })}
          </p>
        ) : (
          <>
            <p className="blessing-days">{blessingDaysText(state)}</p>
            {error ? <p className="error">{error}</p> : null}
            <button type="button" className="btn primary blessing-collect" onClick={() => void collect()} disabled={busy} autoFocus>
              {t('blessing.collect')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
