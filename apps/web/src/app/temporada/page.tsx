'use client'

import { language, t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type BlessingState, type DiscovererPass } from '@rpg-ngn/api-client'
import { achievementProgress, chaptersLabel, nextRewardText, pathProgress, rewardStatus, seasonDaysLeft, streakText } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Panel } from '../../components/Panel'
import { CatalogCheckout } from '../../components/payments/Checkout'
import { RequireSession } from '../../components/RequireSession'
import { AppShell } from '../../components/shell/AppShell'

/**
 * El pase de descubridor de la temporada (docs de monetizacion, seccion 6):
 * capitulos, racha, los 4 bloques del camino y los logros. Es la pista
 * gratuita; el Llamado del bardo y la Liberacion vendran encima.
 */
export default function SeasonPassPage() {
  return (
    <RequireSession>
      {({ client, user, unauthorized, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <SeasonPass client={client} unauthorized={unauthorized} />
        </AppShell>
      )}
    </RequireSession>
  )
}

function SeasonPass({ client, unauthorized }: { client: ApiClient; unauthorized: (notice?: string) => void }) {
  const [pass, setPass] = useState<DiscovererPass | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client
      .discovererPass()
      .then(setPass)
      .catch((caught) => {
        if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
        else setError(caught instanceof Error ? caught.message : String(caught))
      })
  }, [client, unauthorized])

  if (error) return <div className="page en-shell"><div className="error">{error}</div></div>
  if (pass === undefined) return <div className="page en-shell"><p className="hint">{t('seasonPage.cargando')}</p></div>
  if (pass === null) {
    return (
      <div className="page en-shell">
        <h1 className="pagina-titulo">{t('seasonPage.temporada')}</h1>
        <p className="pagina-sub">{t('seasonPage.entreTemporadasLaSiguiente')}</p>
      </div>
    )
  }

  const avance = Math.round(pathProgress(pass) * 100)
  const dias = seasonDaysLeft(pass.season.endsAt)

  return (
    <div className="page en-shell pase-page">
      <h1 className="pagina-titulo">{pass.season.name}</h1>
      <p className="pagina-sub">
        {t('seasonPage.paseDeDescubridor')} · {dias === 1 ? t('seasonPage.queda1Dia') : t('seasonPage.quedanNDias', { days: dias })}
      </p>

      <div className="hojas">
        <Panel title={t('seasonPage.tuAvance')}>
          <div className="pase-resumen">
            <div className="pase-capitulos">
              <b>{pass.chapters}</b>
              <span>{pass.chapters === 1 ? t('common.capituloWord') : t('common.capitulosWord')}</span>
            </div>
            <div className="pase-textos">
              <p>{nextRewardText(pass)}</p>
              <p className={pass.streak > 0 && !pass.playedToday ? 'pase-aviso' : 'hint'}>{streakText(pass)}</p>
            </div>
          </div>
          <div className="pase-barra" role="progressbar" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100} aria-label={t('seasonPage.avanceDelCamino')}>
            <span style={{ width: `${avance}%` }} />
          </div>
          <p className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
            {t('seasonPage.cadaTurnoQueJuegas')}
          </p>
        </Panel>

        {pass.blocks.map((block) => (
          <Panel key={block.index} title={t('play.block', { index: block.index })}>
            <ol className="pase-premios">
              {block.rewards.map((r) => (
                <li key={r.position} className={`pase-premio ${r.kind}${r.earned ? ' ganado' : ''}`}>
                  <span className="pase-umbral">{r.kind === 'soon' ? '···' : chaptersLabel(r.threshold)}</span>
                  <strong>{r.label}</strong>
                  {r.description ? <small>{r.description}</small> : null}
                  <em>{rewardStatus(r, pass.chapters)}</em>
                  {r.kind === 'world' && r.packId ? (
                    <Link href={`/mundos/explorar/${encodeURIComponent(r.packId)}`} className="pase-ver">
                      {t('seasonPage.verLaHistoria')}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          </Panel>
        ))}

        <BlessingOffer client={client} />

        <Panel title={t('seasonPage.logros')}>
          <ul className="pase-logros">
            {pass.achievements.map((a) => (
              <li key={a.code} className={a.done ? 'hecho' : ''}>
                <div>
                  <strong>{a.label}</strong>
                  <small>{a.description}</small>
                </div>
                <span className="pase-puntos">+{chaptersLabel(a.points)}</span>
                <em>{achievementProgress(a)}</em>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t('seasonPage.tuColeccion')}>
          <p className="premise">{t('seasonPage.loQueGanasEn')}</p>
          <Link href="/coleccion" className="btn">
            {t('seasonPage.verMiColeccion')}
          </Link>
        </Panel>
      </div>
    </div>
  )
}

/**
 * La Bendicion del bardo a la venta (30-09): 30 dias de turnos diarios.
 * Con una activa se puede sumar otros 30 hasta el tope de 180.
 */
function BlessingOffer({ client }: { client: ApiClient }) {
  const [state, setState] = useState<BlessingState | null>(null)
  const [buying, setBuying] = useState(false)
  const load = useCallback(async () => {
    try {
      setState(await client.blessing())
    } catch {
      setState(null)
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load])

  if (!state) return null
  const price = `${(state.price.amount / 100).toFixed(2)} ${state.price.currency}`

  return (
    <Panel title={t('blessing.title')}>
      <p className="premise">{t('blessing.cardText', { first: 10, daily: state.turnsPerDay })}</p>
      {state.active && state.endsAt ? <p className="hint">{t('blessing.activeUntil', { date: new Date(state.endsAt).toLocaleDateString(language() === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'long' }) })}</p> : null}
      {state.canBuy ? (
        <button type="button" className="btn primary" onClick={() => setBuying(true)}>
          {state.active ? t('blessing.extend', { price }) : t('blessing.buy', { price })}
        </button>
      ) : (
        <p className="hint">{t('blessing.capReached')}</p>
      )}
      <p className="hint">{t('blessing.refundNote')}</p>
      {buying ? <CatalogCheckout client={client} product={{ kind: 'bendicion', name: t('blessing.title') }} onClose={() => setBuying(false)} onDone={load} /> : null}
    </Panel>
  )
}
