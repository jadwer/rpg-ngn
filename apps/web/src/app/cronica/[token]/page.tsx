'use client'

import { createApiClient, normalizeBaseUrl, type Chronicle } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { WEB_HEADER, useSession } from '../../../lib/session'

/**
 * La cronica compartida de una mesa (docs/24, seccion 4). Publica y sin
 * cuenta: es lo que se enseña a quien no jugo. Solo existe si toda la mesa
 * acepto; si alguien la retira, esta pagina deja de encontrarla.
 *
 * Se lee como un libro: por sesiones, y en cada turno primero lo que
 * hicieron los personajes y despues lo que paso.
 */
export default function CronicaPage() {
  const params = useParams<{ token: string }>()
  const token = typeof params.token === 'string' ? params.token : ''
  const session = useSession()
  const [chronicle, setChronicle] = useState<Chronicle | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!token) return
    let alive = true
    const client = createApiClient({
      baseUrl: normalizeBaseUrl(session.serverUrl),
      tokenProvider: () => null,
      fetch: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...WEB_HEADER }, credentials: 'omit' }),
    })
    void client.chronicle(token).then(
      (c) => {
        if (alive) setChronicle(c)
      },
      () => {
        if (alive) setMissing(true)
      },
    )
    return () => {
      alive = false
    }
  }, [token, session.serverUrl])

  if (missing) {
    return (
      <main className="page narrow cronica">
        <h1>Esta historia no se comparte</h1>
        <p className="hint">El enlace no existe, alguien de la mesa lo retiró o todavía no aceptaron todos.</p>
        <Link href="/" className="btn">
          Conocer Ad Astra Mentis
        </Link>
      </main>
    )
  }
  if (!chronicle) {
    return (
      <main className="page narrow cronica">
        <p className="hint">Cargando la historia...</p>
      </main>
    )
  }

  return (
    <main className="page narrow cronica">
      <header className="cronica-head">
        <p className="kicker">{chronicle.pack.name ?? 'Una historia'} · Ad Astra Mentis</p>
        <h1>{chronicle.title}</h1>
        {chronicle.players ? (
          <p className="hint">
            La jugaron{' '}
            {chronicle.players
              .filter((p) => p.name)
              .map((p) => (p.character ? `${p.name} (${p.character})` : p.name))
              .join(', ')}
            .
          </p>
        ) : null}
      </header>

      {chronicle.sessions.length === 0 ? <p className="hint">Esta mesa todavía no ha jugado ningún turno.</p> : null}

      {chronicle.sessions.map((s) => (
        <section key={s.code} className="cronica-session">
          <h2>Sesión {s.code}</h2>
          {s.turns.map((turn) => (
            <article key={turn.number} className="cronica-turn">
              {turn.actions.length > 0 ? (
                <ul className="cronica-actions">
                  {turn.actions.map((a, i) => (
                    <li key={i}>
                      <b>{a.character}</b>: {a.text}
                    </li>
                  ))}
                </ul>
              ) : null}
              {turn.blocks.map((b, i) =>
                b.type === 'narration' ? (
                  <p key={i} className="cronica-narration">
                    {b.text}
                  </p>
                ) : b.type === 'dialogue' ? (
                  <p key={i} className="cronica-dialogue">
                    <b>{b.speaker}</b>: «{b.text}»
                  </p>
                ) : (
                  <p key={i} className="cronica-roll">
                    {b.actor} tira {b.die}: {b.result}. {b.text}
                  </p>
                ),
              )}
            </article>
          ))}
        </section>
      ))}

      <footer className="cronica-foot">
        <p>Una historia jugada en Ad Astra Mentis, donde tú decides qué pasa: tu novela ligera o tu campaña de rol, con un director de juego que no se cansa.</p>
        <Link href="/crear-cuenta" className="btn">
          Jugar la tuya
        </Link>
      </footer>
    </main>
  )
}
