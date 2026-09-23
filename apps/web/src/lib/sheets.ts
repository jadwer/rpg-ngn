import { onlineSheetEntries, type OnlineSheetEntry, type OnlineSheetsInput } from '@rpg-ngn/ui-logic'

/**
 * Lo que el panel de fichas necesita de cada personaje, ya decidido. La
 * logica vive en ui-logic (`sheet-source.ts`) y es la misma para el pack
 * empaquetado y para uno que llega por la API (E3); aqui queda el nombre
 * que la web ya usaba y el aviso del velo.
 */
export type SheetEntry = OnlineSheetEntry
export type SheetsInput = OnlineSheetsInput

export function sheetEntries(input: SheetsInput): SheetEntry[] {
  return onlineSheetEntries(input)
}

/** Aviso que sustituye a la cita cuando la ficha esta velada (misma frase que apps/sheets). */
export const VEIL_NOTE = 'Tu personaje no recuerda quién es. Elige por lo que ves: raza, clase y de qué es capaz. Lo demás lo descubres jugando.'
