'use client'

import { t, type MessageKey } from '@rpg-ngn/i18n'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { RequireSession } from '../../../components/RequireSession'
import { AppShell } from '../../../components/shell/AppShell'

/**
 * Lo que el tablero de Gabino ya enseña y todavia no existe (26-09). Dice que
 * sera, sin fecha, y devuelve a lo que si hay.
 */
const SECCIONES: Record<string, { titulo: MessageKey; texto: MessageKey }> = {
  comunidad: { titulo: 'play.soonCommunityTitle', texto: 'play.soonCommunity' },
  campanas: { titulo: 'play.soonCampaignsTitle', texto: 'play.soonCampaigns' },
  personajes: { titulo: 'play.soonCharactersTitle', texto: 'play.soonCharacters' },
  avisos: { titulo: 'play.soonNoticesTitle', texto: 'play.soonNotices' },
}

export default function ProntoPage() {
  const { seccion } = useParams<{ seccion: string }>()
  const s = SECCIONES[seccion] ?? { titulo: 'play.soonTitle', texto: 'play.soonDefault' }
  return (
    <RequireSession>
      {({ user, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <section className="pagina-pronto">
            <p className="sello">{t('soonPage.pronto')}</p>
            <h1>{t(s.titulo)}</h1>
            <p>{t(s.texto)}</p>
            <div className="row">
              <Link href="/mesas" className="btn primary">
                {t('soonPage.irATusMesas')}
              </Link>
              <Link href="/mundos/explorar" className="btn">
                {t('soonPage.explorarMundos')}
              </Link>
            </div>
          </section>
        </AppShell>
      )}
    </RequireSession>
  )
}
