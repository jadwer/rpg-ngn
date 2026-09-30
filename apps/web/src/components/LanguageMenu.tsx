'use client'

import { t, type Language } from '@rpg-ngn/i18n'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../lib/i18n'
import { useSession } from '../lib/session'

/** Globo con meridianos, el signo de idioma de siempre. */
const GLOBE = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c-2.6 2.6-2.6 15.4 0 18m0-18c2.6 2.6 2.6 15.4 0 18M3.5 9h17M3.5 15h17'

/**
 * El idioma, arriba a la derecha (Gabino, 29-09): un globo con el codigo
 * actual que abre la lista. Se ve tambien en el telefono. Con sesion la
 * eleccion se guarda en la cuenta, para que los correos lleguen en ese idioma.
 */
export function LanguageMenu() {
  const { lang, choose, languages } = useLanguage()
  const { client } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (l: Language) => {
    setOpen(false)
    if (l === lang) return
    // La cuenta guarda la preferencia; si falla, el navegador ya la recuerda.
    client?.updateProfile({ locale: l }).catch(() => undefined)
    choose(l)
  }

  return (
    <div className="sysmenu lang-menu" ref={ref}>
      <button type="button" className="lang-menu-btn" aria-label={t('common.language')} title={t('common.language')} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" className="shell-icon" aria-hidden>
          <path d={GLOBE} />
        </svg>
        <span className="code">{lang.toUpperCase()}</span>
      </button>
      {open ? (
        <div className="sysmenu-panel" role="menu" aria-label={t('common.language')}>
          {languages.map((l) => (
            <button key={l} type="button" role="menuitemradio" aria-checked={lang === l} lang={l} className={lang === l ? 'active' : undefined} onClick={() => pick(l)}>
              {t(`common.languages.${l}`)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
