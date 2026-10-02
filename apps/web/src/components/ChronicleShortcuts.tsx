'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient, ChronicleShare } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Los accesos a la historia de una mesa ya compartida: leerla y verla como
 * presentacion (02-10). Si aun no se comparte, dice donde se pide. Se usa en
 * Lectura y en el menu Opciones de cada mesa; recibe el estado si ya lo
 * tiene, o lo pide.
 */
export function ChronicleShortcuts({ client, tableId, share }: { client: ApiClient; tableId: string | number; share?: ChronicleShare | null }) {
  const [loaded, setLoaded] = useState<ChronicleShare | null | undefined>(share)
  // "Generar video" (el procesado en el servidor) es del plan Oro: por ahora solo lo anuncia (Gabino, 02-10).
  const [gold, setGold] = useState(false)

  useEffect(() => {
    if (share !== undefined) {
      setLoaded(share)
      return
    }
    let alive = true
    client.chronicleShare(String(tableId)).then(
      (s) => alive && setLoaded(s),
      () => alive && setLoaded(null),
    )
    return () => {
      alive = false
    }
  }, [client, tableId, share])

  if (loaded === undefined) return null
  if (!loaded?.public) return <p className="hint chronicle-shortcuts-hint">{t('chroniclePage.compartirParaVer')}</p>

  const base = `/cronica/${loaded.token}`
  return (
    <div className="chronicle-shortcuts">
      <Link href={base} className="btn ghost small">
        {t('chroniclePage.leerLaHistoria')}
      </Link>
      <Link href={`${base}/presentacion?formato=vertical`} className="btn ghost small">
        {t('chroniclePage.presentacionVertical')}
      </Link>
      <Link href={`${base}/presentacion?formato=horizontal`} className="btn ghost small">
        {t('chroniclePage.presentacionHorizontal')}
      </Link>
      <button type="button" className="btn ghost small video-oro" onClick={() => setGold((v) => !v)} aria-expanded={gold}>
        {t('chroniclePage.generarVideo')}
      </button>
      {gold ? (
        <p className="hint video-oro-aviso" role="status">
          {t('chroniclePage.videoOro')}
        </p>
      ) : null}
    </div>
  )
}
