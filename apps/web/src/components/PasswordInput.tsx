'use client'

import { t } from '@rpg-ngn/i18n'
import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Campo de contraseña con el ojo para verla. Sin el, un tester no pasaba del
 * registro: las dos contraseñas no coincidian y con puntitos no habia como
 * saber cual estaba mal (20-10). Todo campo de contraseña de la web va por
 * aqui; en la app es `Field` con `secureTextEntry`.
 */
export function PasswordInput({ className, ...input }: Props) {
  const [visible, setVisible] = useState(false)
  const label = visible ? t('auth.hidePassword') : t('auth.showPassword')
  return (
    <span className="password-field">
      <input {...input} className={className ?? 'input'} type={visible ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button type="button" className="password-toggle" onClick={() => setVisible((v) => !v)} aria-label={label} aria-pressed={visible} title={label}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible ? null : <path d="M4 4l16 16" />}
        </svg>
      </button>
    </span>
  )
}
