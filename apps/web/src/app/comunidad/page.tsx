'use client'

import { t } from '@rpg-ngn/i18n'
import { FriendsPanel } from '../../components/FriendsPanel'
import { Panel } from '../../components/Panel'
import { RequireSession } from '../../components/RequireSession'
import { AppShell } from '../../components/shell/AppShell'

/**
 * Comunidad: por ahora, tus amigos (27-09, Gabino: "le das su propio
 * lugar"; antes vivian al pie de Mesas). Lo demas del tablero sigue
 * anunciado sin fecha. La misma pantalla que la pestaña de la app.
 */
export default function CommunityPage() {
  return (
    <RequireSession>
      {({ client, user, unauthorized, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <div className="page en-shell">
            <h1 className="pagina-titulo">{t('communityPage.comunidad')}</h1>
            <p className="pagina-sub">{t('communityPage.laGenteConLa')}</p>
            <div className="hojas">
              <Panel title={t('communityPage.amigos')}>
                <FriendsPanel client={client} meId={user.id} onUnauthorized={unauthorized} />
              </Panel>
              <Panel title={t('communityPage.pronto')}>
                <p className="premise">{t('communityPage.historiasCompartidasCreadoresDe')}</p>
              </Panel>
            </div>
          </div>
        </AppShell>
      )}
    </RequireSession>
  )
}
