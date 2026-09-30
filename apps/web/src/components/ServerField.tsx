'use client'

import { t } from '@rpg-ngn/i18n'
import { useState } from 'react'

/**
 * Campo "Servidor de la API", plegado: casi nadie lo necesita. Con la
 * direccion de esta misma web (lo normal) las peticiones pasan por el
 * proxy de Next y el token vive en una cookie httpOnly; con otra URL el
 * navegador le pega directo a esa API, con token en localStorage y CORS.
 */
export function ServerField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const sameOrigin = typeof window !== 'undefined' && value.trim().replace(/\/+$/, '') === window.location.origin

  if (!open) {
    return (
      <p className="hint" style={{ margin: 0 }}>
        {sameOrigin || !value ? t('auth.server.sameOrigin') : t('auth.server.direct', { url: value })}{' '}
        <button type="button" className="linklike" onClick={() => setOpen(true)}>
          {t('auth.server.change')}
        </button>
      </p>
    )
  }

  return (
    <label className="field">
      <span>{t('auth.server.label')}</span>
      <input className="input" name="servidor" value={value} onChange={(e) => onChange(e.target.value)} placeholder="http://192.168.100.11:8010" autoComplete="url" inputMode="url" />
      <span className="hint" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-serif)' }}>
        {t('auth.server.help')}
      </span>
    </label>
  )
}
