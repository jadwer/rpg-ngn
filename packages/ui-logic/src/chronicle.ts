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
    return { state: 'none', text: 'La historia de esta mesa no se comparte. Si alguien lo pide, cada quien tiene que aceptar antes de que el enlace funcione.', canConsent: false }
  }
  if (share.public) {
    return { state: 'public', text: 'Todos aceptaron: cualquiera con el enlace puede leer la historia. Cualquiera de la mesa puede retirarlo.', canConsent: false }
  }
  const missing = share.members.filter((m) => !m.consented).map((m) => m.name ?? 'alguien')
  return {
    state: 'pending',
    text: `El enlace no funciona hasta que acepten todos. Falta: ${missing.join(', ')}.`,
    canConsent: !share.mine,
  }
}

/** La URL publica de la cronica, sobre el origen de la web. */
export function chronicleUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/cronica/${token}`
}
