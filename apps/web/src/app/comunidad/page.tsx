'use client'

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
            <h1 className="pagina-titulo">Comunidad</h1>
            <p className="pagina-sub">La gente con la que juegas</p>
            <div className="hojas">
              <Panel title="Amigos">
                <FriendsPanel client={client} meId={user.id} onUnauthorized={unauthorized} />
              </Panel>
              <Panel title="Pronto">
                <p className="premise">Historias compartidas, creadores de mundos y mesas abiertas para unirse.</p>
              </Panel>
            </div>
          </div>
        </AppShell>
      )}
    </RequireSession>
  )
}
