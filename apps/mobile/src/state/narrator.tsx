import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * Bandera de narrador (docs/09, "Voz"). Local en V1: la mesa esta en el
 * mismo cuarto y se avisa de viva voz; el estado compartido llega con la
 * plataforma. Nadie narrando: aviso visible. Alguien activa la bandera: el
 * aviso desaparece. Cualquiera puede descartarlo y no vuelve hasta que se
 * restaure.
 */
export interface NarratorState {
  someoneNarrating: boolean
  dismissed: boolean
  setSomeoneNarrating: (value: boolean) => void
  dismiss: () => void
  restore: () => void
}

const NarratorContext = createContext<NarratorState | null>(null)

export function NarratorProvider({ children }: { children: ReactNode }) {
  const [someoneNarrating, setSomeoneNarrating] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const value = useMemo<NarratorState>(
    () => ({
      someoneNarrating,
      dismissed,
      setSomeoneNarrating,
      dismiss: () => setDismissed(true),
      restore: () => setDismissed(false),
    }),
    [someoneNarrating, dismissed],
  )
  return <NarratorContext.Provider value={value}>{children}</NarratorContext.Provider>
}

export function useNarrator(): NarratorState {
  const value = useContext(NarratorContext)
  if (!value) throw new Error('useNarrator fuera de NarratorProvider')
  return value
}
