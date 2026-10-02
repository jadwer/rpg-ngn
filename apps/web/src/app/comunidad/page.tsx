'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient, CommunityCreator, CommunityStory } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { FriendsPanel } from '../../components/FriendsPanel'
import { Panel } from '../../components/Panel'
import { PublicOrApp } from '../../components/shell/PublicOrApp'
import { useSession } from '../../lib/session'

/**
 * Comunidad (v1, 02-10, plan del lanzamiento): las historias que su mesa
 * acepto publicar, quienes crean mundos y, con cuenta, tus amigos. Se ve sin
 * cuenta, como Explorar mundos: es lo que se enseña en redes. La misma
 * pantalla que la pestaña de la app.
 */
export default function CommunityPage() {
  return <PublicOrApp returnTo="/comunidad">{(client, signedIn) => <Community client={client} signedIn={signedIn} />}</PublicOrApp>
}

function Community({ client, signedIn }: { client: ApiClient; signedIn: boolean }) {
  const { user, unauthorized } = useSession()
  const [stories, setStories] = useState<CommunityStory[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [creators, setCreators] = useState<CommunityCreator[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStories = useCallback(
    async (next: number) => {
      try {
        const result = await client.communityStories(next)
        setStories((current) => (next === 1 || current === null ? result.stories : [...current, ...result.stories]))
        setTotal(result.total)
        setPage(next)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught))
      }
    },
    [client],
  )

  useEffect(() => {
    void loadStories(1)
    client.communityCreators().then(setCreators, () => setCreators([]))
  }, [client, loadStories])

  return (
    <div className="page en-shell comunidad">
      <h1 className="pagina-titulo">{t('communityPage.comunidad')}</h1>
      <p className="pagina-sub">{t('communityPage.laGenteConLa')}</p>

      <section className="comunidad-seccion" aria-labelledby="historias">
        <h2 id="historias" className="comunidad-h2">
          {t('communityPage.historias')}
        </h2>
        <p className="hint">{t('communityPage.historiasSub')}</p>
        {error ? <div className="error">{error}</div> : null}
        {stories === null && !error ? <p className="hint">{t('collectionPage.cargando')}</p> : null}
        {stories?.length === 0 ? <p className="premise">{t('communityPage.historiasVacio')}</p> : null}
        <div className="historias">
          {stories?.map((story) => (
            <StoryCard key={story.token} story={story} />
          ))}
        </div>
        {stories && stories.length < total ? (
          <button type="button" className="btn" onClick={() => void loadStories(page + 1)}>
            {t('communityPage.verMas')}
          </button>
        ) : null}
      </section>

      <div className="hojas">
        <Panel title={t('communityPage.creadores')}>
          <p className="hint">{t('communityPage.creadoresSub')}</p>
          {creators?.length === 0 ? <p className="premise">{t('communityPage.creadoresVacio')}</p> : null}
          <ul className="creadores">
            {creators?.map((creator) => (
              <li key={creator.name}>
                <strong>{creator.name}</strong>
                <span className="hint">{creator.worlds.map((w) => w.name).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t('communityPage.amigos')}>
          {signedIn && user ? <FriendsPanel client={client} meId={user.id} onUnauthorized={unauthorized} /> : <p className="premise">{t('communityPage.entraParaAmigos')}</p>}
        </Panel>

        <Panel title={t('communityPage.pronto')}>
          <p className="premise">{t('communityPage.mesasAbiertas')}</p>
        </Panel>
      </div>
    </div>
  )
}

function StoryCard({ story }: { story: CommunityStory }) {
  const meta = story.sessions === 1 ? t('communityPage.sesionesTurnos', { sessions: story.sessions, turns: story.turns }) : t('communityPage.sesionesTurnosMany', { sessions: story.sessions, turns: story.turns })
  return (
    <Link href={`/cronica/${story.token}`} className="historia">
      {story.cover ? <img src={story.cover} alt="" loading="lazy" className="historia-portada" /> : <div className="historia-portada vacia" aria-hidden />}
      <div className="historia-cuerpo">
        {story.pack.name ? <span className="historia-mundo">{story.pack.name}</span> : null}
        <strong className="historia-titulo">{story.title}</strong>
        {story.excerpt ? <p className="historia-extracto">{story.excerpt}</p> : null}
        <span className="hint">{meta}</span>
        <span className="hint">{story.players ? t('communityPage.jugaron', { names: story.players.join(', ') }) : t('communityPage.mesaAnonima')}</span>
        <span className="historia-leer">{t('communityPage.leerHistoria')} →</span>
      </div>
    </Link>
  )
}
