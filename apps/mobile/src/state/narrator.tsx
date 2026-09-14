import { NARRATOR_IDLE, narratorReducer, type NarratorFlag } from '@rpg-ngn/ui-logic'
import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react'

/**
 * Bandera de narrador (docs/09, "Voz"). La mesa la comparte: el telefono que
 * lee lo anuncia a la API y los demas lo ven en su siguiente sondeo, sin que
 * nadie marque nada a mano. La maquina de estado vive en ui-logic (la
 * comparte con la web); aqui solo se cuelga del arbol para que sobreviva al
 * cambio de pantalla. En modo sin conexion se queda quieta.
 */
export interface NarratorState {
  flag: NarratorFlag
  /** Quien narra, ya con nombre ("Zahira narra"); null si nadie mas. */
  label: string | null
  setSomeoneNarrating: (value: boolean) => void
  setLabel: (value: string | null) => void
  dismiss: () => void
  restore: () => void
}

const NarratorContext = createContext<NarratorState | null>(null)

export function NarratorProvider({ children }: { children: ReactNode }) {
  const [flag, dispatch] = useReducer(narratorReducer, NARRATOR_IDLE)
  const [label, setLabel] = useState<string | null>(null)
  const value = useMemo<NarratorState>(
    () => ({
      flag,
      label,
      setSomeoneNarrating: (v) => dispatch({ type: 'set', value: v }),
      setLabel,
      dismiss: () => dispatch({ type: 'dismiss' }),
      restore: () => dispatch({ type: 'restore' }),
    }),
    [flag, label],
  )
  return <NarratorContext.Provider value={value}>{children}</NarratorContext.Provider>
}

export function useNarrator(): NarratorState {
  const value = useContext(NarratorContext)
  if (!value) throw new Error('useNarrator fuera de NarratorProvider')
  return value
}
