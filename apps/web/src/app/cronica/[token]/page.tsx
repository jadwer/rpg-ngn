'use client'

import { t } from '@rpg-ngn/i18n'
import { createApiClient, normalizeBaseUrl, type Chronicle } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WEB_HEADER, useSession } from '../../../lib/session'

/**
 * La cronica compartida de una mesa (docs/24, seccion 4). Publica y sin
 * cuenta: es lo que se enseña a quien no jugo. Solo existe si toda la mesa
 * acepto; si alguien la retira, esta pagina deja de encontrarla.
 *
 * Se lee como un libro: por sesiones, y en cada turno primero lo que
 * hicieron los personajes y despues lo que paso. Si la historia ya tiene la
 * voz del narrador (6c, 02-10), se escucha de corrido desde la barra o desde
 * cualquier bloque, y el que suena se resalta y se mantiene a la vista.
 */
export default function CronicaPage() {
  const params = useParams<{ token: string }>()
  const token = typeof params.token === 'string' ? params.token : ''
  const session = useSession()
  const [chronicle, setChronicle] = useState<Chronicle | null>(null)
  const [missing, setMissing] = useState(false)
  const player = useNarration(chronicle)

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
        <h1>{t('chroniclePage.estaHistoriaNoSe')}</h1>
        <p className="hint">{t('chroniclePage.elEnlaceNoExiste')}</p>
        <Link href="/" className="btn">
          {t('chroniclePage.conocerAdAstraMentis')}
        </Link>
      </main>
    )
  }
  if (!chronicle) {
    return (
      <main className="page narrow cronica">
        <p className="hint">{t('chroniclePage.cargandoLaHistoria')}</p>
      </main>
    )
  }

  return (
    <main className="page narrow cronica">
      <header className="cronica-head">
        <p className="kicker">{chronicle.pack.name ?? t('play.aStory')} · Ad Astra Mentis</p>
        <h1>{chronicle.title}</h1>
        {chronicle.players ? (
          <p className="hint">
            {t('chroniclePage.laJugaron', {
              names: chronicle.players
                .filter((p) => p.name)
                .map((p) => (p.character ? `${p.name} (${p.character})` : p.name))
                .join(', '),
            })}
          </p>
        ) : null}
        {/* Mundo derivado de obra ajena: el deslinde va siempre a la vista (Gabino, 03-10). */}
        {chronicle.pack.derived ? <p className="hint cronica-deslinde">{t('chroniclePage.derivedNotice')}</p> : null}
      </header>

      <div className="row cronica-presentar">
        <Link href={`/cronica/${token}/presentacion?formato=vertical`} className="btn small">
          {t('chroniclePage.presentacionVertical')}
        </Link>
        <Link href={`/cronica/${token}/presentacion?formato=horizontal`} className="btn small">
          {t('chroniclePage.presentacionHorizontal')}
        </Link>
      </div>

      {player.total > 0 ? (
        <div className="cronica-player" role="region" aria-label={t('chroniclePage.vozNarrador')}>
          {player.index === null ? (
            <button type="button" className="btn primary" onClick={() => player.play(0)}>
              ▶ {t('chroniclePage.escuchar')}
            </button>
          ) : (
            <>
              <button type="button" className="btn primary" onClick={player.toggle}>
                {player.paused ? `▶ ${t('chroniclePage.seguir')}` : `❚❚ ${t('chroniclePage.pausar')}`}
              </button>
              <button type="button" className="btn ghost small" onClick={player.stop}>
                {t('chroniclePage.detener')}
              </button>
              <span className="hint">{t('chroniclePage.narrando', { n: player.index + 1, total: player.total })}</span>
            </>
          )}
        </div>
      ) : null}

      {chronicle.sessions.length === 0 ? <p className="hint">{t('chroniclePage.estaMesaTodaviaNo')}</p> : null}

      {chronicle.sessions.map((s) => (
        <section key={s.code} className="cronica-session">
          <h2>{t('chroniclePage.sesionCodigo', { code: s.code })}</h2>
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
                b.type === 'narration' || b.type === 'dialogue' ? (
                  <div key={i} className={`cronica-voz${b.audioUrl && player.current === b.audioUrl ? ' sonando' : ''}`} ref={b.audioUrl ? player.refFor(b.audioUrl) : undefined}>
                    {b.type === 'narration' ? (
                      <p className="cronica-narration">{b.text}</p>
                    ) : (
                      <p className="cronica-dialogue">
                        <b>{b.speaker}</b>: «{b.text}»
                      </p>
                    )}
                    {b.audioUrl ? (
                      <button type="button" className="cronica-desde" onClick={() => player.playUrl(b.audioUrl!)} aria-label={t('chroniclePage.escucharDesdeAqui')} title={t('chroniclePage.escucharDesdeAqui')}>
                        ▶
                      </button>
                    ) : null}
                  </div>
                ) : b.type === 'image' ? (
                  <figure key={i} className="scene-image loaded">
                    <img src={b.url} alt={b.alt} loading="lazy" />
                  </figure>
                ) : (
                  <p key={i} className="cronica-roll">
                    {t('chroniclePage.tira', { actor: b.actor, die: b.die, result: b.result })} {b.text}
                  </p>
                ),
              )}
            </article>
          ))}
        </section>
      ))}

      <footer className="cronica-foot">
        {chronicle.pack.derived ? <p className="hint cronica-deslinde">{t('chroniclePage.derivedNotice')}</p> : null}
        <p>{t('chroniclePage.unaHistoriaJugadaEn')}</p>
        <Link href="/crear-cuenta" className="btn">
          {t('chroniclePage.jugarLaTuya')}
        </Link>
      </footer>
    </main>
  )
}

/**
 * La voz del narrador de corrido: la lista de audios en el orden de la
 * cronica y un solo <audio> que pasa al siguiente al terminar. El bloque que
 * suena se desplaza a la vista.
 */
function useNarration(chronicle: Chronicle | null) {
  const urls = useMemo(
    () =>
      (chronicle?.sessions ?? []).flatMap((s) =>
        s.turns.flatMap((turn) => turn.blocks.flatMap((b) => ((b.type === 'narration' || b.type === 'dialogue') && b.audioUrl ? [b.audioUrl] : []))),
      ),
    [chronicle],
  )
  const audio = useRef<HTMLAudioElement | null>(null)
  const nodes = useRef(new Map<string, HTMLDivElement>())
  const [index, setIndex] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)

  const play = useCallback(
    (at: number) => {
      const url = urls[at]
      if (!url) {
        setIndex(null)
        return
      }
      if (!audio.current) audio.current = new Audio()
      const el = audio.current
      el.src = url
      el.onended = () => play(at + 1)
      void el.play().catch(() => setPaused(true))
      setIndex(at)
      setPaused(false)
      nodes.current.get(url)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [urls],
  )

  useEffect(() => () => audio.current?.pause(), [])

  return {
    total: urls.length,
    index,
    paused,
    current: index === null ? null : (urls[index] ?? null),
    play,
    playUrl: (url: string) => play(Math.max(0, urls.indexOf(url))),
    toggle: () => {
      const el = audio.current
      if (!el) return
      if (el.paused) {
        void el.play()
        setPaused(false)
      } else {
        el.pause()
        setPaused(true)
      }
    },
    stop: () => {
      audio.current?.pause()
      setIndex(null)
      setPaused(false)
    },
    refFor: (url: string) => (node: HTMLDivElement | null) => {
      if (node) nodes.current.set(url, node)
      else nodes.current.delete(url)
    },
  }
}
