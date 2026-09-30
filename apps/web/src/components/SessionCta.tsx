'use client'

import { t } from '@rpg-ngn/i18n'
import Link from 'next/link'
import { useSession } from '../lib/session'

interface Props {
  /** `hero`: el boton grande de la portada; `nav`: los dos enlaces chicos de la barra; `landing`: el par clasico. */
  variant?: 'landing' | 'hero' | 'nav'
}

/** Botones de la portada: entrar o crear cuenta; con sesion viva, directo a las mesas. */
export function SessionCta({ variant = 'landing' }: Props) {
  const session = useSession()
  const dentro = session.stage.name === 'ready' && !!session.user

  if (variant === 'nav') {
    return dentro ? (
      <Link href="/mesas" className="btn primary small">
        {t('cta.tusMesas')}
      </Link>
    ) : (
      <>
        <Link href="/entrar" className="btn ghost small">
          {t('cta.iniciarSesion')}
        </Link>
        <Link href="/crear-cuenta" className="btn primary small">
          {t('cta.comienzaAhora')}
        </Link>
      </>
    )
  }

  if (variant === 'hero') {
    return dentro ? (
      <div className="cta">
        <Link href="/mesas" className="btn primary big">
          {t('cta.irATusMesas')}
        </Link>
        <span className="hint">Sigues dentro como {session.user?.name}.</span>
      </div>
    ) : (
      <div className="cta">
        <Link href="/crear-cuenta" className="btn primary big">
          {t('cta.comienzaTuHistoria')}
        </Link>
        <Link href="/entrar" className="btn ghost">
          {t('cta.yaTengoCuenta')}
        </Link>
      </div>
    )
  }

  if (dentro) {
    return (
      <div className="cta">
        <Link href="/mesas" className="btn primary">
          {t('cta.tusMesas')}
        </Link>
        <span className="hint">Sigues dentro como {session.user?.name}.</span>
      </div>
    )
  }

  return (
    <div className="cta">
      <Link href="/entrar" className="btn primary">
        {t('cta.entrar')}
      </Link>
      <Link href="/crear-cuenta" className="btn">
        {t('cta.crearCuenta')}
      </Link>
    </div>
  )
}
