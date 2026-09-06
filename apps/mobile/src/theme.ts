import { Platform } from 'react-native'

/**
 * Tema pergamino por defecto (docs/09: el pack declara su tema; mientras no
 * lo haga, este). Fondo claro calido y serif del sistema: Georgia en iOS,
 * la serif por defecto en Android.
 */
export const theme = {
  colors: {
    bg: '#efe3c9',
    panel: '#f8f0dd',
    panel2: '#e8dabb',
    border: '#c9b48a',
    ink: '#2a2118',
    inkDim: '#6d5b43',
    accent: '#7d2f28',
    gold: '#8a6a2b',
    highlight: '#fff1c2',
    warning: '#f5d9a8',
  },
  fonts: {
    serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }) as string,
    display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }) as string,
  },
  radius: 10,
  space: 12,
} as const

/** Aviso que sustituye a la cita cuando la ficha esta velada (misma frase que apps/sheets en legacy). */
export const VEIL_NOTE = 'Tu personaje no recuerda quién es. Elige por lo que ves: raza, clase y de qué es capaz. Lo demás lo descubres jugando.'
