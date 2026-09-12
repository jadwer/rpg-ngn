import { NARRATOR_IDLE, narratorReducer, type NarratorFlag } from '@rpg-ngn/ui-logic'
import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'

/**
 * Bandera de narrador (docs/09, "Voz"). Local en V1: la mesa esta en el
 * mismo cuarto y se avisa de viva voz; el estado compartido llega con la
 * plataforma. La maquina de estado vive en ui-logic (la comparte con la
 * web); aqui solo se cuelga del arbol para que sobreviva al cambio de
 * pantalla.
 */
export interface NarratorState {
  flag: NarratorFlag
  setSomeoneNarrating: (value: boolean) => void
  dismiss: () => void
  restore: () => void
}

const NarratorContext = createContext<NarratorState | null>(null)

export function NarratorProvider({ children }: { children: ReactNode }) {
  const [flag, dispatch] = useReducer(narratorReducer, NARRATOR_IDLE)
  const value = useMemo<NarratorState>(
    () => ({
      flag,
      setSomeoneNarrating: (v) => dispatch({ type: 'set', value: v }),
      dismiss: () => dispatch({ type: 'dismiss' }),
      restore: () => dispatch({ type: 'restore' }),
    }),
    [flag],
  )
  return <NarratorContext.Provider value={value}>{children}</NarratorContext.Provider>
}

export function useNarrator(): NarratorState {
  const value = useContext(NarratorContext)
  if (!value) throw new Error('useNarrator fuera de NarratorProvider')
  return value
}
