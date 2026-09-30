'use client'

import { t } from '@rpg-ngn/i18n'
import { ApiError, type ApiClient, type Collection } from '@rpg-ngn/api-client'
import { COLLECTION_GALLERIES, galleryLabel } from '@rpg-ngn/ui-logic'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Panel } from '../../components/Panel'
import { RequireSession } from '../../components/RequireSession'
import { AppShell } from '../../components/shell/AppShell'

/**
 * La coleccion: lo ganado en los pases, por galeria. No se pierde al cerrar
 * la temporada (docs de monetizacion, 12b). Los beneficios por tiempo dicen
 * hasta cuando valen.
 */
export default function CollectionPage() {
  return (
    <RequireSession>
      {({ client, user, unauthorized, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <CollectionView client={client} unauthorized={unauthorized} />
        </AppShell>
      )}
    </RequireSession>
  )
}

function CollectionView({ client, unauthorized }: { client: ApiClient; unauthorized: (notice?: string) => void }) {
  const [items, setItems] = useState<Collection | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client
      .collection()
      .then(setItems)
      .catch((caught) => {
        if (caught instanceof ApiError && caught.isUnauthorized) unauthorized()
        else setError(caught instanceof Error ? caught.message : String(caught))
      })
  }, [client, unauthorized])

  const galleries = items ? [...COLLECTION_GALLERIES.map((g) => g.code), ...Object.keys(items).filter((k) => !COLLECTION_GALLERIES.some((g) => g.code === k))] : []
  const empty = items !== null && Object.values(items).every((list) => list.length === 0)

  return (
    <div className="page en-shell pase-page">
      <h1 className="pagina-titulo">{t('collectionPage.tuColeccion')}</h1>
      <p className="pagina-sub">{t('collectionPage.loQueHasGanado')}</p>
      {error ? <div className="error">{error}</div> : null}
      {items === null && !error ? <p className="hint">{t('collectionPage.cargando')}</p> : null}
      {empty ? (
        <div className="hojas">
          <Panel>
            <p className="premise">{t('collectionPage.aunNoTienesNada')}</p>
            <Link href="/temporada" className="btn primary">
              {t('collectionPage.verElPase')}
            </Link>
          </Panel>
        </div>
      ) : null}
      {items && !empty ? (
        <div className="hojas">
          {galleries
            .filter((g) => (items[g] ?? []).length > 0)
            .map((g) => (
              <Panel key={g} title={galleryLabel(g)}>
                <ul className="coleccion-lista">
                  {(items[g] ?? []).map((item, i) => (
                    <li key={`${item.code}-${i}`} className={item.active ? '' : 'vencido'}>
                      <strong>{item.label}</strong>
                      <small>
                        {item.season ?? ''}
                        {item.expiresAt ? ` · ${item.active ? 'vale hasta' : 'venció el'} ${new Date(item.expiresAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}` : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
        </div>
      ) : null}
    </div>
  )
}
