import { t } from '@rpg-ngn/i18n'
import type { ChronicleShare } from '@rpg-ngn/api-client'

/** Que decirle a la mesa del enlace de su cronica (docs/24, seccion 4). */
export interface ChronicleStatus {
  /** none: nadie lo pidio; pending: faltan aceptaciones; public: se ve. */
  state: 'none' | 'pending' | 'public'
  text: string
  /** Quien mira todavia no acepto y puede hacerlo. */
  canConsent: boolean
}

export function chronicleStatus(share: ChronicleShare | null): ChronicleStatus {
  if (!share) {
    return { state: 'none', text: t('table.chronicle.none'), canConsent: false }
  }
  if (share.public) {
    return { state: 'public', text: t('table.chronicle.public'), canConsent: false }
  }
  const missing = share.members.filter((m) => !m.consented).map((m) => m.name ?? t('table.chronicle.someone'))
  return {
    state: 'pending',
    text: t('table.chronicle.pending', { names: missing.join(', ') }),
    canConsent: !share.mine,
  }
}

/** La URL publica de la cronica, sobre el origen de la web. */
export function chronicleUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/cronica/${token}`
}
