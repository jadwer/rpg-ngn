'use client'

import type { LoadedPack } from '@rpg-ngn/content'
import { language as uiLanguage } from '@rpg-ngn/i18n'
import { useEffect, useState } from 'react'
import { loadBundledPack } from './pack'

/**
 * El pack empaquetado, cargado una vez por pestaña e idioma; null mientras
 * valida. Dentro de una mesa, el idioma de la mesa; fuera, el de la interfaz.
 */
export function usePack(language?: string): { pack: LoadedPack | null; error: string | null } {
  const lang = language ?? uiLanguage()
  const [pack, setPack] = useState<LoadedPack | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadBundledPack(lang).then(
      (loaded) => {
        if (alive) setPack(loaded)
      },
      (caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : String(caught))
      },
    )
    return () => {
      alive = false
    }
  }, [lang])
  return { pack, error }
}
