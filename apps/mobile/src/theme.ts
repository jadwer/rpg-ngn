import { Cinzel_400Regular } from '@expo-google-fonts/cinzel/400Regular'
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel/700Bold'
import { CrimsonPro_400Regular } from '@expo-google-fonts/crimson-pro/400Regular'
import { CrimsonPro_400Regular_Italic } from '@expo-google-fonts/crimson-pro/400Regular_Italic'
import { CrimsonPro_600SemiBold } from '@expo-google-fonts/crimson-pro/600SemiBold'
import { CrimsonPro_700Bold } from '@expo-google-fonts/crimson-pro/700Bold'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { Platform } from 'react-native'

/**
 * Tema oscuro de la mesa, el mismo de `apps/sheets` y de la web (docs/09: el
 * pack declara su tema; mientras no lo haga, este). Cinzel para titulos y
 * Crimson Pro para texto; los archivos viajan dentro del bundle y `Root`
 * espera a que carguen. Se importa cada peso por su subruta: el indice del
 * paquete arrastra las 22 variantes al bundle. Con fuentes propias React
 * Native no sintetiza cursiva ni negrita, asi que cada variante tiene su
 * familia.
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
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} as const

export const theme = {
  colors: {
    // Paleta de docs/22 (la misma que la web, apps/web/src/app/globals.css).
    bg: '#0b0f14',
    panel: '#121826',
    panel2: '#161d2e',
    panel3: '#1b2336',
    border: '#252d42',
    borderSoft: '#1b2234',
    ink: '#e5e7eb',
    inkDim: '#9ca3af',
    inkFaint: '#6b7280',
    gold: '#d4af37',
    goldDim: '#8d7628',
    goldBright: '#e9c95a',
    accent: '#7c3aed',
    accentBright: '#8b5cf6',
    cyan: '#06b6d4',
    /** Nebula del brand board: enlaces y acentos suaves ("Ver todo"). */
    nebula: '#a78bfa',
    success: '#22c55e',
    /** Texto sobre el violeta de los botones principales. */
    onAccent: '#ffffff',
    /** Bloque que se esta leyendo en voz alta. */
    highlight: 'rgba(124, 58, 237, 0.12)',
    /** Fondo de avisos (error del engine, sin conexion). */
    warning: '#2a1d0b',
    /** Texto de error sobre fondo oscuro. */
    danger: '#ef4444',
  },
  fonts: {
    display: 'Cinzel_400Regular',
    displayBold: 'Cinzel_700Bold',
    serif: 'CrimsonPro_400Regular',
    serifItalic: 'CrimsonPro_400Regular_Italic',
    serifSemiBold: 'CrimsonPro_600SemiBold',
    serifBold: 'CrimsonPro_700Bold',
    // Texto de interfaz (brand board: Inter para texto y UI). La serif queda
    // para titulos y narracion; Cinzel, solo para la marca.
    ui: 'Inter_400Regular',
    uiMedium: 'Inter_500Medium',
    uiSemiBold: 'Inter_600SemiBold',
    uiBold: 'Inter_700Bold',
  },
  radius: 16,
  space: 12,
} as const

/** Aviso que sustituye a la cita cuando la ficha esta velada (misma frase que apps/sheets en legacy). */
export const VEIL_NOTE = 'Tu personaje no recuerda quién es. Elige por lo que ves: raza, clase y de qué es capaz. Lo demás lo descubres jugando.'
