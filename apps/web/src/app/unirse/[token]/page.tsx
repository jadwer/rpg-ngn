'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, createApiClient, normalizeBaseUrl, type InvitePreview } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { LanguageMenu } from '../../../components/LanguageMenu'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { WEB_HEADER, useSession } from '../../../lib/session'

/**
 * Donde acaba el enlace de una mesa (docs/18, D-UX-1).
 *
 * Es la pantalla que sustituye a los seis pasos de antes (dar tu correo por
 * WhatsApp, solicitud de amistad, aceptarla, esperar la invitacion). Por eso
 * hace dos cosas y ninguna mas:
 *
 * 1. **Dice a que te invitan antes de pedirte nada**: nombre de la mesa, quien
 *    invita y cuantos sitios quedan. Sin cuenta y sin haber entrado.
 * 2. Si ya tienes sesion, entras de un clic. Si no, te manda a crear cuenta y
 *    **vuelves aqui**, porque perder el enlace por el camino es la forma mas
 *    facil de perder a la persona.
 */
export default function UnirsePage() {
  const params = useParams<{ token: string }>()
  const token = typeof params.token === 'string' ? params.token : ''
  const router = useRouter()
  const session = useSession()

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const anonClient = useCallback(
    () =>
      createApiClient({
        baseUrl: normalizeBaseUrl(session.serverUrl),
        tokenProvider: () => null,
        fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'same-origin' }),
      }),
    [session.serverUrl],
  )

  useEffect(() => {
    if (!token) return
    let alive = true
    void anonClient()
      .invitePreview(token)
      .then(
        (p) => {
          if (alive) setPreview(p)
        },
        (caught: unknown) => {
          if (alive) setError(caught instanceof Error ? caught.message : String(caught))
        },
      )
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [token, anonClient])

  const entrar = async () => {
    setBusy(true)
    setError(null)
    try {
      const tableId = await (session.client ?? anonClient()).acceptInvite(token)
      router.push(`/mesas/${tableId}`)
    } catch (caught) {
      if (caught instanceof ApiError && caught.isUnauthorized) {
        // Sin sesion: que vuelva aqui despues de entrar o registrarse.
        router.push(`/entrar?volver=${encodeURIComponent(`/unirse/${token}`)}`)
        return
      }
      setError(caught instanceof Error ? caught.message : String(caught))
      setBusy(false)
    }
  }

  return (
    <main className="page narrow">
      <header className="hero">
        <h1>
          <Link href="/" className="plain">
            Ad Astra Mentis
          </Link>
        </h1>
        <p className="tagline">{t('joinPage.teInvitaronAUna')}</p>
      </header>
      <hr className="rule" />

      {loading ? <p className="hint">{t('joinPage.buscandoLaMesa')}</p> : null}

      {!loading && error && !preview ? (
        <div className="card stack">
          <p>{error}</p>
          <p className="hint">{t('joinPage.siCreesQueEs')}</p>
          <Link href="/" className="btn">
            {t('joinPage.irAlInicio')}
          </Link>
        </div>
      ) : null}

      {preview ? (
        <div className="card stack">
          <h2 className="invite-name">{preview.tableName}</h2>
          {preview.hostName ? <p className="hint">{t('joinPage.teInvita', { name: preview.hostName })}</p> : null}
          <p className="hint">
            {preview.alreadyMember
              ? t('play.alreadyMember')
              : preview.seatsLeft === 1
                ? t('play.oneSeatLeft')
                : t('play.seatsLeft', { count: preview.seatsLeft })}
          </p>

          {error ? <div className="error">{error}</div> : null}

          <div className="row">
            <button type="button" className="btn primary" disabled={busy} onClick={() => void entrar()}>
              {busy ? <span className="spinner" aria-hidden /> : null}
              {preview.alreadyMember ? t('play.goToTable') : t('play.joinTable')}
            </button>
          </div>

          {!session.client ? (
            <p className="hint">
              {t('joinPage.siNoTienesCuenta')} <Link href="/terminos">{t('joinPage.terminos')}</Link> {t('joinPage.y')}{' '}
              <Link href="/privacidad">{t('joinPage.avisoDePrivacidad')}</Link>.
            </p>
          ) : null}

          <p className="hint">{t('joinPage.aquiElDirectorDe')}</p>
        </div>
      ) : null}
      <div className="lang-corner">
        <LanguageMenu />
      </div>
    </main>
  )
}
