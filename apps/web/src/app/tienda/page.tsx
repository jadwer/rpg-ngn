'use client'

import { t } from '@rpg-ngn/i18n'
import type { ApiClient } from '@rpg-ngn/api-client'
import Link from 'next/link'
import { CreditsPanel } from '../../components/CreditsPanel'
import { Panel } from '../../components/Panel'
import { RequireSession } from '../../components/RequireSession'
import { AppShell } from '../../components/shell/AppShell'
import { BlessingOffer } from '../../components/shop/BlessingOffer'
import { SeasonPassOffer } from '../../components/shop/SeasonPassOffer'

/**
 * La tienda (Gabino, 30-09): todo lo que se compra en un solo lugar. La
 * Bendicion del bardo, el pase de temporada, los paquetes de turnos y los
 * mundos en venta. Cada pieza es la misma que usan Temporada, Explorar
 * mundos y Mi cuenta, asi que el precio y el cobro son los mismos.
 */
export default function ShopPage() {
  return (
    <RequireSession>
      {({ client, user, unauthorized, logout }) => (
        <AppShell user={user} onLogout={logout}>
          <Shop client={client} unauthorized={unauthorized} />
        </AppShell>
      )}
    </RequireSession>
  )
}

function Shop({ client, unauthorized }: { client: ApiClient; unauthorized: (notice?: string) => void }) {
  return (
    <div className="page en-shell">
      <h1 className="pagina-titulo">{t('shop.title')}</h1>
      <p className="pagina-sub">{t('shop.sub')}</p>
      <div className="hojas shop">
        <BlessingOffer client={client} />
        <SeasonPassOffer client={client} />
        <CreditsPanel client={client} unauthorized={unauthorized} />
        <Panel title={t('shop.worldsTitle')}>
          <p className="premise">{t('shop.worldsText')}</p>
          <Link href="/mundos/explorar" className="btn">
            {t('shop.worldsLink')}
          </Link>
        </Panel>
      </div>
    </div>
  )
}
