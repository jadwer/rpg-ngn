import { Cinzel_400Regular, Cinzel_700Bold } from '@expo-google-fonts/cinzel'
import { CrimsonPro_400Regular, CrimsonPro_400Regular_Italic, CrimsonPro_600SemiBold, CrimsonPro_700Bold } from '@expo-google-fonts/crimson-pro'
import { Platform } from 'react-native'

/**
 * Tema oscuro de la mesa, el mismo de `apps/sheets` y de la web (docs/09: el
 * pack declara su tema; mientras no lo haga, este). Cinzel para titulos y
 * Crimson Pro para texto; los archivos viajan dentro del bundle y `Root`
 * espera a que carguen. Con fuentes propias React Native no sintetiza
 * cursiva ni negrita, asi que cada variante tiene su familia.
 */

/** Serif del sistema, para lo que se pinta antes de que carguen las fuentes. */
export const SYSTEM_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }) as string

/** Lo que `useFonts` carga al arrancar; las claves son los `fontFamily` del tema. */
export const FONT_ASSETS = {
  Cinzel_400Regular,
  Cinzel_700Bold,
  CrimsonPro_400Regular,
  CrimsonPro_400Regular_Italic,
  CrimsonPro_600SemiBold,
  CrimsonPro_700Bold,
} as const

export const theme = {
  colors: {
    bg: '#17120e',
    panel: '#221a13',
    panel2: '#2b2118',
    panel3: '#352a1f',
    border: '#4a392a',
    borderSoft: '#3a2c20',
    ink: '#e8dcc8',
    inkDim: '#a89778',
    inkFaint: '#7c6d55',
    gold: '#c9a35c',
    goldDim: '#8a713f',
    goldBright: '#e6c67d',
    accent: '#7d2f28',
    accentBright: '#b5473d',
    /** Texto sobre el granate de los botones principales. */
    onAccent: '#fff5e1',
    /** Bloque que se esta leyendo en voz alta. */
    highlight: 'rgba(201, 163, 92, 0.12)',
    /** Fondo de avisos (error del engine, sin conexion). */
    warning: '#3a2419',
    /** Texto de error sobre fondo oscuro. */
    danger: '#e08a80',
  },
  fonts: {
    display: 'Cinzel_400Regular',
    displayBold: 'Cinzel_700Bold',
    serif: 'CrimsonPro_400Regular',
    serifItalic: 'CrimsonPro_400Regular_Italic',
    serifSemiBold: 'CrimsonPro_600SemiBold',
    serifBold: 'CrimsonPro_700Bold',
  },
  radius: 10,
  space: 12,
} as const

/** Aviso que sustituye a la cita cuando la ficha esta velada (misma frase que apps/sheets en legacy). */
export const VEIL_NOTE = 'Tu personaje no recuerda quién es. Elige por lo que ves: raza, clase y de qué es capaz. Lo demás lo descubres jugando.'
