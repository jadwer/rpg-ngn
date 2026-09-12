'use client'

import type { LoadedPack } from '@rpg-ngn/content'
import { useEffect, useState } from 'react'
import { loadBundledPack } from './pack'

/** El pack empaquetado, cargado una vez por pestaña; null mientras valida. */
export function usePack(): { pack: LoadedPack | null; error: string | null } {
  const [pack, setPack] = useState<LoadedPack | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadBundledPack().then(
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
  }, [])
  return { pack, error }
}
