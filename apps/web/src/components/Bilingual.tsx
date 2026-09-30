'use client'

import type { ReactNode } from 'react'
import { useLanguage } from '../lib/i18n'

/**
 * Una pagina con su texto completo en cada idioma (i18n), para documentos que
 * no se parten en frases: los legales. La pagina sigue siendo de servidor y
 * conserva su metadata; aqui solo se elige cual version se ve.
 */
export function Bilingual({ es, en }: { es: ReactNode; en: ReactNode }) {
  const { lang } = useLanguage()
  return <>{lang === 'en' ? en : es}</>
}

/** Aviso al inicio de una traduccion de cortesia. */
export function ConvenienceNote({ children }: { children: ReactNode }) {
  return (
    <p className="hint" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}>
      {children}
    </p>
  )
}
