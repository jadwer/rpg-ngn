'use client'

import { packPortraitUrl, type ApiClient, type PackSheets } from '@rpg-ngn/api-client'
import { useEffect, useState } from 'react'
import { Portrait } from './Portrait'

interface Props {
  client: ApiClient
  packId: string
  version: string
}

/**
 * Ver un mundo antes de añadirlo (entrega 8): quienes se pueden jugar y
 * cuantas sesiones trae, con sus retratos. Sin secretos: solo lo que ya
 * enseña la pantalla de elegir personaje.
 */
export function PackPreview({ client, packId, version }: Props) {
  const [sheets, setSheets] = useState<PackSheets | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    void client.listPackSheets(packId, version).then(
      (s) => {
        if (alive) setSheets(s)
      },
      () => {
        if (alive) setError(true)
      },
    )
    return () => {
      alive = false
    }
  }, [client, packId, version])

  if (error) return <p className="hint">No se pudo leer este mundo.</p>
  if (!sheets) return <p className="hint">Cargando...</p>

  return (
    <div className="pack-preview">
      <div className="party-grid">
        {sheets.characters.map((c) => (
          <div key={c.id} className="pc">
            <Portrait path={c.portrait} uri={packPortraitUrl(packId, c.portrait)} name={c.name} />
            <div className="n">{c.name}</div>
            <div className="r">
              {c.race}
              <br />
              {c.class}
            </div>
          </div>
        ))}
      </div>
      {sheets.sessions.length > 0 ? (
        <p className="hint">
          Sesiones: {sheets.sessions.map((s) => s.title).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
